//! Reusable form field library.
//!
//! Stores commonly used field values (name, address, etc.) for quick
//! insertion when filling PDF forms. Data persists as JSON in the
//! platform-appropriate config directory.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::utils::error::AppError;

/// The top-level container for all saved field entries, organised by category.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldLibrary {
    /// Schema version for future migration support.
    pub version: u32,
    /// Ordered list of categories, each containing field entries.
    pub categories: Vec<Category>,
}

/// A named group of related field entries (e.g. "Personal", "Company").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    /// Unique identifier (UUID v4).
    pub id: String,
    /// Human-readable category name.
    pub name: String,
    /// Field entries belonging to this category.
    pub fields: Vec<FieldEntry>,
}

/// A single reusable form field value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldEntry {
    /// Unique identifier (UUID v4).
    pub id: String,
    /// Short descriptive label (e.g. "Full Name").
    pub label: String,
    /// The value to insert into a form field.
    pub value: String,
    /// Optional tags for search and filtering.
    #[serde(default)]
    pub tags: Vec<String>,
}

impl Default for FieldLibrary {
    fn default() -> Self {
        Self {
            version: 1,
            categories: vec![
                Category {
                    id: Uuid::new_v4().to_string(),
                    name: "Personal".to_string(),
                    fields: Vec::new(),
                },
                Category {
                    id: Uuid::new_v4().to_string(),
                    name: "Company".to_string(),
                    fields: Vec::new(),
                },
            ],
        }
    }
}

/// Returns the config directory, creating it if needed.
///
/// The directory is `<platform-config-dir>/simplex-pdf/`.
///
/// # Errors
///
/// Returns an error if the platform config directory cannot be determined
/// or if creating the directory fails.
pub fn config_dir() -> Result<PathBuf, AppError> {
    let dir = dirs::config_dir()
        .ok_or_else(|| AppError::Other("Could not determine config directory".to_string()))?
        .join("simplex-pdf");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

/// Returns the path to the field library JSON file.
fn library_path() -> Result<PathBuf, AppError> {
    Ok(config_dir()?.join("field_library.json"))
}

/// Loads the field library from disk, or returns a default if the file doesn't exist.
///
/// # Errors
///
/// Returns an error if the file exists but cannot be read or parsed.
pub fn load_library() -> Result<FieldLibrary, AppError> {
    let path = library_path()?;
    if !path.exists() {
        return Ok(FieldLibrary::default());
    }
    let data = std::fs::read_to_string(&path)?;
    let library: FieldLibrary = serde_json::from_str(&data)?;
    Ok(library)
}

/// Saves the field library to disk atomically (write to temp, then rename).
///
/// # Errors
///
/// Returns an error if writing or renaming the file fails.
pub fn save_library(library: &FieldLibrary) -> Result<(), AppError> {
    let path = library_path()?;
    let tmp = path.with_extension("json.tmp");
    let data = serde_json::to_string_pretty(library)?;
    std::fs::write(&tmp, data)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

/// Adds a new entry to a category.
///
/// # Errors
///
/// Returns an error if the category is not found.
pub fn add_entry(
    library: &mut FieldLibrary,
    category_id: &str,
    label: String,
    value: String,
    tags: Vec<String>,
) -> Result<FieldEntry, AppError> {
    let category = library
        .categories
        .iter_mut()
        .find(|c| c.id == category_id)
        .ok_or_else(|| AppError::Other(format!("Category not found: {category_id}")))?;
    let entry = FieldEntry {
        id: Uuid::new_v4().to_string(),
        label,
        value,
        tags,
    };
    category.fields.push(entry.clone());
    Ok(entry)
}

/// Updates an existing entry by ID.
///
/// Searches across all categories for the entry.
///
/// # Errors
///
/// Returns an error if the entry is not found.
pub fn update_entry(
    library: &mut FieldLibrary,
    entry_id: &str,
    label: String,
    value: String,
    tags: Vec<String>,
) -> Result<(), AppError> {
    for category in &mut library.categories {
        if let Some(entry) = category.fields.iter_mut().find(|f| f.id == entry_id) {
            entry.label = label;
            entry.value = value;
            entry.tags = tags;
            return Ok(());
        }
    }
    Err(AppError::Other(format!("Entry not found: {entry_id}")))
}

/// Deletes an entry by ID.
///
/// Searches across all categories for the entry.
///
/// # Errors
///
/// Returns an error if the entry is not found.
pub fn delete_entry(library: &mut FieldLibrary, entry_id: &str) -> Result<(), AppError> {
    for category in &mut library.categories {
        let len_before = category.fields.len();
        category.fields.retain(|f| f.id != entry_id);
        if category.fields.len() < len_before {
            return Ok(());
        }
    }
    Err(AppError::Other(format!("Entry not found: {entry_id}")))
}

/// Adds a new category and returns it.
pub fn add_category(library: &mut FieldLibrary, name: String) -> Category {
    let category = Category {
        id: Uuid::new_v4().to_string(),
        name,
        fields: Vec::new(),
    };
    library.categories.push(category.clone());
    category
}

/// Deletes a category by ID.
///
/// # Errors
///
/// Returns an error if the category is not found.
pub fn delete_category(library: &mut FieldLibrary, category_id: &str) -> Result<(), AppError> {
    let len_before = library.categories.len();
    library.categories.retain(|c| c.id != category_id);
    if library.categories.len() < len_before {
        Ok(())
    } else {
        Err(AppError::Other(format!(
            "Category not found: {category_id}"
        )))
    }
}
