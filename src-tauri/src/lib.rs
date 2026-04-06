//! Simplex PDF — a modern PDF viewer and editor built with Tauri.
//!
//! This crate contains the core application logic, Tauri command handlers,
//! PDF processing engine, local storage layer, and shared utilities.

#![warn(clippy::all, clippy::pedantic)]

mod commands;
mod pdf;
mod storage;
mod utils;

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
        .invoke_handler(tauri::generate_handler![commands::file::greet])
        .run(tauri::generate_context!())
        .expect("failed to run simplex-pdf application");
}
