//! Local data persistence layer.
//!
//! Manages application state that persists across sessions, including
//! user preferences, recent files, saved signatures, and the reusable
//! form field library.

pub mod field_library;
pub mod preferences;
pub mod recent_files;
pub mod signatures;
