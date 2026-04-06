//! Annotation creation and management.
//!
//! Uses `PDFium` to add, read, and modify annotations on PDF pages.
//! Supports highlight, underline, strikeout, text (sticky note), and ink
//! annotation types.

use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};

use super::parser::{Document, PageIndex};
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

/// A single point in an ink (freehand drawing) stroke.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InkPoint {
    /// Horizontal position in PDF points.
    pub x: f32,
    /// Vertical position in PDF points.
    pub y: f32,
}

/// Validates the page index and returns a descriptive error when out of bounds.
fn validated_page_index(document: &Document, page_index: PageIndex) -> Result<(), AppError> {
    let count = document.page_count();
    if page_index < 0 || page_index >= count {
        return Err(AppError::PageOutOfBounds {
            index: page_index,
            count,
        });
    }
    Ok(())
}

/// Converts an [`AnnotationRect`] to a [`PdfRect`].
fn to_pdf_rect(rect: &AnnotationRect) -> PdfRect {
    PdfRect::new_from_values(rect.bottom, rect.left, rect.top, rect.right)
}

/// Converts an [`AnnotationColor`] to a [`PdfColor`].
fn to_pdf_color(color: &AnnotationColor) -> PdfColor {
    PdfColor::new(color.r, color.g, color.b, color.a)
}

/// Adds a text-markup annotation (highlight, underline, or strikeout) to a page.
///
/// The annotation is positioned using both `set_position` / `set_bounds` and
/// attachment points so that conforming viewers render it correctly.
///
/// # Errors
///
/// Returns [`AppError::PageOutOfBounds`] if `page_index` is invalid,
/// [`AppError::Pdfium`] if `PDFium` fails to create the annotation, or
/// [`AppError::Other`] if `annotation_type` is unrecognised.
pub fn add_markup_annotation(
    document: &Document,
    page_index: PageIndex,
    annotation_type: &str,
    rect: &AnnotationRect,
    color: &AnnotationColor,
) -> Result<(), AppError> {
    validated_page_index(document, page_index)?;

    let pdf = document.inner();
    let mut page = pdf.pages().get(page_index)?;
    let annotations = page.annotations_mut();

    let pdf_color = to_pdf_color(color);
    let pdf_rect = to_pdf_rect(rect);
    let quad_points = PdfQuadPoints::from_rect(&pdf_rect);

    match annotation_type {
        "highlight" => {
            let mut ann = annotations.create_highlight_annotation()?;
            ann.set_position(pdf_rect.left(), pdf_rect.bottom())?;
            ann.set_stroke_color(pdf_color)?;
            ann.attachment_points_mut()
                .create_attachment_point_at_end(quad_points)?;
        }
        "underline" => {
            let mut ann = annotations.create_underline_annotation()?;
            ann.set_position(pdf_rect.left(), pdf_rect.bottom())?;
            ann.set_stroke_color(pdf_color)?;
            ann.attachment_points_mut()
                .create_attachment_point_at_end(quad_points)?;
        }
        "strikeout" => {
            let mut ann = annotations.create_strikeout_annotation()?;
            ann.set_position(pdf_rect.left(), pdf_rect.bottom())?;
            ann.set_stroke_color(pdf_color)?;
            ann.attachment_points_mut()
                .create_attachment_point_at_end(quad_points)?;
        }
        other => {
            return Err(AppError::Other(format!("Unknown annotation type: {other}")));
        }
    }

    Ok(())
}

/// Adds a text note (sticky note) annotation to a page.
///
/// The annotation is rendered as a small icon at the specified position.
/// Clicking it in a conforming viewer opens a popup displaying `content`.
///
/// # Errors
///
/// Returns [`AppError::PageOutOfBounds`] if `page_index` is invalid, or
/// [`AppError::Pdfium`] if `PDFium` fails to create the annotation.
pub fn add_text_note(
    document: &Document,
    page_index: PageIndex,
    rect: &AnnotationRect,
    content: &str,
    color: &AnnotationColor,
) -> Result<(), AppError> {
    validated_page_index(document, page_index)?;

    let pdf = document.inner();
    let mut page = pdf.pages().get(page_index)?;
    let annotations = page.annotations_mut();

    let pdf_rect = to_pdf_rect(rect);
    let mut ann = annotations.create_text_annotation(content)?;
    ann.set_bounds(pdf_rect)?;
    ann.set_fill_color(to_pdf_color(color))?;

    Ok(())
}

/// Adds an ink (freehand drawing) annotation to a page.
///
/// The annotation is created and positioned, but individual ink strokes
/// cannot currently be added through the safe `pdfium-render` API.
/// A future update will wire up `FPDFAnnot_AddInkStroke` once a safe
/// wrapper is available.
///
/// # Errors
///
/// Returns [`AppError::PageOutOfBounds`] if `page_index` is invalid, or
/// [`AppError::Pdfium`] if `PDFium` fails to create the annotation.
pub fn add_ink_annotation(
    document: &Document,
    page_index: PageIndex,
    points: &[InkPoint],
    color: &AnnotationColor,
    _width: f32,
) -> Result<(), AppError> {
    validated_page_index(document, page_index)?;

    let pdf = document.inner();
    let mut page = pdf.pages().get(page_index)?;
    let annotations = page.annotations_mut();

    let mut ann = annotations.create_ink_annotation()?;
    ann.set_stroke_color(to_pdf_color(color))?;

    // Compute a bounding rect from the stroke points so the annotation
    // is at least positioned correctly within the page.
    if let Some(bounds) = bounding_rect_from_points(points) {
        ann.set_bounds(bounds)?;
    }

    // TODO: Add individual ink strokes via FPDFAnnot_AddInkStroke once
    // pdfium-render exposes a safe wrapper. The raw FFI function exists
    // in the bindings but is not yet surfaced through the safe API.

    Ok(())
}

/// Saves the currently open document to disk, overwriting the original file.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if `PDFium` fails to write the file.
pub fn save_document(document: &Document) -> Result<(), AppError> {
    let pdf = document.inner();
    let path = &document.info().file_path;
    pdf.save_to_file(path)?;
    Ok(())
}

/// Computes the axis-aligned bounding rectangle for a slice of [`InkPoint`]s.
///
/// Returns `None` if the slice is empty.
fn bounding_rect_from_points(points: &[InkPoint]) -> Option<PdfRect> {
    let first = points.first()?;

    let mut min_x = first.x;
    let mut max_x = first.x;
    let mut min_y = first.y;
    let mut max_y = first.y;

    for point in points.iter().skip(1) {
        if point.x < min_x {
            min_x = point.x;
        }
        if point.x > max_x {
            max_x = point.x;
        }
        if point.y < min_y {
            min_y = point.y;
        }
        if point.y > max_y {
            max_y = point.y;
        }
    }

    Some(PdfRect::new_from_values(min_y, min_x, max_y, max_x))
}
