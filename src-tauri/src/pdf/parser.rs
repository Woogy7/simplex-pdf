//! PDF parsing and document management.
//!
//! Provides [`Document`], a wrapper around `PDFium`'s document handle that
//! manages the lifecycle of an open PDF and exposes metadata and page access.

use std::path::Path;
use std::sync::OnceLock;

use pdfium_render::prelude::*;

use crate::utils::error::AppError;

/// Returns a reference to the global `PDFium` instance.
///
/// The instance is created on first call by dynamically loading the `PDFium`
/// shared library from the `lib/` directory next to the executable, or from
/// the system library path as a fallback.
///
/// # Panics
///
/// Panics if `PDFium` cannot be loaded from any known location.
pub fn pdfium() -> &'static Pdfium {
    static INSTANCE: OnceLock<Pdfium> = OnceLock::new();

    INSTANCE.get_or_init(|| {
        let lib_name = Pdfium::pdfium_platform_library_name();

        // Try loading from the lib/ directory next to the executable first.
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(Path::to_path_buf));

        let lib_dirs = [
            // Development: lib/ in src-tauri/
            Some(std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("lib")),
            // Production: lib/ next to executable
            exe_dir.clone().map(|d| d.join("lib")),
            // Production: same directory as executable
            exe_dir,
        ];

        // bind_to_library expects the full file path, not a directory
        for dir in lib_dirs.into_iter().flatten() {
            let full_path = dir.join(&lib_name);
            if let Ok(bindings) = Pdfium::bind_to_library(&full_path) {
                return Pdfium::new(bindings);
            }
        }

        // Last resort: try system library path
        if let Ok(bindings) = Pdfium::bind_to_system_library() {
            return Pdfium::new(bindings);
        }

        panic!("Could not load PDFium library. Run `scripts/setup-pdfium.sh` to download it.");
    })
}

/// Page index type used throughout the application.
pub type PageIndex = i32;

/// Metadata extracted from a PDF document.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentInfo {
    /// Document title from PDF metadata, if present.
    pub title: Option<String>,
    /// Document author from PDF metadata, if present.
    pub author: Option<String>,
    /// Total number of pages.
    pub page_count: PageIndex,
    /// Path the document was loaded from.
    pub file_path: String,
}

/// An open PDF document backed by `PDFium`.
///
/// This struct owns the `PDFium` document handle. The `PdfDocument` is `'static`
/// because the global `Pdfium` instance lives for the entire process.
pub struct Document {
    document: PdfDocument<'static>,
    info: DocumentInfo,
}

impl Document {
    /// Opens a PDF file from disk.
    ///
    /// # Errors
    ///
    /// Returns `AppError::Io` if the file cannot be read, or
    /// `AppError::Pdfium` if `PDFium` cannot parse the document.
    pub fn open(path: &Path) -> Result<Self, AppError> {
        let pdfium = pdfium();
        let document = pdfium.load_pdf_from_file(path, None)?;

        let page_count = document.pages().len();
        let metadata = document.metadata();

        let title = metadata
            .get(pdfium_render::prelude::PdfDocumentMetadataTagType::Title)
            .and_then(|t| non_empty(t.value().to_string()));
        let author = metadata
            .get(pdfium_render::prelude::PdfDocumentMetadataTagType::Author)
            .and_then(|t| non_empty(t.value().to_string()));

        let info = DocumentInfo {
            title,
            author,
            page_count,
            file_path: path.to_string_lossy().into_owned(),
        };

        Ok(Self { document, info })
    }

    /// Returns cached document metadata.
    #[must_use]
    pub fn info(&self) -> &DocumentInfo {
        &self.info
    }

    /// Returns the total number of pages.
    #[must_use]
    pub fn page_count(&self) -> PageIndex {
        self.info.page_count
    }

    /// Returns a reference to the underlying `PDFium` document.
    #[must_use]
    pub fn inner(&self) -> &PdfDocument<'static> {
        &self.document
    }
}

/// Returns `None` if the string is empty or only whitespace.
fn non_empty(s: String) -> Option<String> {
    if s.trim().is_empty() {
        None
    } else {
        Some(s)
    }
}
