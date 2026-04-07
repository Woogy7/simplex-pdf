//! Form commands: field detection, filling, and field library management.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::forms::{self, FlatTextField, FormFieldInfo, FormFieldUpdate};
use crate::storage::field_library;
use crate::utils::error::AppError;
use crate::FieldLibraryState;

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

/// Saves flat text fields as `FreeText` annotations on non-interactive PDFs.
///
/// Each field is placed at the specified page position as a `FreeText` annotation.
#[tauri::command]
pub fn save_flat_text_fields(
    fields: Vec<FlatTextField>,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    forms::save_flat_text_fields(doc, &fields)
}

// ---------------------------------------------------------------------------
// Field library commands
// ---------------------------------------------------------------------------

/// Returns the entire field library.
#[tauri::command]
pub fn get_field_library(
    state: State<'_, FieldLibraryState>,
) -> Result<field_library::FieldLibrary, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    Ok(guard.clone())
}

/// Adds a new entry to a category and persists to disk.
#[tauri::command]
pub fn add_library_entry(
    category_id: String,
    label: String,
    value: String,
    tags: Vec<String>,
    state: State<'_, FieldLibraryState>,
) -> Result<field_library::FieldEntry, AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let entry = field_library::add_entry(&mut guard, &category_id, label, value, tags)?;
    field_library::save_library(&guard)?;
    Ok(entry)
}

/// Updates an existing entry and persists to disk.
#[tauri::command]
pub fn update_library_entry(
    entry_id: String,
    label: String,
    value: String,
    tags: Vec<String>,
    state: State<'_, FieldLibraryState>,
) -> Result<(), AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    field_library::update_entry(&mut guard, &entry_id, label, value, tags)?;
    field_library::save_library(&guard)?;
    Ok(())
}

/// Deletes an entry by ID and persists to disk.
#[tauri::command]
pub fn delete_library_entry(
    entry_id: String,
    state: State<'_, FieldLibraryState>,
) -> Result<(), AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    field_library::delete_entry(&mut guard, &entry_id)?;
    field_library::save_library(&guard)?;
    Ok(())
}

/// Adds a new category and persists to disk.
#[tauri::command]
pub fn add_library_category(
    name: String,
    state: State<'_, FieldLibraryState>,
) -> Result<field_library::Category, AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let category = field_library::add_category(&mut guard, name);
    field_library::save_library(&guard)?;
    Ok(category)
}

/// Deletes a category by ID and persists to disk.
#[tauri::command]
pub fn delete_library_category(
    category_id: String,
    state: State<'_, FieldLibraryState>,
) -> Result<(), AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    field_library::delete_category(&mut guard, &category_id)?;
    field_library::save_library(&guard)?;
    Ok(())
}

/// Replaces the entire field library with imported JSON and persists to disk.
#[tauri::command]
pub fn import_library(json: String, state: State<'_, FieldLibraryState>) -> Result<(), AppError> {
    let imported: field_library::FieldLibrary = serde_json::from_str(&json)?;
    let mut guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    *guard = imported;
    field_library::save_library(&guard)?;
    Ok(())
}

/// Exports the entire field library as a pretty-printed JSON string.
#[tauri::command]
pub fn export_library(state: State<'_, FieldLibraryState>) -> Result<String, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let json = serde_json::to_string_pretty(&*guard)?;
    Ok(json)
}
