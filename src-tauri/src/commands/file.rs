//! File-related commands: open, save, export, and recent files.

/// Greets the user by name.
///
/// This is a placeholder command used to verify that the Tauri IPC bridge
/// is working correctly. It will be replaced with real file commands.
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to Simplex PDF.")
}
