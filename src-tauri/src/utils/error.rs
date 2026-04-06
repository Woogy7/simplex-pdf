//! Unified application error type.
//!
//! All fallible operations across the crate return [`AppError`] so that
//! Tauri commands can convert errors into structured JSON responses for
//! the frontend.

use thiserror::Error;

/// The top-level error type for the Simplex PDF application.
///
/// Variants are added as new subsystems are integrated. The `#[from]`
/// attribute on certain variants enables automatic conversion with `?`.
#[derive(Debug, Error)]
pub enum AppError {
    /// An error originating from PDF parsing or manipulation.
    #[error("PDF error: {0}")]
    Pdf(String),

    /// An error from the `PDFium` rendering library.
    #[error("PDFium error: {0}")]
    Pdfium(#[from] pdfium_render::prelude::PdfiumError),

    /// A filesystem or other I/O error.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// A serialization or deserialization error.
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// No document is currently open.
    #[error("No document open")]
    NoDocument,

    /// The requested page index is out of bounds.
    #[error("Page index {index} out of bounds (document has {count} pages)")]
    PageOutOfBounds {
        /// The requested page index.
        index: i32,
        /// The total number of pages.
        count: i32,
    },

    /// An image encoding/decoding error.
    #[error("Image error: {0}")]
    Image(#[from] image::ImageError),

    /// A catch-all for errors that don't fit other variants.
    #[error("{0}")]
    Other(String),
}

/// Allow `AppError` to be returned from Tauri commands.
///
/// Tauri requires command return errors to implement `Into<tauri::ipc::InvokeError>`.
/// We serialize the error's `Display` representation as a plain string.
impl From<AppError> for tauri::ipc::InvokeError {
    fn from(error: AppError) -> Self {
        Self::from(error.to_string())
    }
}
