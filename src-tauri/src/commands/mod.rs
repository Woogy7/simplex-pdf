//! Tauri command handlers.
//!
//! Each submodule groups related commands that are invoked from the frontend
//! via `tauri::invoke`. Commands are thin wrappers that delegate to the
//! [`crate::pdf`] and [`crate::storage`] layers.

pub mod annotate;
pub mod file;
pub mod forms;
pub mod pages;
pub mod search;
pub mod sign;
pub mod view;
