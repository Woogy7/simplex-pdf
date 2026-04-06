//! Page rendering pipeline.
//!
//! Converts PDF pages into rasterized PNG images suitable for display
//! in the frontend viewer component.

use pdfium_render::prelude::*;

use crate::utils::error::AppError;

use super::parser::{Document, PageIndex};

/// Default rendering DPI used when no scale factor is specified.
/// 96 DPI matches standard screen resolution. The frontend scale
/// parameter multiplies this (e.g. 1.5 = 144 DPI for crisp text).
const DEFAULT_DPI: f32 = 96.0;

/// Renders a single page of a document to PNG bytes.
///
/// The `scale` parameter multiplies the default DPI (150). A scale of 1.0
/// renders at 150 DPI, 2.0 at 300 DPI, etc.
///
/// # Errors
///
/// Returns `AppError::PageOutOfBounds` if the page index is invalid, or
/// `AppError::Pdfium` if rendering fails.
pub fn render_page(
    document: &Document,
    page_index: PageIndex,
    scale: f32,
) -> Result<Vec<u8>, AppError> {
    let page_count = document.page_count();
    if page_index < 0 || page_index >= page_count {
        return Err(AppError::PageOutOfBounds {
            index: page_index,
            count: page_count,
        });
    }

    let pdf = document.inner();
    let page = pdf.pages().get(page_index)?;

    let dpi = DEFAULT_DPI * scale;
    let config = PdfRenderConfig::new()
        .set_target_width(pixels_from_points(page.width().value, dpi))
        .set_target_height(pixels_from_points(page.height().value, dpi))
        .render_form_data(true)
        .render_annotations(true);

    let bitmap = page.render_with_config(&config)?;
    let image = bitmap.as_image()?;

    let mut jpeg_bytes = Vec::new();
    image.write_to(
        &mut std::io::Cursor::new(&mut jpeg_bytes),
        image::ImageFormat::Jpeg,
    )?;

    Ok(jpeg_bytes)
}

/// Information about a single page's dimensions.
#[derive(Debug, Clone, serde::Serialize)]
pub struct PageDimensions {
    /// Width in PDF points (1 point = 1/72 inch).
    pub width: f32,
    /// Height in PDF points.
    pub height: f32,
}

/// Returns the dimensions of every page in the document.
///
/// # Errors
///
/// Returns `AppError::Pdfium` if page dimensions cannot be read.
pub fn get_all_page_dimensions(document: &Document) -> Result<Vec<PageDimensions>, AppError> {
    let pdf = document.inner();
    let pages = pdf.pages();
    let len: usize = pages.len().try_into().unwrap_or(0);
    let mut dims = Vec::with_capacity(len);

    for index in 0..pages.len() {
        let page = pages.get(index)?;
        dims.push(PageDimensions {
            width: page.width().value,
            height: page.height().value,
        });
    }

    Ok(dims)
}

/// Converts PDF points to pixels at the given DPI.
#[allow(clippy::cast_possible_truncation)]
fn pixels_from_points(points: f32, dpi: f32) -> Pixels {
    ((points / 72.0) * dpi) as Pixels
}

/// Encodes raw bytes as a base64 data URI for embedding in HTML `<img>` tags.
#[must_use]
pub fn to_base64_data_uri(png_bytes: &[u8]) -> String {
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(png_bytes);
    format!("data:image/jpeg;base64,{encoded}")
}
