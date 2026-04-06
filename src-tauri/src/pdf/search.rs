//! Full-text search within PDF documents.
//!
//! Uses `PDFium`'s built-in text search to find matches across all pages,
//! returning bounding rectangles for highlight overlays in the frontend.

use pdfium_render::prelude::*;
use serde::Serialize;

use super::parser::Document;
use crate::utils::error::AppError;

/// A single search match with its location.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    /// Zero-based page index.
    pub page_index: i32,
    /// Bounding rectangles of the match segments (in PDF points, origin = bottom-left).
    pub rects: Vec<MatchRect>,
}

/// A bounding rectangle in PDF points.
#[derive(Debug, Clone, Serialize)]
pub struct MatchRect {
    pub left: f32,
    pub top: f32,
    pub right: f32,
    pub bottom: f32,
}

/// Search results across the entire document.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub query: String,
    pub total_matches: usize,
    pub matches: Vec<SearchMatch>,
}

/// Searches the entire document for the given query string.
///
/// # Errors
///
/// Returns `AppError::Pdfium` if text extraction or search fails.
pub fn search_document(
    document: &Document,
    query: &str,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<SearchResults, AppError> {
    if query.is_empty() {
        return Ok(SearchResults {
            query: String::new(),
            total_matches: 0,
            matches: Vec::new(),
        });
    }

    let pdf = document.inner();
    let pages = pdf.pages();
    let mut matches = Vec::new();

    let options = PdfSearchOptions::new()
        .match_case(case_sensitive)
        .match_whole_word(whole_word);

    for page_index in 0..pages.len() {
        let page = pages.get(page_index)?;
        let text = page.text()?;
        let search = text.search(query, &options)?;

        for segments in search.iter(PdfSearchDirection::SearchForward) {
            let mut rects = Vec::new();
            for segment in segments.iter() {
                let bounds = segment.bounds();
                rects.push(MatchRect {
                    left: bounds.left().value,
                    top: bounds.top().value,
                    right: bounds.right().value,
                    bottom: bounds.bottom().value,
                });
            }
            if !rects.is_empty() {
                matches.push(SearchMatch { page_index, rects });
            }
        }
    }

    let total_matches = matches.len();
    Ok(SearchResults {
        query: query.to_string(),
        total_matches,
        matches,
    })
}
