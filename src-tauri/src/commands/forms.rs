//! Form commands: field detection, filling, and field library management.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::forms::{self, FormFieldInfo, FormFieldUpdate};
use crate::utils::error::AppError;

/// Returns all interactive form fields across every page in the open document.
///
/// Each field includes its type, name, current value, checked state, bounds,
/// and selectable options (for combobox/listbox fields).
#[tauri::command]
pub fn get_form_fields(state: State<'_, OpenDocument>) -> Result<Vec<FormFieldInfo>, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    forms::read_form_fields(doc)
}

/// Returns whether the open document contains any interactive form fields.
#[tauri::command]
pub fn has_form(state: State<'_, OpenDocument>) -> Result<bool, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    forms::has_form_fields(doc)
}

/// Applies a batch of form field value updates and saves the document to disk.
///
/// Each update targets a specific field by page index and annotation index,
/// setting either a text value or a checked state depending on the field type.
#[tauri::command]
pub fn set_form_field_values(
    updates: Vec<FormFieldUpdate>,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    forms::set_form_field_values(doc, &updates)
}
