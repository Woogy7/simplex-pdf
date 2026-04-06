//! Annotation commands: write annotations to PDF and save.
// Tauri command signatures require pass-by-value for State and deserialized args.
#![allow(clippy::needless_pass_by_value)]

use tauri::State;

use crate::commands::file::OpenDocument;
use crate::pdf::annotations::{self, AnnotationColor, AnnotationRect};
use crate::utils::error::AppError;

/// A single annotation to write to the PDF, received from the frontend.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationData {
    /// Zero-based page index.
    pub page_index: i32,
    /// Annotation type: "highlight", "underline", "strikeout", or "note".
    pub annotation_type: String,
    /// Bounding rectangle in PDF points.
    pub rect: AnnotationRect,
    /// RGBA color.
    pub color: AnnotationColor,
    /// Text content (for notes).
    pub content: Option<String>,
}

/// Writes all pending annotations to the PDF and saves it to disk.
///
/// Annotations are batched per page so each page handle is only opened once,
/// avoiding the issue where closing a page handle discards unsaved annotations.
#[tauri::command]
pub fn save_with_annotations(
    annotations: Vec<AnnotationData>,
    state: State<'_, OpenDocument>,
) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;

    // Group annotations by page
    let mut by_page: std::collections::HashMap<i32, Vec<&AnnotationData>> =
        std::collections::HashMap::new();
    for ann in &annotations {
        by_page.entry(ann.page_index).or_default().push(ann);
    }

    // Write all annotations for each page on a single page handle
    for (page_index, page_annotations) in &by_page {
        for ann in page_annotations {
            match ann.annotation_type.as_str() {
                "highlight" | "underline" | "strikeout" => {
                    annotations::add_markup_annotation(
                        doc,
                        *page_index,
                        &ann.annotation_type,
                        &ann.rect,
                        &ann.color,
                    )?;
                }
                "note" => {
                    annotations::add_text_note(
                        doc,
                        *page_index,
                        &ann.rect,
                        ann.content.as_deref().unwrap_or(""),
                        &ann.color,
                    )?;
                }
                _ => {}
            }
        }
    }

    // Save the document with all annotations
    annotations::save_document(doc)?;
    Ok(())
}

/// Saves the currently open document to disk without adding new annotations.
#[tauri::command]
pub fn save_pdf(state: State<'_, OpenDocument>) -> Result<(), AppError> {
    let guard = state
        .0
        .lock()
        .map_err(|e| AppError::Other(format!("Lock poisoned: {e}")))?;
    let doc = guard.as_ref().ok_or(AppError::NoDocument)?;
    annotations::save_document(doc)
}
