//! Search commands: text search and result navigation.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::search::{self, SearchResults};
use crate::utils::error::AppError;

/// Searches the currently open document for the given query.
///
/// Returns all matches across all pages with bounding rectangles.
#[tauri::command]
pub fn search_text(
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    state: State<'_, OpenDocument>,
) -> Result<SearchResults, AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    search::search_document(doc, &query, case_sensitive, whole_word)
}
