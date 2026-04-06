# Simplex PDF — Manual Testing Checklist (Phase 1 Alpha)

## How to Run the App

### Prerequisites

You need three things installed:

1. **Rust** — you already have it (`rustc --version` to verify)
2. **Node.js + npm** — you already have it (`node --version` to verify)
3. **PDFium library** — run the setup script once:

```bash
cd ~/Projects/simplex-pdf
bash scripts/setup-pdfium.sh
```

This downloads the PDFium shared library (~7.5MB) into `src-tauri/lib/`.

### Running in Development Mode

```bash
cd ~/Projects/simplex-pdf
npm run tauri dev
```

This will:
1. Start the Vite dev server (frontend hot reload on port 1420)
2. Compile the Rust backend (first run takes ~45s, subsequent runs are fast)
3. Open the Simplex PDF window

**First build will be slow** — Rust compiles all dependencies. After that, incremental builds are fast.

### If Something Goes Wrong

- **"Could not load PDFium library"** — Run `bash scripts/setup-pdfium.sh` again
- **Window doesn't open** — Check the terminal for Rust compilation errors
- **Blank white window** — Wait a few seconds for Vite to compile, or check browser devtools (right-click > Inspect)
- **To stop the app** — Close the window, or press Ctrl+C in the terminal

### Getting a Test PDF

You need PDF files to test with. Some options:
- Any PDF you already have on your computer
- Download sample PDFs from https://www.w3.org/WAI/WCAG21/Techniques/pdf/
- Create a test PDF by printing any document to PDF

---

## Test Checklist

### App Launch & Empty State
- [ ] App opens without errors
- [ ] Empty state shows "Simplex PDF" title and "Open File" button
- [ ] Theme toggle button is visible (shows "Dark", "Light", or "Auto")

### File Opening
- [ ] Click "Open" button — native file picker appears
- [ ] Select a PDF — document loads, pages appear
- [ ] Toolbar shows filename or document title
- [ ] Page count shows correctly (e.g. "1 / 5")
- [ ] Cancel file picker — nothing crashes

### Page Navigation
- [ ] Click right arrow — goes to next page
- [ ] Click left arrow — goes to previous page
- [ ] Left arrow disabled on page 1
- [ ] Right arrow disabled on last page
- [ ] Type a page number in the input — jumps to that page
- [ ] Arrow keys (Left/Right or Up/Down) navigate pages
- [ ] Home key — jumps to first page
- [ ] End key — jumps to last page
- [ ] PageUp/PageDown — jumps by 10 pages

### Continuous Scroll
- [ ] All pages render stacked vertically
- [ ] Scroll down through the document smoothly
- [ ] Page number in toolbar updates as you scroll
- [ ] Only visible pages are rendered (check: scroll fast past many pages — no lag)
- [ ] Pages that scroll out of view have their renders cached

### Zoom
- [ ] Click "+" to zoom in — page gets bigger
- [ ] Click "-" to zoom out — page gets smaller
- [ ] Click the percentage label (e.g. "100%") — resets to 100%
- [ ] Ctrl+= (Ctrl and equals key) zooms in
- [ ] Ctrl+- zooms out
- [ ] Ctrl+0 resets zoom
- [ ] Zoom range: 25% to 400%
- [ ] Pages re-render at new zoom level (should look crisp, not blurry)

### Page Thumbnails Sidebar
- [ ] Sidebar is visible on the left by default
- [ ] Thumbnails show small versions of each page
- [ ] Click a thumbnail — viewer scrolls to that page
- [ ] Current page thumbnail is highlighted with blue border
- [ ] Click the hamburger menu button (top-right) — sidebar toggles
- [ ] Sidebar hidden — more space for the viewer

### Text Search (Ctrl+F)
- [ ] Press Ctrl+F — search bar appears below toolbar
- [ ] Type a word — matches are highlighted on pages in yellow
- [ ] Match count shows (e.g. "1 / 15")
- [ ] Press Enter — jumps to next match (orange highlight)
- [ ] Press Shift+Enter — jumps to previous match
- [ ] Click up/down arrows in search bar — navigates matches
- [ ] "Aa" button toggles case-sensitive search
- [ ] "W" button toggles whole-word search
- [ ] Press Escape — search bar closes, highlights removed
- [ ] Search for a word that doesn't exist — shows "No results"
- [ ] Search button in toolbar also opens search

### Annotations — Highlight
- [ ] Click "H" button in toolbar — enters highlight mode
- [ ] Cursor changes to crosshair
- [ ] Click and drag on a page — yellow preview rectangle appears
- [ ] Release mouse — highlight annotation is created
- [ ] Page re-renders showing the highlight
- [ ] "H" button is highlighted when in highlight mode
- [ ] Click "H" again — exits highlight mode
- [ ] Escape key — exits annotation mode

### Annotations — Underline & Strikeout
- [ ] Click "U" — enter underline mode, drag to create underline annotation
- [ ] Click "S" — enter strikeout mode, drag to create strikeout annotation
- [ ] Both work the same as highlight but with different visual effect

### Annotations — Sticky Note
- [ ] Click "N" — enter note mode
- [ ] Click on a page — text prompt appears
- [ ] Type text and click OK — sticky note icon appears on page
- [ ] Cancel the prompt — no note created

### Annotation Color Picker
- [ ] When in any annotation mode, 5 color dots appear in toolbar
- [ ] Click a color — selected color gets a border highlight
- [ ] Create an annotation — uses the selected color
- [ ] Default color is yellow

### Save (Ctrl+S)
- [ ] Make annotations on a PDF
- [ ] Click "Save" button (or press Ctrl+S)
- [ ] Close and reopen the same PDF — annotations are still there
- [ ] **WARNING**: Save overwrites the original file. Use a copy for testing!

### Dark Mode / Theme
- [ ] Theme button shows "Dark" — click it, UI switches to dark mode
- [ ] Click again — shows "Light", switches to light mode
- [ ] Click again — shows "Auto", follows system preference
- [ ] Dark mode: dark backgrounds, light text, readable toolbar
- [ ] Light mode: white backgrounds, dark text

### Keyboard Shortcuts Summary
| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file |
| Ctrl+S | Save file |
| Ctrl+F | Open search |
| Ctrl+= | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |
| Arrow keys | Navigate pages |
| Home / End | First / last page |
| PageUp / PageDown | Jump 10 pages |
| Escape | Close search / exit annotation mode |
| Enter | Next search match |
| Shift+Enter | Previous search match |

### Edge Cases
- [ ] Open a very large PDF (100+ pages) — app stays responsive
- [ ] Open a PDF with no text (scanned image) — search returns no results, no crash
- [ ] Open a password-protected PDF — shows an error, doesn't crash
- [ ] Try to navigate beyond page limits — buttons are disabled
- [ ] Zoom to minimum (25%) and maximum (400%) — buttons disable at limits
- [ ] Open one PDF, then open another — first document is replaced cleanly

---

## Reporting Issues

If something doesn't work:
1. Note what you did (steps to reproduce)
2. Note what happened vs. what you expected
3. Check the terminal for error messages
4. Create an issue at https://github.com/Woogy7/simplex-pdf/issues
