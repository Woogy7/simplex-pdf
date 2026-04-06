//! File-related commands: open, save, and document info.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use std::path::PathBuf;
use std::sync::Mutex;

use tauri::State;

use crate::pdf::parser::{Document, DocumentInfo};
use crate::pdf::renderer;
use crate::utils::error::AppError;

/// Holds the currently open document. Shared across all commands via Tauri state.
pub struct OpenDocument(pub Mutex<Option<Document>>);

/// Opens a PDF file and stores it in the application state.
///
/// Returns document metadata on success.
#[tauri::command]
pub fn open_file(path: String, state: State<'_, OpenDocument>) -> Result<DocumentInfo, AppError> {
    let document = Document::open(&PathBuf::from(&path))?;
    let info = document.info().clone();

    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    *guard = Some(document);

    Ok(info)
}

/// Returns the page count of the currently open document.
#[tauri::command]
pub fn get_page_count(state: State<'_, OpenDocument>) -> Result<i32, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    Ok(doc.page_count())
}

/// Returns metadata for the currently open document.
#[tauri::command]
pub fn get_document_info(state: State<'_, OpenDocument>) -> Result<DocumentInfo, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    Ok(doc.info().clone())
}

/// Renders a single page and returns it as a base64-encoded PNG data URI.
///
/// `page_index` is zero-based. `scale` multiplies the default 150 DPI
/// (e.g. 1.0 = 150 DPI, 2.0 = 300 DPI).
#[tauri::command]
pub fn render_page(
    page_index: i32,
    scale: f32,
    state: State<'_, OpenDocument>,
) -> Result<String, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;

    let png_bytes = renderer::render_page(doc, page_index, scale)?;
    Ok(renderer::to_base64_data_uri(&png_bytes))
}

/// Returns the dimensions (in PDF points) of all pages in the current document.
#[tauri::command]
pub fn get_page_dimensions(
    state: State<'_, OpenDocument>,
) -> Result<Vec<renderer::PageDimensions>, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    renderer::get_all_page_dimensions(doc)
}
