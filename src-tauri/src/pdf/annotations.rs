//! Annotation creation and management.
//!
//! Uses `PDFium` to add, read, and modify annotations on PDF pages.
//! Supports highlight, underline, strikeout, and text (sticky note) types.
//!
//! Color persistence: `PDFium`'s `FPDFAnnot_GetColor` segfaults on annotations
//! we create, so we store the hex color in the annotation's `/Contents` field
//! with a `simplex:` prefix. On read, we parse our prefix for color and fall
//! back to defaults for annotations from other PDF editors.

use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};

use super::parser::Document;
use crate::utils::error::AppError;

/// Prefix used in the `/Contents` field to store our color metadata.
const COLOR_PREFIX: &str = "simplex:";
/// Separator between color and note text in `/Contents`.
const COLOR_SEP: char = '|';

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

impl AnnotationColor {
    /// Converts to a hex color string like `#FF0000`.
    fn to_hex(&self) -> String {
        format!("#{:02X}{:02X}{:02X}", self.r, self.g, self.b)
    }
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

/// Encodes color (and optionally note text) into a `/Contents` string.
///
/// - Markup: `simplex:#FF0000`
/// - Note:   `simplex:#FF0000|actual note text`
fn encode_contents(color: &AnnotationColor, note_text: Option<&str>) -> String {
    let hex = color.to_hex();
    match note_text {
        Some(text) => format!("{COLOR_PREFIX}{hex}{COLOR_SEP}{text}"),
        None => format!("{COLOR_PREFIX}{hex}"),
    }
}

/// Decodes color and note text from a `/Contents` string.
///
/// Returns `(color_hex, note_text)`. If the string doesn't have our prefix,
/// returns `None` (annotation from another editor).
fn decode_contents(contents: &str) -> Option<(String, Option<String>)> {
    let rest = contents.strip_prefix(COLOR_PREFIX)?;
    if let Some(sep_pos) = rest.find(COLOR_SEP) {
        let color = rest[..sep_pos].to_string();
        let text = rest[sep_pos + 1..].to_string();
        Some((color, Some(text)))
    } else {
        Some((rest.to_string(), None))
    }
}

/// Default color for annotation types from other editors.
fn default_color(type_name: &str) -> String {
    match type_name {
        "underline" => "#000000",
        "strikeout" => "#FF0000",
        _ => "#FFD500",
    }
    .to_string()
}

/// Writes all annotations to the document and saves to disk in a single operation.
///
/// Keeps all page handles alive until after save completes, because `PDFium`
/// discards annotations when a page handle is closed.
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

    let mut by_page: std::collections::BTreeMap<i32, Vec<&AnnotationData>> =
        std::collections::BTreeMap::new();
    for ann in annotations {
        by_page.entry(ann.page_index).or_default().push(ann);
    }

    let mut open_pages: Vec<PdfPage<'_>> = Vec::new();

    for (page_index, page_anns) in &by_page {
        let mut page = pdf.pages().get(*page_index)?;
        let ann_collection = page.annotations_mut();

        for ann in page_anns {
            let pdf_color = to_pdf_color(&ann.color);
            let pdf_rect = to_pdf_rect(&ann.rect);

            macro_rules! configure_markup {
                ($created:expr, $rect:expr, $color:expr, $qp:expr, $contents:expr) => {{
                    $created.set_bounds($rect)?;
                    $created.set_stroke_color($color)?;
                    let _ = $created.set_fill_color($color);
                    $created.attachment_points_mut()
                        .create_attachment_point_at_end($qp)?;
                    // Store color in /Contents so we can read it back
                    let _ = $created.set_contents($contents);
                }};
            }

            match ann.annotation_type.as_str() {
                "highlight" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let contents = encode_contents(&ann.color, None);
                    let mut a = ann_collection.create_highlight_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp, &contents);
                }
                "underline" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let contents = encode_contents(&ann.color, None);
                    let mut a = ann_collection.create_underline_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp, &contents);
                }
                "strikeout" => {
                    let qp = PdfQuadPoints::from_rect(&pdf_rect);
                    let contents = encode_contents(&ann.color, None);
                    let mut a = ann_collection.create_strikeout_annotation()?;
                    configure_markup!(a, pdf_rect, pdf_color, qp, &contents);
                }
                "note" => {
                    let note_text = ann.content.as_deref().unwrap_or("");
                    let contents = encode_contents(&ann.color, Some(note_text));
                    let mut created = ann_collection.create_text_annotation(&contents)?;
                    created.set_bounds(pdf_rect)?;
                    created.set_fill_color(to_pdf_color(&ann.color))?;
                }
                _ => {}
            }
        }

        open_pages.push(page);
    }

    let bytes = pdf.save_to_bytes()?;
    drop(open_pages);
    std::fs::write(path, bytes)?;

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
/// Parses our `simplex:` color prefix from `/Contents` for annotations we
/// created. Annotations from other editors get default colors.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if reading annotations fails.
pub fn read_all_annotations(document: &Document) -> Result<Vec<ExistingAnnotation>, AppError> {
    let pdf = document.inner();
    let pages = pdf.pages();
    let page_count = pages.len();
    let mut result = Vec::new();

    for page_index in 0..page_count {
        let Ok(page) = pages.get(page_index) else {
            continue;
        };

        let annotations = page.annotations();
        let ann_count = annotations.len();

        for ann_index in 0..ann_count {
            let Ok(annotation) = annotations.get(ann_index) else {
                continue;
            };

            let ann_type = annotation.annotation_type();
            let type_name = match ann_type {
                PdfPageAnnotationType::Highlight => "highlight",
                PdfPageAnnotationType::Underline => "underline",
                PdfPageAnnotationType::Strikeout => "strikeout",
                PdfPageAnnotationType::Text => "note",
                _ => continue,
            };

            let Ok(bounds) = annotation.bounds() else {
                continue;
            };

            // Read /Contents and try to extract our color prefix.
            let raw_contents = annotation.contents();
            let (color, content) = if let Some(ref raw) = raw_contents {
                if let Some((hex, text)) = decode_contents(raw) {
                    (hex, text)
                } else {
                    // Annotation from another editor — use raw contents as text,
                    // default color.
                    (default_color(type_name), raw_contents)
                }
            } else {
                (default_color(type_name), None)
            };

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
        }
    }
    Ok(result)
}
