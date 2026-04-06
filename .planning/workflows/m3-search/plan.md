# M3: Text Search — Implementation Plan

## Tasks

### Task 1: Backend — text search command
- Use pdfium-render's text extraction + search API
- Implement `search_text` command: query string, returns list of matches (page index, match index, rect bounds)
- Support case-sensitive and whole-word options
- Return match count and match positions per page

### Task 2: Frontend — search bar and match navigation
- SearchBar component with input, match count, prev/next buttons
- Case-sensitive and whole-word toggles
- Ctrl+F keyboard shortcut to open search
- Escape to close search
- Navigate between matches (jump to page, highlight current match)

### Task 3: Render match highlights
- Pass search results to Viewer
- Draw highlight overlays on rendered pages at match positions
- Current match styled differently from other matches
