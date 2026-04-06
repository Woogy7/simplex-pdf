//! Annotation commands: highlight, underline, strikethrough, text notes, ink, and save.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::annotations::{self, AnnotationColor, AnnotationRect, InkPoint};
use crate::utils::error::AppError;

/// Adds a text-markup annotation (highlight, underline, or strikeout) to the
/// currently open document.
#[tauri::command]
pub fn add_markup(
    page_index: i32,
    annotation_type: String,
    rect: AnnotationRect,
    color: AnnotationColor,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::add_markup_annotation(doc, page_index, &annotation_type, &rect, &color)
}

/// Adds a text note (sticky note) annotation to the currently open document.
#[tauri::command]
pub fn add_note(
    page_index: i32,
    rect: AnnotationRect,
    content: String,
    color: AnnotationColor,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::add_text_note(doc, page_index, &rect, &content, &color)
}

/// Adds an ink (freehand drawing) annotation to the currently open document.
#[tauri::command]
pub fn add_ink(
    page_index: i32,
    points: Vec<InkPoint>,
    color: AnnotationColor,
    width: f32,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::add_ink_annotation(doc, page_index, &points, &color, width)
}

/// Saves the currently open document to disk, overwriting the original file.
#[tauri::command]
pub fn save_pdf(state: State<'_, OpenDocument>) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::save_document(doc)
}
