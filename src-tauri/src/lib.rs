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
        ])
        .run(tauri::generate_context!())
        .expect("failed to run simplex-pdf application");
}
