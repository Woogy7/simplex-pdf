//! Annotation creation and management.
//!
//! Uses `PDFium` to add, read, and modify annotations on PDF pages.
//! Supports highlight, underline, strikeout, and text (sticky note) types.

use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};

use super::parser::Document;
use crate::utils::error::AppError;

/// A rectangle in PDF coordinate space (origin at bottom-left of the page).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationRect {
    /// Left edge (x-minimum).
    pub left: f32,
    /// Top edge (y-maximum).
    pub top: f32,
    /// Right edge (x-maximum).
    pub right: f32,
    /// Bottom edge (y-minimum).
    pub bottom: f32,
}

/// An RGBA color for annotation rendering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationColor {
    /// Red component (0--255).
    pub r: u8,
    /// Green component (0--255).
    pub g: u8,
    /// Blue component (0--255).
    pub b: u8,
    /// Alpha component (0 = transparent, 255 = opaque).
    pub a: u8,
}

/// A single annotation to persist to the PDF, received from the frontend.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationData {
    /// Zero-based page index.
    pub page_index: i32,
    /// Annotation type: "highlight", "underline", "strikeout", or "note".
    pub annotation_type: String,
    /// Bounding rectangle in PDF points.
    pub rect: AnnotationRect,
    /// RGBA color.
    pub color: AnnotationColor,
    /// Text content (for notes).
    pub content: Option<String>,
}

/// Converts an [`AnnotationRect`] to a [`PdfRect`].
fn to_pdf_rect(rect: &AnnotationRect) -> PdfRect {
    PdfRect::new_from_values(rect.bottom, rect.left, rect.top, rect.right)
}

/// Converts an [`AnnotationColor`] to a [`PdfColor`].
fn to_pdf_color(color: &AnnotationColor) -> PdfColor {
    PdfColor::new(color.r, color.g, color.b, color.a)
}

/// Writes all annotations to the document and saves to disk in a single operation.
///
/// This function keeps all page handles alive until after `save_to_file` completes.
/// `PDFium` discards annotations when a page handle is closed (`FPDF_ClosePage`),
/// so we must hold every modified page open through the save.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if annotation creation or file save fails.
pub fn save_annotations_and_write(
    document: &Document,
    annotations: &[AnnotationData],
) -> Result<(), AppError> {
    let pdf = document.inner();
    let path = &document.info().file_path;

    // Group annotations by page index.
    let mut by_page: std::collections::BTreeMap<i32, Vec<&AnnotationData>> =
        std::collections::BTreeMap::new();
    for ann in annotations {
        by_page.entry(ann.page_index).or_default().push(ann);
    }

    // Open all pages that need annotations and keep them alive in this vec.
    // We MUST NOT drop these pages until after save_to_file.
    let mut open_pages: Vec<PdfPage<'_>> = Vec::new();

    for (page_index, page_anns) in &by_page {
        let mut page = pdf.pages().get(*page_index)?;
        let ann_collection = page.annotations_mut();

        for ann in page_anns {
            let pdf_color = to_pdf_color(&ann.color);
            let pdf_rect = to_pdf_rect(&ann.rect);

            // Macro to configure a markup annotation (they return different
            // concrete types, so we can't unify them in a match expression).
            macro_rules! configure_markup {
                ($ann:expr, $rect:expr, $color:expr, $qp:expr) => {{
                    $ann.set_bounds($rect)?;
                    $ann.set_stroke_color($color)?;
                    let _ = $ann.set_fill_color($color);
                    $ann.attachment_points_mut()
                        .create_attachment_point_at_end($qp)?;
                }};
            }

            match ann.annotation_type.as_str() {
                "highlight" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let mut a = ann_collection.create_highlight_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp);
                }
                "underline" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let mut a = ann_collection.create_underline_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp);
                }
                "strikeout" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let mut a = ann_collection.create_strikeout_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp);
                }
                "note" => {
                    let content = ann.content.as_deref().unwrap_or("");
                    let mut created = ann_collection.create_text_annotation(content)?;
                    created.set_bounds(pdf_rect)?;
                    created.set_fill_color(to_pdf_color(&ann.color))?;
                }
                _ => {}
            }
        }

        // Keep this page handle alive — do NOT let it drop yet.
        open_pages.push(page);
    }

    // Save to bytes while all modified pages are still open.
    // We cannot use save_to_file because load_pdf_from_file holds the
    // source file open via FPDF_LoadCustomDocument — writing to the same
    // path while it's being read from silently corrupts or no-ops.
    let bytes = pdf.save_to_bytes()?;

    // Pages can be dropped now — bytes are captured.
    drop(open_pages);

    // Write the bytes to the original file path.
    std::fs::write(path, bytes)?;

    Ok(())
}
