# Architecture — Simplex PDF

## Overview

```
+-------------------+     Tauri IPC     +-------------------+
|    Frontend       | <===============> |    Rust Backend    |
|  React/TypeScript |                   |                   |
|                   |                   | commands/ (thin)   |
|  Components:      |                   |    |               |
|  - Viewer         |                   |    v               |
|  - Toolbar        |                   | pdf/ (core engine) |
|  - Sidebar        |                   | storage/ (local)   |
|  - SearchBar      |                   | utils/ (errors)    |
|  - FormFiller     |                   |                   |
|  - FieldLibrary   |                   |                   |
|  - SignatureManager                   |                   |
|  - PageManager    |                   |                   |
+-------------------+                   +-------------------+
```

## Layers

### Frontend (src/)
React/TypeScript UI. Communicates with backend exclusively via Tauri `invoke()` commands. No direct file system or PDF library access.

### Commands (src-tauri/src/commands/)
Thin wrappers that translate Tauri IPC calls into core engine operations. No business logic here — just argument validation and delegation.

### Core PDF Engine (src-tauri/src/pdf/)
Independent of Tauri. Can be tested and used without the desktop framework. All PDF parsing, rendering, manipulation, and export logic lives here.

### Storage (src-tauri/src/storage/)
Local data persistence using platform-appropriate config directories. Manages field library, saved signatures, recent files, and app preferences.

### Utils (src-tauri/src/utils/)
Shared error types and utilities.

## Data Flow

1. User action in frontend (e.g., open file)
2. Frontend calls `invoke("open_file", { path })` via Tauri IPC
3. Command handler in `commands/file.rs` receives the call
4. Command delegates to `pdf/parser.rs` for actual work
5. Result flows back through Tauri IPC to frontend
6. Frontend updates React state and re-renders

## Local Storage

```
~/.config/simplex-pdf/        (Linux, XDG)
~/Library/Application Support/ (macOS)
%APPDATA%/                     (Windows)
  config.json
  field_library.json
  signatures/
  recent_files.json
  form_mappings/<hash>.json
```
