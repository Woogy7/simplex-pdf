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

## Key Decisions Needed
- [ ] PDFium vs MuPDF — benchmark both with real PDFs
- [ ] Frontend state management — React Context vs Zustand
- [ ] Annotation storage format

## References
- Full spec: `simplex-pdf-spec.md`
- Crate evaluation table in spec (Key Rust Crates to Evaluate)
