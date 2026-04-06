# M4: Basic Annotations — Implementation Plan

## Tasks

### Task 1: Backend — annotation commands
- Implement text highlight annotation (color, page, rect bounds)
- Implement underline/strikethrough annotations
- Implement freehand drawing (ink annotation with point paths)
- Implement text note annotations (sticky note icon + popup text)
- Save all annotations back to the PDF file

### Task 2: Frontend — annotation toolbar and interaction
- Annotation mode selector in toolbar (highlight, underline, strikethrough, draw, note)
- Color picker for highlight/draw
- Click/drag on page to create annotations
- Render existing annotations as overlays
- Save button to persist annotations to file
