//! PDF signature stamping.
//!
//! Places signature images onto PDF pages as embedded image objects.
//! The image becomes a permanent part of the rendered page content.

use pdfium_render::prelude::*;

use super::parser::Document;
use crate::utils::error::AppError;

/// Stamps a signature image onto a PDF page at the specified position.
///
/// The image is added directly to the page's content objects using
/// `create_image_object`, making it a permanent part of the rendered page.
/// Coordinates are in PDF points (origin at bottom-left).
///
/// # Errors
///
/// Returns an error if the page index is invalid, the image cannot be
/// decoded, or the PDF cannot be saved.
pub fn stamp_signature(
    document: &Document,
    page_index: i32,
    image_bytes: &[u8],
    pos_x: f32,
    pos_y: f32,
    width: f32,
    height: f32,
) -> Result<(), AppError> {
    let pdf = document.inner();
    let path = &document.info().file_path;

    let img = image::load_from_memory(image_bytes)
        .map_err(|err| AppError::Pdf(format!("Failed to load signature image: {err}")))?;

    let mut page = pdf.pages().get(page_index)?;

    page.objects_mut().create_image_object(
        PdfPoints::new(pos_x),
        PdfPoints::new(pos_y),
        &img,
        Some(PdfPoints::new(width)),
        Some(PdfPoints::new(height)),
    )?;

    let bytes = pdf.save_to_bytes()?;
    drop(page);
    std::fs::write(path, bytes)?;

    Ok(())
}
