//! PDF form field detection and manipulation.
//!
//! Handles interactive form fields (`AcroForm`), including text inputs,
//! checkboxes, radio buttons, dropdowns, and signature fields.
//! Also handles flat-form text placement via `FreeText` annotations.

use pdfium_render::prelude::*;
use serde::{Deserialize, Serialize};

use super::annotations::AnnotationRect;
use super::parser::Document;
use crate::utils::error::AppError;

/// Information about a single interactive form field, returned to the frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FormFieldInfo {
    /// Zero-based page index containing this field.
    pub page_index: i32,
    /// Index of the annotation within the page's annotation collection.
    pub field_index: usize,
    /// Field type: "text", "checkbox", "radio", "combobox", "listbox",
    /// "pushbutton", "signature", or "unknown".
    pub field_type: String,
    /// Field name from the PDF form dictionary, if present.
    pub name: Option<String>,
    /// Current text value (for text, combobox, and listbox fields).
    pub value: Option<String>,
    /// Whether the field is checked (for checkbox and radio button fields).
    pub is_checked: Option<bool>,
    /// Whether the field is read-only.
    pub is_read_only: bool,
    /// Whether the field is required.
    pub is_required: bool,
    /// Bounding rectangle in PDF coordinate space.
    pub rect: AnnotationRect,
    /// Selectable options (for combobox and listbox fields).
    pub options: Option<Vec<FormFieldOption>>,
}

/// A single selectable option within a combobox or listbox field.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FormFieldOption {
    /// Displayed label for the option.
    pub label: Option<String>,
    /// Whether this option is currently selected.
    pub is_selected: bool,
}

/// A request to update a single form field, received from the frontend.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FormFieldUpdate {
    /// Zero-based page index of the field to update.
    pub page_index: i32,
    /// Annotation index within the page.
    pub field_index: usize,
    /// New text value (for text fields, combobox, listbox).
    pub value: Option<String>,
    /// New checked state (for checkbox and radio button fields).
    pub is_checked: Option<bool>,
}

/// A flat-text field placement for non-interactive PDFs (reserved for M3).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlatTextField {
    /// Zero-based page index to place the text on.
    pub page_index: i32,
    /// Text content to render.
    pub text: String,
    /// Bounding rectangle for the text placement.
    pub rect: AnnotationRect,
    /// Font size in PDF points.
    pub font_size: f32,
}

/// Saves flat text fields as `FreeText` annotations on the PDF.
///
/// Each text field is written as a `FreeText` annotation at the specified
/// position. This is used for non-interactive PDFs where users place text
/// overlays directly on the page.
///
/// # Errors
///
/// Returns [`AppError`] if page access or file save fails.
pub fn save_flat_text_fields(
    document: &Document,
    fields: &[FlatTextField],
) -> Result<(), AppError> {
    let pdf = document.inner();
    let path = &document.info().file_path;

    // Group by page to minimize page open/close cycles.
    let mut by_page: std::collections::BTreeMap<i32, Vec<&FlatTextField>> =
        std::collections::BTreeMap::new();
    for field in fields {
        by_page.entry(field.page_index).or_default().push(field);
    }

    // Keep all pages alive until after save completes.
    let mut open_pages = Vec::new();

    for (page_index, page_fields) in &by_page {
        let mut page = pdf.pages().get(*page_index)?;

        {
            let annotations = page.annotations_mut();
            for field in page_fields {
                let mut ann = annotations.create_free_text_annotation(&field.text)?;
                let rect = super::annotations::to_pdf_rect(&field.rect);
                ann.set_bounds(rect)?;
            }
        }

        open_pages.push(page);
    }

    let bytes = pdf.save_to_bytes()?;
    drop(open_pages);
    std::fs::write(path, bytes)?;

    Ok(())
}

/// Returns whether the document contains any interactive form fields.
///
/// Checks for an embedded `AcroForm` or XFA form. A document without forms
/// may still have flat (non-interactive) fields that can be filled via
/// `FreeText` annotations.
///
/// # Errors
///
/// Returns [`AppError`] if the document cannot be queried.
pub fn has_form_fields(document: &Document) -> Result<bool, AppError> {
    Ok(document.inner().form().is_some())
}

/// Reads all interactive form fields from every page in the document.
///
/// Iterates each page's annotation collection, filtering for widget annotations
/// that wrap a `PdfFormField`. Extracts field type, name, current value,
/// checked state, read-only/required flags, bounding rectangle, and selectable
/// options (for combobox and listbox fields).
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if page or annotation access fails.
pub fn read_form_fields(document: &Document) -> Result<Vec<FormFieldInfo>, AppError> {
    let pdf = document.inner();
    let pages = pdf.pages();
    let page_count = pages.len();
    let mut result = Vec::new();

    for page_index in 0..page_count {
        let Ok(page) = pages.get(page_index) else {
            continue;
        };

        let annotations = page.annotations();
        let ann_count = annotations.len();

        for ann_index in 0..ann_count {
            let Ok(annotation) = annotations.get(ann_index) else {
                continue;
            };

            let Some(field) = annotation.as_form_field() else {
                continue;
            };

            let Ok(bounds) = annotation.bounds() else {
                continue;
            };

            let (field_type, value, is_checked, options) = extract_field_data(field);

            result.push(FormFieldInfo {
                page_index,
                field_index: ann_index,
                field_type: field_type.to_string(),
                name: field.name(),
                value,
                is_checked,
                is_read_only: field.is_read_only(),
                is_required: field.is_required(),
                rect: AnnotationRect {
                    left: bounds.left().value,
                    top: bounds.top().value,
                    right: bounds.right().value,
                    bottom: bounds.bottom().value,
                },
                options,
            });
        }
    }

    Ok(result)
}

/// Extracts type-specific data from a form field.
///
/// Returns `(type_name, value, is_checked, options)`.
fn extract_field_data(
    field: &PdfFormField<'_>,
) -> (
    &'static str,
    Option<String>,
    Option<bool>,
    Option<Vec<FormFieldOption>>,
) {
    match field {
        PdfFormField::Text(text_field) => ("text", text_field.value(), None, None),
        PdfFormField::Checkbox(checkbox) => {
            let checked = checkbox.is_checked().unwrap_or(false);
            ("checkbox", None, Some(checked), None)
        }
        PdfFormField::RadioButton(radio) => {
            let checked = radio.is_checked().unwrap_or(false);
            ("radio", None, Some(checked), None)
        }
        PdfFormField::ComboBox(combo) => {
            let value = combo.value();
            let opts = collect_options(combo.options());
            ("combobox", value, None, Some(opts))
        }
        PdfFormField::ListBox(list) => {
            let value = list.value();
            let opts = collect_options(list.options());
            ("listbox", value, None, Some(opts))
        }
        PdfFormField::PushButton(_) => ("pushbutton", None, None, None),
        PdfFormField::Signature(_) => ("signature", None, None, None),
        PdfFormField::Unknown(_) => ("unknown", None, None, None),
    }
}

/// Collects selectable options from a `PdfFormFieldOptions` collection.
fn collect_options(options: &PdfFormFieldOptions<'_>) -> Vec<FormFieldOption> {
    options
        .iter()
        .map(|opt| FormFieldOption {
            label: opt.label().cloned(),
            is_selected: opt.is_set(),
        })
        .collect()
}

/// Applies a batch of form field value updates and saves the document.
///
/// Groups updates by page, opens each affected page, locates the annotation
/// at the given `field_index`, and sets the new value or checked state on the
/// underlying `PdfFormField`. After all updates are applied, the document is
/// saved to bytes and written to disk.
///
/// Page handles are kept alive until after `save_to_bytes()` completes,
/// following the same pattern as annotation saving, because `PDFium` discards
/// changes when page handles are dropped.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if field access or file save fails.
/// Returns [`AppError::Other`] if a field at the given index is not a form field.
pub fn set_form_field_values(
    document: &Document,
    updates: &[FormFieldUpdate],
) -> Result<(), AppError> {
    let pdf = document.inner();
    let path = &document.info().file_path;

    // Group updates by page index to minimize page open/close cycles.
    let mut by_page: std::collections::BTreeMap<i32, Vec<&FormFieldUpdate>> =
        std::collections::BTreeMap::new();
    for update in updates {
        by_page.entry(update.page_index).or_default().push(update);
    }

    // Keep all pages alive until after save completes.
    let mut open_pages: Vec<PdfPage<'_>> = Vec::new();

    for (page_index, page_updates) in &by_page {
        let page = pdf.pages().get(*page_index)?;
        let annotations = page.annotations();

        for update in page_updates {
            let mut annotation = annotations.get(update.field_index)?;
            let field = annotation.as_form_field_mut().ok_or_else(|| {
                AppError::Other(format!(
                    "Annotation at page {}, index {} is not a form field",
                    update.page_index, update.field_index
                ))
            })?;

            apply_field_update(field, update)?;
        }

        open_pages.push(page);
    }

    let bytes = pdf.save_to_bytes()?;
    drop(open_pages);
    std::fs::write(path, bytes)?;

    Ok(())
}

/// Applies a single update to a mutable form field.
///
/// Dispatches to the appropriate typed setter based on the field variant:
/// - Text fields: sets the text value.
/// - Checkboxes: sets the checked state.
/// - Radio buttons: selects the button.
///
/// # Errors
///
/// Returns [`AppError::Pdfium`] if the underlying `PDFium` call fails.
/// Returns [`AppError::Other`] if the update is incompatible with the field type.
fn apply_field_update(
    field: &mut PdfFormField<'_>,
    update: &FormFieldUpdate,
) -> Result<(), AppError> {
    match field {
        PdfFormField::Text(text_field) => {
            if let Some(ref value) = update.value {
                text_field.set_value(value)?;
            }
        }
        PdfFormField::Checkbox(checkbox) => {
            if let Some(checked) = update.is_checked {
                checkbox.set_checked(checked)?;
            }
        }
        PdfFormField::RadioButton(radio) => {
            if let Some(true) = update.is_checked {
                radio.set_checked()?;
            }
        }
        PdfFormField::ComboBox(_) | PdfFormField::ListBox(_) => {
            // ComboBox and ListBox value setting is not yet supported by
            // pdfium-render's safe API. These will be handled in a future
            // milestone if needed.
            if update.value.is_some() {
                return Err(AppError::Other(
                    "Setting combobox/listbox values is not yet supported".to_string(),
                ));
            }
        }
        PdfFormField::PushButton(_) | PdfFormField::Signature(_) | PdfFormField::Unknown(_) => {
            return Err(AppError::Other(format!(
                "Cannot set value on field type: {:?}",
                field.field_type()
            )));
        }
    }

    Ok(())
}
