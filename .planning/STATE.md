# Workflow State

## Current Phase
Phase 1 COMPLETE — Phase 2 ready to start

## Status
Phase 1 manually tested and all issues resolved. Ready for Phase 2.

## Last Updated
2026-04-06

## Phase 1 — Completed (2026-04-06)
- M1: PDF loading & rendering (pdfium-render 0.9.0, dynamic linking)
- M2: Navigation (zoom 25-400%, continuous scroll, thumbnails sidebar, keyboard shortcuts)
- M3: Text search (full-text, case/whole-word, match highlighting + navigation)
- M4: Annotations (highlight, underline, strikeout, sticky notes with 7 colors)
- M5: Dark/Light/Auto theme toggle, 144 DPI rendering

### Key Technical Decisions from Phase 1
- Annotations rendered as CSS overlays (not PDFium re-render) for instant feedback
- Annotations persisted to PDF via PDFium on save, with color stored in /Contents field
  using `simplex:` prefix (avoids FPDFAnnot_GetColor segfault)
- Save uses save_to_bytes() + fs::write() to avoid file handle conflict with load_pdf_from_file
- Page handles must be kept alive during save (PDFium discards annotations on FPDF_ClosePage)
- Dependencies compiled with opt-level=2 in dev mode for acceptable render performance
- JPEG encoding instead of PNG for faster renders

### Known Limitations
- Freehand drawing not implemented (pdfium-render lacks safe FPDFAnnot_AddInkStroke wrapper)
- Single/two-page view modes not implemented (continuous scroll is default)
- Annotation colors from other PDF editors show as defaults (PDFium color read segfaults)
- Save overwrites original file (no "Save As" yet)

## Phase 2 — Next
Form filling, smart field library, saved signatures, freehand drawing tool.
See `.planning/phase-2-plan.md` for milestones and tasks.
