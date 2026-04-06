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
- [x] App opens without errors
- [x] Empty state shows "Simplex PDF" title and "Open File" button
- [x] Theme toggle button is visible (shows "Dark", "Light", or "Auto")

### File Opening
- [x] Click "Open" button — native file picker appears
- [x] Select a PDF — document loads, pages appear
- [x] Toolbar shows filename or document title
- [x] Page count shows correctly (e.g. "1 / 5")
- [x] Cancel file picker — nothing crashes

### Page Navigation
- [x] Click right arrow — goes to next page
- [x] Click left arrow — goes to previous page
- [x] Left arrow disabled on page 1
- [x] Right arrow disabled on last page
- [x] Type a page number in the input — jumps to that page - ⚠️ doesn't work at all.
- [x] Arrow keys (Left/Right or Up/Down) navigate pages
- [x] Home key — jumps to first page
- [x] End key — jumps to last page
- [x] PageUp/PageDown — jumps by 10 pages - ⚠️ change to 1 page, same as adobe.

### Continuous Scroll
- [x] All pages render stacked vertically
- [x] Scroll down through the document smoothly
- [x] Page number in toolbar updates as you scroll
- [x] Only visible pages are rendered (check: scroll fast past many pages — no lag)
- [x] Pages that scroll out of view have their renders cached

### Zoom
- [x] Click "+" to zoom in — page gets bigger
- [x] Click "-" to zoom out — page gets smaller
- [x] Click the percentage label (e.g. "100%") — resets to 100%
- [x] Ctrl+= (Ctrl and equals key) zooms in
- [x] Ctrl+- zooms out
- [x] Ctrl+0 resets zoom
- [x] Zoom range: 25% to 400%
- [x] Pages re-render at new zoom level (should look crisp, not blurry) - ⚠️ looks blurry after multiple zooming in and out.

### Page Thumbnails Sidebar
- [x] Sidebar is visible on the left by default
- [x] Thumbnails show small versions of each page
- [x] Click a thumbnail — viewer scrolls to that page
- [x] Current page thumbnail is highlighted with blue border
- [x] Click the hamburger menu button (top-right) — sidebar toggles
- [x] Sidebar hidden — more space for the viewer

### Text Search (Ctrl+F)
- [x] Press Ctrl+F — search bar appears below toolbar - ⚠️ mine worked with ctrl + shift + f.
- [x] Type a word — matches are highlighted on pages in yellow
- [x] Match count shows (e.g. "1 / 15")
- [x] Press Enter — jumps to next match (orange highlight)
- [x] Press Shift+Enter — jumps to previous match - ⚠️ doesn't work 
- [x] Click up/down arrows in search bar — navigates matches
- [x] "Aa" button toggles case-sensitive search
- [x] "W" button toggles whole-word search
- [x] Press Escape — search bar closes, highlights removed
- [x] Search for a word that doesn't exist — shows "No results"
- [x] Search button in toolbar also opens search

### Annotations — Highlight
- [x] Click "H" button in toolbar — enters highlight mode
- [x] Cursor changes to crosshair
- [x] Click and drag on a page — yellow preview rectangle appears
- [x] Release mouse — highlight annotation is created - ⚠️ I don't think this works? I release the mouse, the screen flashes, and then the yellow square disappears. is that the intended behavior?
- [x] Page re-renders showing the highlight
- [x] "H" button is highlighted when in highlight mode
- [x] Click "H" again — exits highlight mode
- [x] Escape key — exits annotation mode

### Annotations — Underline & Strikeout
- [x] Click "U" — enter underline mode, drag to create underline annotation - ⚠️ this doesn't work, same behavior as the highlighting mode, see my note above.
- [x] Click "S" — enter strikeout mode, drag to create strikeout annotation
- [x] Both work the same as highlight but with different visual effect

### Annotations — Sticky Note
- [x] Click "N" — enter note mode
- [x] Click on a page — text prompt appears
- [x] Type text and click OK — sticky note icon appears on page
- [x] Cancel the prompt — no note created

### Annotation Color Picker
- [x] When in any annotation mode, 5 color dots appear in toolbar
- [x] Click a color — selected color gets a border highlight
- [x] Create an annotation — uses the selected color
- [x] Default color is yellow

### Save (Ctrl+S)
- [ ] Make annotations on a PDF
- [ ] Click "Save" button (or press Ctrl+S)
- [ ] Close and reopen the same PDF — annotations are still there
- [ ] **WARNING**: Save overwrites the original file. Use a copy for testing!

### Dark Mode / Theme
- [x] Theme button shows "Dark" — click it, UI switches to dark mode
- [x] Click again — shows "Light", switches to light mode
- [x] Click again — shows "Auto", follows system preference
- [x] Dark mode: dark backgrounds, light text, readable toolbar
- [x] Light mode: white backgrounds, dark text

### Keyboard Shortcuts Summary
| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open file |
| Ctrl+S | Save file |
| Ctrl+F | Open search |
| Ctrl+= | Zoom in |
| Ctrl+- | Zoom out |
| Ctrl+0 | Reset zoom |
| Arrow keys | Scroll in pages |
| Home / End | First / last page |
| PageUp / PageDown | Navigate pages |
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
