# Simplex PDF — Project Specification & Claude Code Bootstrap

## Project Overview

**Simplex PDF** is an open-source, cross-platform PDF application built with Rust (backend) and Tauri (desktop framework). It aims to be a fast, lightweight, bloat-free alternative to Adobe Acrobat, with a beautiful clean UI and smart form-filling features.

**Tech Stack:**
- **Backend/Core:** Rust
- **Desktop Framework:** Tauri v2
- **Frontend UI:** HTML/CSS/JavaScript (or React/TypeScript — decide during setup)
- **Target Platforms:** Linux, macOS, Windows
- **License:** MIT OR Apache-2.0 (dual license, standard for Rust ecosystem)

**Developer:** Michael Blake (@Woogy7 on GitHub)
**Development Environment:** Arch Linux (Omarchy/Hyprland), Ghostty terminal, Claude Code

---

## Feature Requirements

### Core Features (MVP — Phase 1)

1. **PDF Viewing**
   - Fast, responsive PDF rendering
   - Smooth scrolling and zooming
   - Page thumbnails sidebar
   - Single page, continuous scroll, and two-page view modes
   - Dark mode / night reading mode
   - Keyboard shortcuts for navigation

2. **Search in Page**
   - Full-text search within the current PDF
   - Highlight all matches
   - Navigate between matches (next/previous)
   - Case-sensitive and whole-word options

3. **Basic Annotations**
   - Highlight text (multiple colours)
   - Underline and strikethrough
   - Freehand drawing / pen tool
   - Text boxes / sticky notes
   - Save annotations back to PDF

### Phase 2 — Form Filling & Smart Fields

4. **Form Filling (Interactive PDF Forms)**
   - Fill interactive PDF form fields (text, checkboxes, radio buttons, dropdowns)
   - Tab between fields
   - Save filled forms

5. **Flat PDF Form Filling** - most common use case.
   - Overlay text onto non-interactive (flat) PDFs
   - Position text fields manually on the page
   - Snap-to-grid and alignment guides

6. **Smart Field Library (Key Differentiator)**
   - Users can save frequently used values (company name, address, registration number, VAT number, contact details, etc.)
   - Categorised field library (Personal, Company, Legal, Custom)
   - Auto-suggest from library when filling forms
   - Remember previously used form field mappings per PDF template
   - "Fill from profile" — one-click populate matching fields
   - Import/export field library (JSON or similar)
   - can be used for flat filling or interactive forms 
   
7. **Saved Signatures**
   - Draw signature with mouse/trackpad/touchscreen
   - Upload signature image
   - Type-to-sign with font options
   - Save multiple signatures (e.g. full signature, initials)
   - Easy drag-and-drop placement onto PDFs
   - Resize and position signatures
   - can be used for flat filling or interactive forms 

### Phase 3 — Page Management & Export

8. **Page Management**
   - Add pages from other PDF files
   - Insert blank pages
   - Delete pages
   - Reorder pages (drag and drop)
   - Rotate pages
   - Split PDF into multiple files
   - Merge multiple PDFs into one

9. **Export**
   - Export PDF to Word (.docx) format
   - Export PDF to Excel (.xlsx) format
   - Export PDF to image (PNG, JPEG)
   - Maintain formatting as faithfully as possible

### Phase 4 — Digital Signing & Advanced

10. **Digital Signing**
    - Sign PDFs with digital certificates
    - Verify existing digital signatures
    - Timestamp signing
    - Certificate management

11. **Additional Features**
    - OCR for scanned PDFs (make searchable)
    - Redaction tool
    - Bookmarks / table of contents navigation
    - Print with options
    - Recent files list
    - File associations (register as default PDF handler on each OS)
    - Drag and drop file opening
    - Command-line interface for batch operations

---

## Non-Functional Requirements

- **Performance:** Must open a 200-page PDF in under 1 second on modern hardware. Scrolling must be smooth at 60fps. Memory usage should stay well below Adobe Acrobat for equivalent files.
- **Binary Size:** Target under 15MB for the installed application.
- **UI/UX:** Clean, modern, minimal. No unnecessary toolbars or ribbon menus. Context-sensitive controls. Beautiful typography and spacing.
- **Accessibility:** Keyboard navigation, screen reader support, high contrast mode.
- **Privacy:** No telemetry, no analytics, no phoning home. All data stays local.
- **Offline:** Fully functional without internet.
- **Auto-update:** Optional update checker (user can disable).

---

## Technical Architecture

### Project Structure

```
simplex-pdf/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, build on push/PR
│   │   ├── release.yml         # Build and publish releases
│   │   └── security-audit.yml  # cargo-audit scheduled run
│   ├── CONTRIBUTING.md
│   ├── CODE_OF_CONDUCT.md
│   ├── SECURITY.md
│   └── PULL_REQUEST_TEMPLATE.md
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── lib.rs              # Library root
│   │   ├── commands/           # Tauri command handlers
│   │   │   ├── mod.rs
│   │   │   ├── file.rs         # Open, save, export
│   │   │   ├── view.rs         # Rendering, zoom, scroll
│   │   │   ├── annotate.rs     # Annotations
│   │   │   ├── forms.rs        # Form filling
│   │   │   ├── pages.rs        # Page management
│   │   │   ├── sign.rs         # Signatures & digital signing
│   │   │   └── search.rs       # Text search
│   │   ├── pdf/                # Core PDF engine
│   │   │   ├── mod.rs
│   │   │   ├── parser.rs       # PDF parsing
│   │   │   ├── renderer.rs     # Page rendering
│   │   │   ├── forms.rs        # Form field detection & filling
│   │   │   ├── annotations.rs  # Annotation handling
│   │   │   ├── pages.rs        # Page manipulation
│   │   │   ├── export.rs       # Export to docx/xlsx/image
│   │   │   ├── search.rs       # Text extraction & search
│   │   │   └── signing.rs      # Digital signatures
│   │   ├── storage/            # Local data persistence
│   │   │   ├── mod.rs
│   │   │   ├── field_library.rs  # Smart field library
│   │   │   ├── signatures.rs     # Saved signatures
│   │   │   ├── recent_files.rs   # Recent files list
│   │   │   └── preferences.rs    # App settings
│   │   └── utils/
│   │       ├── mod.rs
│   │       └── error.rs        # Error types
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── icons/
├── src/                        # Frontend (UI)
│   ├── index.html
│   ├── main.js                 # or main.tsx if React
│   ├── styles/
│   │   ├── main.css
│   │   ├── themes/
│   │   │   ├── light.css
│   │   │   └── dark.css
│   │   └── components/
│   ├── components/             # UI components
│   │   ├── Viewer.js
│   │   ├── Toolbar.js
│   │   ├── Sidebar.js
│   │   ├── SearchBar.js
│   │   ├── FormFiller.js
│   │   ├── FieldLibrary.js
│   │   ├── SignatureManager.js
│   │   └── PageManager.js
│   └── lib/
│       ├── api.js              # Tauri command bindings
│       └── state.js            # Frontend state management
├── tests/
│   ├── fixtures/               # Test PDF files
│   ├── unit/
│   └── integration/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT.md
│   └── USER_GUIDE.md
├── scripts/
│   └── setup.sh                # Dev environment setup
├── .gitignore
├── .editorconfig
├── CLAUDE.md                   # Claude Code project instructions
├── Cargo.toml                  # Workspace root
├── LICENSE-MIT
├── LICENSE-APACHE
├── README.md
├── CHANGELOG.md
└── rustfmt.toml
```

### Key Rust Crates to Evaluate

| Purpose | Crate | Notes |
|---------|-------|-------|
| PDF parsing | `lopdf`, `pdf-rs`, `pdfium-render` | `pdfium-render` wraps Google's PDFium (used in Chrome), most mature renderer |
| PDF rendering | `pdfium-render`, `mupdf-rs` | May need to bundle PDFium or MuPDF library |
| PDF creation/modification | `lopdf`, `printpdf` | For annotations, form filling, page manipulation |
| Image rendering | `image`, `resvg` | For export and thumbnail generation |
| Text search | `pdf-extract`, `pdfium-render` | Text extraction from PDF content streams |
| Digital signatures | `p12`, `x509-parser`, `openssl` | Certificate handling |
| OCR | `tesseract` bindings or `leptonica` | Optional, Phase 4 |
| Local storage | `sled`, `sqlite` (via `rusqlite`), or plain JSON | For field library, preferences |
| Serialization | `serde`, `serde_json` | For data structures |
| Error handling | `thiserror`, `anyhow` | `thiserror` for library, `anyhow` in app |
| Async runtime | `tokio` | Tauri uses tokio |
| Export to DOCX | `docx-rs` | For Word export |
| Export to XLSX | `rust_xlsxwriter` | For Excel export |

### Data Storage Design

The Smart Field Library should use a local SQLite database (via `rusqlite`) or JSON files:

```
~/.config/simplex-pdf/              # Linux (XDG)
~/Library/Application Support/simplex-pdf/  # macOS
%APPDATA%/simplex-pdf/              # Windows

├── config.json                 # App preferences
├── field_library.json          # Smart field library
├── signatures/                 # Saved signature images
│   ├── full_signature.png
│   └── initials.png
├── recent_files.json           # Recent files list
└── form_mappings/              # Per-template field mappings
    └── <hash>.json             # Keyed by PDF template hash
```

### Field Library Schema (Example)

```json
{
  "version": 1,
  "categories": [
    {
      "name": "Company",
      "fields": [
        { "label": "Company Name", "value": "Fastell Industrial Supplies (Pty) Ltd", "tags": ["company", "name"] },
        { "label": "Registration Number", "value": "2012/224564/07", "tags": ["company", "reg"] },
        { "label": "Company Address", "value": "Sebenza, Edenvale, Johannesburg", "tags": ["address"] },
        { "label": "VAT Number", "value": "...", "tags": ["vat", "tax"] }
      ]
    },
    {
      "name": "Personal",
      "fields": [
        { "label": "Full Name", "value": "Michael Blake", "tags": ["name"] },
        { "label": "Email", "value": "...", "tags": ["email", "contact"] }
      ]
    }
  ]
}
```

---

## CLAUDE.md (Claude Code Instructions)

```markdown
# CLAUDE.md — Simplex PDF Project

## Project Overview
Simplex PDF is an open-source, cross-platform PDF application built with Rust + Tauri v2.
It is a fast, lightweight alternative to Adobe Acrobat with smart form-filling features.

## Tech Stack
- Backend: Rust (2021 edition, latest stable)
- Desktop framework: Tauri v2
- Frontend: [React/TypeScript or Vanilla JS — TBD]
- Build: Cargo workspaces
- Target: Linux, macOS, Windows

## Development Commands
- `cargo build` — Build Rust backend
- `cargo test` — Run Rust tests
- `cargo clippy` — Lint Rust code
- `cargo fmt --check` — Check formatting
- `npm run tauri dev` — Run Tauri dev mode (hot reload)
- `npm run tauri build` — Build production binary

## Code Style & Standards
- Follow Rust 2021 edition idioms
- Use `rustfmt` with project config (see `rustfmt.toml`)
- Use `clippy` with `#![warn(clippy::all, clippy::pedantic)]`
- Error handling: `thiserror` for library errors, `anyhow` in application code
- All public functions must have doc comments
- All modules must have module-level doc comments
- Write unit tests for all core PDF operations
- Integration tests go in `tests/` directory
- Use meaningful variable names — no single-letter names except iterators
- Prefer `impl Trait` over `dyn Trait` where possible
- Use `#[must_use]` on functions that return values that shouldn't be ignored
- No `unwrap()` in production code — use proper error handling
- No `unsafe` without a safety comment explaining why it's necessary

## Architecture Principles
- Core PDF engine (`src-tauri/src/pdf/`) must be independent of Tauri
- All Tauri commands in `src-tauri/src/commands/` are thin wrappers
- Frontend communicates with backend exclusively via Tauri commands
- Local data stored in platform-appropriate config directories
- No network calls — the app is fully offline
- No telemetry or analytics

## Git Conventions
- Branch naming: `feature/description`, `fix/description`, `docs/description`
- Commit messages: Conventional Commits format
  - `feat: add PDF text search`
  - `fix: correct form field tab order`
  - `docs: update README installation section`
  - `refactor: extract annotation module`
  - `test: add form filling integration tests`
  - `chore: update dependencies`
- Keep commits atomic and focused
- Squash merge feature branches

## Testing Requirements
- Unit test coverage for all PDF parsing and manipulation
- Integration tests with real PDF fixtures in `tests/fixtures/`
- Test with various PDF versions (1.4 through 2.0)
- Test with both interactive and flat form PDFs
- Test cross-platform path handling
- Benchmark rendering performance for regression detection

## Key Decisions Log
- [Decision] Using Tauri v2 over Electron for small binary size and native performance
- [Decision] Dual MIT/Apache-2.0 license for Rust ecosystem compatibility
- [Decision] SQLite or JSON for local storage (TBD — evaluate during Phase 1)
- [Decision] PDFium or MuPDF for rendering (TBD — evaluate during Phase 1)
```

---

## GitHub Repository Setup

### README.md Structure

```markdown
# Simplex PDF

A fast, lightweight, open-source PDF reader and editor built with Rust.

[![CI](https://github.com/Woogy7/simplex-pdf/actions/workflows/ci.yml/badge.svg)](...)
[![License](https://img.shields.io/badge/license-MIT%2FApache--2.0-blue.svg)](...)

## Features

- ⚡ Blazing fast PDF viewing and navigation
- 📝 Annotations (highlight, underline, notes, freehand)
- 📋 Form filling for interactive and flat PDFs
- 🧠 Smart field library — save and reuse common form values
- ✍️ Saved signatures with easy placement
- 📄 Page management (merge, split, reorder, rotate)
- 🔍 In-document search
- 📤 Export to Word, Excel, and image formats
- 🔐 Digital signing with certificates
- 🌙 Dark mode
- 🖥️ Cross-platform (Linux, macOS, Windows)
- 🔒 Fully offline — no telemetry, no tracking

## Installation

### Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/Woogy7/simplex-pdf/releases) page.

**Linux:**
- `.deb` package (Debian/Ubuntu)
- `.AppImage` (universal)
- `.rpm` package (Fedora/RHEL)
- AUR package (Arch Linux) — `yay -S simplex-pdf`

**macOS:**
- `.dmg` installer

**Windows:**
- `.msi` installer
- Portable `.zip`

### Building from Source

#### Prerequisites
- Rust (latest stable) — install via [rustup](https://rustup.rs)
- Node.js (v18+) and npm
- Platform-specific Tauri dependencies:
  - **Linux:** `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Microsoft Visual Studio C++ Build Tools, WebView2

#### Build Steps
\```bash
git clone https://github.com/Woogy7/simplex-pdf.git
cd simplex-pdf
npm install
npm run tauri build
\```

The built application will be in `src-tauri/target/release/`.

## Development

\```bash
# Start development mode with hot reload
npm run tauri dev

# Run tests
cargo test

# Lint
cargo clippy
cargo fmt --check
\```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development guidelines.

## Roadmap

- [x] Phase 1: PDF viewing, search, basic annotations
- [ ] Phase 2: Form filling, smart field library, saved signatures
- [ ] Phase 3: Page management, export to Word/Excel
- [ ] Phase 4: Digital signing, OCR, CLI tools

## Contributing

Contributions are welcome! Please read our [Contributing Guide](.github/CONTRIBUTING.md) and [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## License

Licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT License ([LICENSE-MIT](LICENSE-MIT))

at your option.

## Acknowledgements

Built with [Rust](https://rust-lang.org) and [Tauri](https://tauri.app).
```

### GitHub Issue Templates

**Bug Report (.github/ISSUE_TEMPLATE/bug_report.md):**
- Summary, steps to reproduce, expected vs actual, platform/OS, PDF file (if shareable), screenshots

**Feature Request (.github/ISSUE_TEMPLATE/feature_request.md):**
- Problem description, proposed solution, alternatives considered, additional context

### GitHub Actions CI (.github/workflows/ci.yml)

Should include:
- `cargo fmt --check` — formatting
- `cargo clippy -- -D warnings` — linting
- `cargo test` — unit and integration tests
- `npm run tauri build` — verify it compiles on Linux, macOS, Windows (matrix build)
- `cargo audit` — security vulnerability check (scheduled weekly)

### Branch Protection Rules

- Require PR reviews before merging
- Require CI to pass before merging
- Require up-to-date branches
- No force pushes to `main`

---

## Open Source Conventions Checklist

- [x] **LICENSE-MIT** — MIT license text
- [x] **LICENSE-APACHE** — Apache 2.0 license text
- [x] **README.md** — Project description, installation, usage, contributing, license
- [x] **CHANGELOG.md** — Keep a changelog (https://keepachangelog.com)
- [x] **CONTRIBUTING.md** — How to contribute, code style, PR process
- [x] **CODE_OF_CONDUCT.md** — Contributor Covenant v2.1
- [x] **SECURITY.md** — How to report security vulnerabilities
- [x] **.gitignore** — Rust + Node + Tauri ignores
- [x] **.editorconfig** — Consistent editor settings
- [x] **rustfmt.toml** — Rust formatting config
- [x] **Issue templates** — Bug report, feature request
- [x] **PR template** — Description, testing, checklist
- [x] **CI/CD** — GitHub Actions for build, test, lint, release
- [x] **Conventional Commits** — Standardised commit messages
- [x] **Semantic Versioning** — Start at 0.1.0, follow semver
- [x] **DCO or CLA** — Developer Certificate of Origin (lightweight, use `Signed-off-by`)

---

## Development Phases Summary

| Phase | Scope | Goal |
|-------|-------|------|
| **Phase 1** | Viewing, search, basic annotations | Ship a usable fast PDF viewer |
| **Phase 2** | Form filling (interactive + flat), smart field library, saved signatures | The differentiator — smart forms |
| **Phase 3** | Page management (merge/split/reorder), export to DOCX/XLSX/image | Full document workflow |
| **Phase 4** | Digital signing, OCR, redaction, CLI, file associations | Enterprise and power user features |

### Phase 1 Milestones (Suggested)

1. Tauri v2 project scaffold with CI/CD
2. PDF loading and basic page rendering (evaluate PDFium vs MuPDF)
3. Smooth scrolling and zoom
4. Page thumbnails sidebar
5. Text search with highlighting
6. Basic annotations (highlight, text notes)
7. Save annotations to PDF
8. Dark mode / theme support
9. Keyboard shortcuts
10. First alpha release

---

## Getting Started with Claude Code

To bootstrap this project, run these commands:

```bash
# 1. Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Install Tauri CLI
cargo install create-tauri-app

# 3. Create the project
cargo create-tauri-app simplex-pdf

# 4. Navigate to project and start Claude Code
cd simplex-pdf
claude

# 5. Feed this spec file to Claude Code
# In Claude Code: "Read simplex-pdf-spec.md and help me set up the project structure"
```

---

*This specification was prepared for bootstrapping with Claude Code. Copy this file to your project directory and reference it as the source of truth for features, architecture, and conventions.*
