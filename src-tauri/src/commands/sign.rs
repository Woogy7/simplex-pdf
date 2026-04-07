//! Signature commands: list, save, delete, and place signatures.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use base64::Engine as _;
use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::signing;
use crate::storage::signatures;
use crate::utils::error::AppError;
use crate::SignatureState;

/// Returns all saved signature entries.
#[tauri::command]
pub fn list_signatures(
    state: State<'_, SignatureState>,
) -> Result<Vec<signatures::SignatureEntry>, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    Ok(guard.signatures.clone())
}

/// Returns a signature image as a base64 data URI.
#[tauri::command]
pub fn get_signature_image(
    id: String,
    state: State<'_, SignatureState>,
) -> Result<String, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    let entry = guard
        .signatures
        .iter()
        .find(|s| s.id == id)
        .ok_or_else(|| AppError::Other(format!("Signature not found: {id}")))?;

    let bytes = signatures::load_signature_image(&entry.filename)?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{encoded}"))
}

/// Saves a new signature from a base64-encoded PNG image.
///
/// Accepts either a raw base64 string or a data URI with prefix.
#[tauri::command]
pub fn save_signature(
    name: String,
    png_base64: String,
    sig_type: String,
    state: State<'_, SignatureState>,
) -> Result<signatures::SignatureEntry, AppError> {
    let b64_data = png_base64
        .strip_prefix("data:image/png;base64,")
        .unwrap_or(&png_base64);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(b64_data)
        .map_err(|err| AppError::Other(format!("Invalid base64: {err}")))?;

    let mut guard = state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    let entry = signatures::add_signature(&mut guard, name, &bytes, sig_type)?;
    Ok(entry)
}

/// Deletes a saved signature by ID.
#[tauri::command]
pub fn delete_signature_cmd(id: String, state: State<'_, SignatureState>) -> Result<(), AppError> {
    let mut guard = state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    signatures::delete_signature(&mut guard, &id)?;
    Ok(())
}

/// Places a saved signature image onto a PDF page at the specified position.
///
/// Coordinates are in PDF points (origin at bottom-left of page).
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn place_signature_on_page(
    signature_id: String,
    page_index: i32,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    sig_state: State<'_, SignatureState>,
    doc_state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let sig_guard = sig_state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    let entry = sig_guard
        .signatures
        .iter()
        .find(|s| s.id == signature_id)
        .ok_or_else(|| AppError::Other(format!("Signature not found: {signature_id}")))?;
    let image_bytes = signatures::load_signature_image(&entry.filename)?;
    drop(sig_guard);

    let doc_guard = doc_state
        .0
        .lock()
        .map_err(|err| AppError::Other(format!("Lock poisoned: {err}")))?;
    let doc = doc_guard.as_ref().ok_or(AppError::NoDocument)?;
    signing::stamp_signature(doc, page_index, &image_bytes, x, y, width, height)?;
    Ok(())
}
