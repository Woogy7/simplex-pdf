# Phase 2 — Form Filling, Smart Fields, Signatures, Freehand Drawing

## Goal
Ship the key differentiator: smart form filling with a field library and saved
signatures. Also add the freehand drawing tool deferred from Phase 1.

## Milestones

### M1: Freehand Drawing Tool
Deferred from Phase 1. Implement pen/draw mode with mouse-drawn strokes.
- Frontend: draw mode with mouse capture, render strokes as SVG/canvas overlay
- Color and stroke width selection in toolbar
- Save drawn strokes as ink annotations in the PDF
- Workaround: since pdfium-render lacks safe FPDFAnnot_AddInkStroke, either:
  - Use unsafe FFI to call FPDFAnnot_AddInkStroke directly, or
  - Render strokes as a flattened image layer on the page, or
  - Store stroke data in /Contents and only render as overlays (like highlights)

### M2: Interactive Form Filling
- Detect interactive form fields (AcroForm) in opened PDFs
- Render form field overlays: text input, checkbox, radio, dropdown, listbox
- Fill fields with user input — text typing, checkbox toggling, option selection
- Tab order navigation between form fields
- Save filled form data back to the PDF

### M3: Flat PDF Form Filling
- Place text overlays on non-interactive PDFs (the most common real-world use case)
- Click anywhere on a page to place a text input
- Drag to reposition, resize text fields
- Font size and style controls
- Save as flattened text on the PDF page

### M4: Smart Field Library
- Local storage for commonly-used field values (name, address, company, VAT, etc.)
- Create, edit, delete library entries
- Sidebar or popup to browse and insert library values
- Auto-suggest matching fields when filling forms
- Persist library to `~/.config/simplex-pdf/field_library.json`

### M5: Saved Signatures
- Draw signature with mouse/trackpad
- Upload signature image (PNG/JPG)
- Type signature (with handwriting-style font)
- Save signatures locally for reuse
- Drag-and-drop signature onto any page
- Resize and position signature
- Persist to `~/.config/simplex-pdf/signatures/`

## Key Decisions Needed
- [ ] Form field detection: use pdfium-render's form field API vs manual PDF object parsing
- [ ] Flat form text rendering: overlay vs flatten into page content
- [ ] Signature storage format: PNG image vs SVG path data
- [ ] Freehand drawing approach: unsafe FFI vs overlay-only vs flattened image

## Technical Notes from Phase 1
These patterns must be followed in Phase 2:

### PDFium Page Handle Lifecycle
- `pdf.pages().get(index)` returns an owned `PdfPage` — annotations/changes on it
  are discarded when the handle drops (FPDF_ClosePage)
- All modifications must happen while page handles are alive, then save_to_bytes()
  before dropping
- Never call FPDFAnnot_GetColor — it segfaults on annotations we create

### Save Pattern
```rust
let mut open_pages = Vec::new();
for page_index in pages_to_modify {
    let mut page = pdf.pages().get(page_index)?;
    // ... modify page ...
    open_pages.push(page);  // keep alive
}
let bytes = pdf.save_to_bytes()?;  // save while pages live
drop(open_pages);                   // now safe to drop
std::fs::write(path, bytes)?;       // write independently of PDFium file handle
```

### Annotation Overlay Pattern
- User interactions create frontend-only annotations (instant visual feedback)
- Rendered as positioned CSS elements over the page image
- Written to PDFium only on save (Ctrl+S)
- Colors encoded in /Contents with `simplex:` prefix for safe read-back

### Performance
- `[profile.dev.package."*"] opt-level = 2` in Cargo.toml for fast dependency code
- JPEG encoding for rendered pages (faster than PNG)
- 144 DPI default, multiplied by zoom level
- Virtualized rendering: only visible pages + 1 buffer rendered

## References
- Full spec: `simplex-pdf-spec.md`
- Phase 1 plan: `phase-1-plan.md`
- Architecture: `architecture.md`
- pdfium-render docs: `cargo doc --package pdfium-render --no-deps --open`
