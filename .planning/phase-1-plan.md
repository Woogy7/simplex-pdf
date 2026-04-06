# Phase 1 — PDF Viewing, Search, Basic Annotations

## Goal
Ship a usable, fast PDF viewer with search and basic annotation support.

## Milestones

### M1: PDF Loading & Rendering
- Evaluate PDFium vs MuPDF for rendering engine
- Implement PDF file open/load command
- Render PDF pages to images for display
- Display rendered pages in the frontend viewer component

### M2: Navigation & Viewing
- Smooth scrolling between pages
- Zoom in/out with keyboard and mouse
- Page thumbnails sidebar
- View modes: single page, continuous scroll, two-page
- Keyboard shortcuts for navigation

### M3: Text Search
- Extract text from PDF pages
- Full-text search with match highlighting
- Navigate between matches (next/previous)
- Case-sensitive and whole-word options

### M4: Basic Annotations
- Text highlighting (multiple colors)
- Underline and strikethrough
- Freehand drawing / pen tool
- Text boxes / sticky notes
- Save annotations back to PDF

### M5: Polish & Release
- Dark mode / theme support
- Keyboard shortcuts for all actions
- Performance testing with large PDFs
- First alpha release

## Key Decisions
- [x] PDFium vs MuPDF — **PDFium chosen** (2026-04-06)
  - pdfium-render (v0.9.0) covers rendering, text extraction, forms, annotations, page manipulation
  - MuPDF eliminated: AGPL license, no form field support, Windows broken, soundness bugs
  - PDFium shipped as dynamic library (~7.5MB) bundled with app
- [x] Frontend state management — **React useState** (sufficient for Phase 1, revisit if needed)
- [x] Annotation storage format — **CSS overlays + /Contents field color encoding**
  - Annotations displayed as CSS overlays for instant visual feedback
  - Colors encoded in /Contents with `simplex:#HEXCOLOR` prefix
  - Written to PDFium on save for interoperability with other viewers
- [x] Freehand drawing — **deferred to Phase 2** (pdfium-render lacks safe ink stroke API)

## References
- Full spec: `simplex-pdf-spec.md`
- Crate evaluation table in spec (Key Rust Crates to Evaluate)
