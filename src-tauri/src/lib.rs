//! Simplex PDF — a modern PDF viewer and editor built with Tauri.
//!
//! This crate contains the core application logic, Tauri command handlers,
//! PDF processing engine, local storage layer, and shared utilities.

#![warn(clippy::all, clippy::pedantic)]

mod commands;
pub mod pdf;
mod storage;
pub mod utils;

use std::sync::Mutex;

use commands::file::OpenDocument;
use storage::field_library;
use storage::signatures;

/// Managed Tauri state wrapping the in-memory field library behind a mutex.
pub struct FieldLibraryState(pub Mutex<field_library::FieldLibrary>);

/// Managed Tauri state wrapping the in-memory signature index behind a mutex.
pub struct SignatureState(pub Mutex<signatures::SignatureIndex>);

/// Builds and runs the Tauri application.
///
/// This is the main entry point called from `main.rs`. It registers all
/// Tauri commands, configures the application, and starts the event loop.
///
/// # Panics
///
/// Panics if the Tauri application fails to initialize or run.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(OpenDocument(Mutex::new(None)))
        .manage(FieldLibraryState(Mutex::new(
            field_library::load_library().unwrap_or_default(),
        )))
        .manage(SignatureState(Mutex::new(
            signatures::load_index().unwrap_or_default(),
        )))
        .invoke_handler(tauri::generate_handler![
            commands::file::open_file,
            commands::file::get_page_count,
            commands::file::get_document_info,
            commands::file::render_page,
            commands::file::get_page_dimensions,
            commands::search::search_text,
            commands::annotate::get_annotations,
            commands::annotate::save_with_annotations,
            commands::annotate::save_pdf,
            commands::forms::get_form_fields,
            commands::forms::has_form,
            commands::forms::set_form_field_values,
            commands::forms::save_flat_text_fields,
            commands::forms::get_field_library,
            commands::forms::add_library_entry,
            commands::forms::update_library_entry,
            commands::forms::delete_library_entry,
            commands::forms::add_library_category,
            commands::forms::delete_library_category,
            commands::forms::import_library,
            commands::forms::export_library,
            commands::sign::list_signatures,
            commands::sign::get_signature_image,
            commands::sign::save_signature,
            commands::sign::delete_signature_cmd,
            commands::sign::place_signature_on_page,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run simplex-pdf application");
}
