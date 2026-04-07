//! Signature storage and management.
//!
//! Persists user-created signature images (PNG) for reuse across documents.
//! Signatures are stored in `~/.config/simplex-pdf/signatures/` with a JSON index.

use std::path::PathBuf;
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::field_library::config_dir;
use crate::utils::error::AppError;

/// The top-level container for all saved signatures.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureIndex {
    /// Schema version for future migration support.
    pub version: u32,
    /// Ordered list of saved signature entries.
    pub signatures: Vec<SignatureEntry>,
}

/// A single saved signature entry with metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignatureEntry {
    /// Unique identifier (UUID v4).
    pub id: String,
    /// Human-readable name (e.g. "My Signature").
    pub name: String,
    /// Filename of the PNG image in the signatures directory.
    pub filename: String,
    /// Creation timestamp as Unix epoch seconds (string).
    pub created_at: String,
    /// How the signature was created: "drawn", "uploaded", or "typed".
    pub sig_type: String,
}

impl Default for SignatureIndex {
    fn default() -> Self {
        Self {
            version: 1,
            signatures: Vec::new(),
        }
    }
}

/// Returns the signatures directory, creating it if needed.
///
/// The directory is `<platform-config-dir>/simplex-pdf/signatures/`.
///
/// # Errors
///
/// Returns an error if the config directory cannot be determined or
/// if creating the directory fails.
fn signatures_dir() -> Result<PathBuf, AppError> {
    let dir = config_dir()?.join("signatures");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

/// Returns the path to the signature index JSON file.
fn index_path() -> Result<PathBuf, AppError> {
    Ok(signatures_dir()?.join("index.json"))
}

/// Loads the signature index from disk, or returns a default if the file doesn't exist.
///
/// # Errors
///
/// Returns an error if the file exists but cannot be read or parsed.
pub fn load_index() -> Result<SignatureIndex, AppError> {
    let path = index_path()?;
    if !path.exists() {
        return Ok(SignatureIndex::default());
    }
    let data = std::fs::read_to_string(&path)?;
    let index: SignatureIndex = serde_json::from_str(&data)?;
    Ok(index)
}

/// Saves the signature index to disk atomically (write to temp, then rename).
///
/// # Errors
///
/// Returns an error if writing or renaming the file fails.
pub fn save_index(index: &SignatureIndex) -> Result<(), AppError> {
    let path = index_path()?;
    let tmp = path.with_extension("json.tmp");
    let data = serde_json::to_string_pretty(index)?;
    std::fs::write(&tmp, data)?;
    std::fs::rename(&tmp, &path)?;
    Ok(())
}

/// Saves a signature PNG image to the signatures directory.
///
/// Returns the filename (not full path) of the saved image.
///
/// # Errors
///
/// Returns an error if writing the file fails.
pub fn save_signature_image(id: &str, png_bytes: &[u8]) -> Result<String, AppError> {
    let filename = format!("sig_{id}.png");
    let path = signatures_dir()?.join(&filename);
    std::fs::write(&path, png_bytes)?;
    Ok(filename)
}

/// Loads a signature PNG image as raw bytes.
///
/// # Errors
///
/// Returns an error if the file cannot be read.
pub fn load_signature_image(filename: &str) -> Result<Vec<u8>, AppError> {
    let path = signatures_dir()?.join(filename);
    let bytes = std::fs::read(&path)?;
    Ok(bytes)
}

/// Adds a new signature entry, saves the PNG, and updates the index.
///
/// # Errors
///
/// Returns an error if saving the image or index fails.
pub fn add_signature(
    index: &mut SignatureIndex,
    name: String,
    png_bytes: &[u8],
    sig_type: String,
) -> Result<SignatureEntry, AppError> {
    let id = Uuid::new_v4().to_string();
    let filename = save_signature_image(&id, png_bytes)?;
    let entry = SignatureEntry {
        id,
        name,
        filename,
        created_at: unix_timestamp_string(),
        sig_type,
    };
    index.signatures.push(entry.clone());
    save_index(index)?;
    Ok(entry)
}

/// Deletes a signature by ID (removes from index and deletes the PNG file).
///
/// # Errors
///
/// Returns an error if the signature is not found or file deletion fails.
pub fn delete_signature(index: &mut SignatureIndex, id: &str) -> Result<(), AppError> {
    let entry = index
        .signatures
        .iter()
        .find(|s| s.id == id)
        .ok_or_else(|| AppError::Other(format!("Signature not found: {id}")))?;

    let path = signatures_dir()?.join(&entry.filename);
    if path.exists() {
        std::fs::remove_file(&path)?;
    }

    index.signatures.retain(|s| s.id != id);
    save_index(index)?;
    Ok(())
}

/// Returns the current time as a Unix epoch seconds string.
fn unix_timestamp_string() -> String {
    let dur = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", dur.as_secs())
}
