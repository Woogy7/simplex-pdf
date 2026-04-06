# Simplex PDF — Phase 1 Testing Results

**Tested by:** Michael Blake
**Date:** 2026-04-06
**Status:** PASS — all critical features working

## How to Run the App

```bash
cd ~/Projects/simplex-pdf
bash scripts/setup-pdfium.sh   # one-time: downloads PDFium library
npm run tauri dev               # starts dev server + compiles + opens app
```

First build is slow (~2 min with optimized deps). Subsequent builds: 3-7 seconds.

## Results Summary

### App Launch & Empty State — PASS
- [x] App opens without errors
- [x] Empty state shows "Simplex PDF" title and "Open File" button
- [x] Theme toggle button visible

### File Opening — PASS
- [x] Native file picker appears
- [x] PDF loads and pages appear
- [x] Toolbar shows filename
- [x] Page count correct
- [x] Cancel picker — no crash
- [ ] Ctrl+O opens native file picker

### Page Navigation — PASS
- [x] Arrow buttons navigate pages
- [x] Arrow buttons disable at boundaries
- [x] Type page number + Enter to jump
- [x] Keyboard: Home/End, PageUp/PageDown (1 page, Adobe-style)
- [x] Arrow keys scroll page natively

### Continuous Scroll — PASS
- [x] Pages stacked vertically
- [x] Smooth scrolling
- [x] Page number updates on scroll
- [x] Virtualized rendering (no lag on fast scroll)

### Zoom — PASS
- [x] Zoom in/out buttons work
- [x] Reset zoom on percentage click
- [x] Ctrl+=/Ctrl+-/Ctrl+0 shortcuts
- [x] 25% to 400% range
- [x] Pages re-render crisp at new zoom

### Thumbnails Sidebar — PASS
- [x] Thumbnails visible, click to navigate
- [x] Current page highlighted
- [x] Toggle sidebar button works

### Text Search — PASS
- [x] Ctrl+Shift+F opens search (Tauri intercepts plain Ctrl+F)
- [x] Match highlighting (yellow) with current match (orange)
- [x] Match count display
- [x] Enter/arrows navigate matches
- [x] Case-sensitive and whole-word toggles
- [x] Escape closes search
- [x] Scrolls to match position when zoomed in

### Annotations — PASS
- [x] Highlight, underline, strikeout with drag
- [x] Sticky notes with text prompt and hover popup
- [x] 7 color options (yellow, green, blue, red, purple, black, white)
- [x] Colors persist after save and reopen
- [x] Annotations stay visible after save
- [x] Annotations from previous sessions load on file open
- [x] Escape exits annotation mode

### Save — PASS
- [x] Ctrl+S saves annotations to PDF
- [x] Reopen shows saved annotations

### Dark Mode — PASS
- [x] Dark/Light/Auto theme toggle works

## Issues Found and Fixed During Testing
1. PDFium library path — needed full file path, not directory
2. Dev build performance — fixed with opt-level=2 for deps + JPEG encoding
3. Navigation feedback loop — IntersectionObserver fighting programmatic scroll
4. Page input not working — needed local state with Enter/blur commit
5. Search match not visible when zoomed — added scroll-to-match logic
6. Annotations not rendering — switched to CSS overlay approach
7. Save not persisting — fixed file handle conflict with save_to_bytes
8. PDFium segfault on color read — store colors in /Contents field instead
9. Annotations disappearing on save — stopped clearing overlay state
