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

    let original_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    eprintln!("[save] Original file size: {original_size} bytes");
    eprintln!("[save] Annotations to write: {}", annotations.len());

    for (page_index, page_anns) in &by_page {
        let mut page = pdf.pages().get(*page_index)?;

        let before_count = page.annotations().iter().count();
        eprintln!("[save] Page {page_index}: {before_count} existing annotations");

        let ann_collection = page.annotations_mut();

        for ann in page_anns {
            let pdf_color = to_pdf_color(&ann.color);
            let pdf_rect = to_pdf_rect(&ann.rect);

            eprintln!(
                "[save]   Creating {} at ({},{},{},{})",
                ann.annotation_type, ann.rect.left, ann.rect.bottom, ann.rect.right, ann.rect.top
            );

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
                    eprintln!("[save]   -> Highlight created OK");
                }
                "underline" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let mut a = ann_collection.create_underline_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp);
                    eprintln!("[save]   -> Underline created OK");
                }
                "strikeout" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let mut a = ann_collection.create_strikeout_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp);
                    eprintln!("[save]   -> Strikeout created OK");
                }
                "note" => {
                    let content = ann.content.as_deref().unwrap_or("");
                    eprintln!("[save]   Note content: {content:?}");
                    let mut created = ann_collection.create_text_annotation(content)?;
                    created.set_bounds(pdf_rect)?;
                    created.set_fill_color(to_pdf_color(&ann.color))?;
                    eprintln!("[save]   -> Text note created OK");
                }
                other => {
                    eprintln!("[save]   -> Unknown type: {other}");
                }
            }
        }

        // Verify annotations were added
        let after_count = page.annotations().iter().count();
        eprintln!("[save] Page {page_index}: {after_count} annotations after adding");

        open_pages.push(page);
    }

    eprintln!("[save] Saving to bytes...");
    let bytes = pdf.save_to_bytes()?;
    eprintln!("[save] Saved {} bytes", bytes.len());

    drop(open_pages);

    std::fs::write(path, &bytes)?;
    eprintln!(
        "[save] Written to {path} ({} bytes, was {original_size})",
        bytes.len()
    );

    Ok(())
}

/// An existing annotation read from the PDF.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExistingAnnotation {
    /// Zero-based page index.
    pub page_index: i32,
    /// Annotation type name.
    pub annotation_type: String,
    /// Bounding rectangle in PDF points.
    pub rect: AnnotationRect,
    /// Hex color string (e.g. "#FF0000").
    pub color: String,
    /// Text content (for text/note annotations).
    pub content: Option<String>,
}

/// Reads all supported annotations from the document.
///
/// Returns highlight, underline, strikeout, and text annotations
/// so the frontend can render them as overlays.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if reading annotations fails.
pub fn read_all_annotations(document: &Document) -> Result<Vec<ExistingAnnotation>, AppError> {
    let pdf = document.inner();
    let pages = pdf.pages();
    let page_count = pages.len();
    let mut result = Vec::new();

    eprintln!("[read_ann] Starting. Document has {page_count} pages.");

    for page_index in 0..page_count {
        eprintln!("[read_ann] Opening page {page_index}...");
        let Ok(page) = pages.get(page_index) else {
            eprintln!("[read_ann]   Failed to open page {page_index}, skipping.");
            continue;
        };

        let annotations = page.annotations();
        let ann_count = annotations.len();
        eprintln!("[read_ann]   Page {page_index} has {ann_count} annotations.");

        for ann_index in 0..ann_count {
            eprintln!("[read_ann]   Reading annotation {ann_index}...");

            let Ok(annotation) = annotations.get(ann_index) else {
                eprintln!("[read_ann]     Failed to get annotation {ann_index}, skipping.");
                continue;
            };

            eprintln!("[read_ann]     Getting type...");
            let ann_type = annotation.annotation_type();
            let type_name = match ann_type {
                PdfPageAnnotationType::Highlight => "highlight",
                PdfPageAnnotationType::Underline => "underline",
                PdfPageAnnotationType::Strikeout => "strikeout",
                PdfPageAnnotationType::Text => "note",
                other => {
                    eprintln!("[read_ann]     Skipping unsupported type: {other:?}");
                    continue;
                }
            };
            eprintln!("[read_ann]     Type: {type_name}");

            eprintln!("[read_ann]     Getting bounds...");
            let Ok(bounds) = annotation.bounds() else {
                eprintln!("[read_ann]     Failed to get bounds, skipping.");
                continue;
            };
            eprintln!(
                "[read_ann]     Bounds: ({},{},{},{})",
                bounds.left().value,
                bounds.bottom().value,
                bounds.right().value,
                bounds.top().value
            );

            // NOTE: Reading annotation colors via FPDFAnnot_GetColor segfaults
            // on some annotations (confirmed crash on highlight annotations from
            // PDFs saved by this app). Use default colors per type instead.
            let color = match type_name {
                "underline" => "#000000",
                "strikeout" => "#FF0000",
                _ => "#FFD500",
            }
            .to_string();
            eprintln!("[read_ann]     Color: {color} (default)");

            eprintln!("[read_ann]     Getting contents...");
            let content = annotation.contents();
            eprintln!("[read_ann]     Contents: {content:?}");

            result.push(ExistingAnnotation {
                page_index,
                annotation_type: type_name.to_string(),
                rect: AnnotationRect {
                    left: bounds.left().value,
                    top: bounds.top().value,
                    right: bounds.right().value,
                    bottom: bounds.bottom().value,
                },
                color,
                content,
            });
            eprintln!("[read_ann]     OK.");
        }
    }

    eprintln!("[read_ann] Done. Read {} annotations total.", result.len());
    Ok(result)
}
