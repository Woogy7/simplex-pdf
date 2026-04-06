# M1: PDF Loading & Rendering — Implementation Plan

## Overview
Add pdfium-render as the PDF engine, implement file opening and page rendering,
and build a functional viewer component that displays PDF pages.

## Tasks

### Task 1: Add dependencies and set up PDFium library
- Add `pdfium-render`, `lopdf`, `base64`, `image` to Cargo.toml
- Download PDFium shared library for Linux dev environment
- Configure library path resolution in the Rust code
- Verify pdfium-render initializes without errors

**Files:** `src-tauri/Cargo.toml`, `scripts/setup-pdfium.sh`
**Verify:** `cargo check` passes, PDFium lib accessible at runtime
**Done when:** Dependencies compile and PDFium can be loaded

### Task 2: Implement core PDF engine — document loading and page rendering
- Implement `PdfDocument` wrapper in `pdf/parser.rs` that opens a PDF file
- Implement page rendering in `pdf/renderer.rs` that renders a page to PNG bytes
- Implement document info extraction (page count, page dimensions)
- Add proper error handling with AppError variants
- Unit tests for core operations

**Files:** `src-tauri/src/pdf/parser.rs`, `src-tauri/src/pdf/renderer.rs`, `src-tauri/src/pdf/mod.rs`, `src-tauri/src/utils/error.rs`
**Verify:** Unit tests pass
**Done when:** Can open a PDF, get page count, render any page to PNG bytes

### Task 3: Implement Tauri commands for file operations and rendering
- `open_file` command — opens a PDF via native file dialog, stores document in app state
- `get_page_count` command — returns total pages
- `render_page` command — renders a specific page at given DPI, returns base64 PNG
- `get_document_info` command — returns metadata (title, author, page count)
- Manage document state in Tauri app state (Mutex-wrapped)

**Files:** `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/view.rs`, `src-tauri/src/lib.rs`
**Verify:** Commands register and can be invoked
**Done when:** Frontend can open a file and request rendered pages

### Task 4: Build frontend Viewer component
- File open button/menu that triggers native file dialog (also via Ctrl+O shortcut)
- Display rendered PDF pages as images
- Basic page navigation (previous/next, go to page)
- Show current page number and total pages
- Loading states while pages render
- Handle errors gracefully

**Files:** `src/App.tsx`, `src/components/Viewer.tsx`, `src/components/Toolbar.tsx`, `src/lib/api.ts`, `src/styles/main.css`
**Verify:** Can open a PDF and see rendered pages
**Done when:** User can open a PDF file and navigate through pages
