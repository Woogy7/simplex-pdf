# M2: Navigation & Viewing — Implementation Plan

## Overview
Add smooth scrolling, zoom, page thumbnails sidebar, view modes,
and keyboard shortcuts for a polished viewing experience.

## Tasks

### Task 1: Zoom controls and keyboard navigation
- Add zoom state to App (scale factor: 0.5x to 4.0x, default 1.0x)
- Toolbar zoom buttons (zoom in/out/fit width/fit page/reset)
- Pass scale to render_page command
- Keyboard shortcuts: Ctrl+/Ctrl- for zoom, arrow keys for pages, Home/End

**Files:** `src/App.tsx`, `src/components/Toolbar.tsx`, `src/components/Viewer.tsx`, `src/lib/api.ts`
**Done when:** Can zoom in/out with buttons and keyboard, pages render at different scales

### Task 2: Continuous scroll mode with virtualized rendering
- Render multiple pages stacked vertically
- Only render visible pages + 1 page buffer above/below
- Scroll position tracks current page
- Page gap between pages

**Files:** `src/components/Viewer.tsx`, `src/styles/main.css`
**Done when:** Can scroll through entire document smoothly without loading all pages at once

### Task 3: Page thumbnails sidebar
- Sidebar component showing small page thumbnails
- Click thumbnail to jump to page
- Highlight current page
- Toggle sidebar visibility
- Render thumbnails at low DPI for performance

**Files:** `src/components/Sidebar.tsx`, `src/App.tsx`, `src/styles/main.css`
**Done when:** Sidebar shows clickable thumbnails, current page highlighted

### Task 4: View modes
- Single page mode (current behavior)
- Continuous scroll mode (Task 2)
- Two-page mode (side by side)
- Mode selector in toolbar

**Files:** `src/App.tsx`, `src/components/Toolbar.tsx`, `src/components/Viewer.tsx`
**Done when:** Can switch between all three view modes
