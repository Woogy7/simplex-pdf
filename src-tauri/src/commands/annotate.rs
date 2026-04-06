//! Annotation commands: write annotations to PDF and save.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::annotations::{self, AnnotationData, ExistingAnnotation};
use crate::utils::error::AppError;

/// Writes all pending annotations to the PDF and saves it to disk.
///
/// All page handles are kept alive until after the save completes,
/// ensuring annotations are not discarded by `PDFium`.
#[tauri::command]
pub fn save_with_annotations(
    annotations: Vec<AnnotationData>,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::save_annotations_and_write(doc, &annotations)
}

/// Reads all existing annotations from the currently open document.
///
/// Returns highlight, underline, strikeout, and text annotations
/// so the frontend can render them as overlays.
#[tauri::command]
pub fn get_annotations(
    state: State<'_, OpenDocument>,
) -> Result<Vec<ExistingAnnotation>, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::read_all_annotations(doc)
}

/// Saves the currently open document to disk without adding new annotations.
#[tauri::command]
pub fn save_pdf(state: State<'_, OpenDocument>) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    let pdf = doc.inner();
    let path = &doc.info().file_path;
    // Save to bytes first, then write — avoids file handle conflict.
    let bytes = pdf.save_to_bytes()?;
    std::fs::write(path, bytes)?;
    Ok(())
}
