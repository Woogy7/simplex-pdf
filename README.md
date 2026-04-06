# Simplex PDF

A fast, lightweight, open-source PDF reader and editor built with Rust.

## Features

- Fast PDF viewing and navigation
- Annotations (highlight, underline, notes, freehand)
- Form filling for interactive and flat PDFs
- Smart field library — save and reuse common form values
- Saved signatures with easy placement
- Page management (merge, split, reorder, rotate)
- In-document search
- Export to Word, Excel, and image formats
- Digital signing with certificates
- Dark mode
- Cross-platform (Linux, macOS, Windows)
- Fully offline — no telemetry, no tracking

## Installation

### Pre-built Binaries

Download the latest release from the [Releases](https://github.com/Woogy7/simplex-pdf/releases) page.

### Building from Source

#### Prerequisites
- Rust (latest stable) — install via [rustup](https://rustup.rs)
- Node.js (v18+) and npm
- Platform-specific Tauri dependencies:
  - **Linux:** `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS:** Xcode Command Line Tools
  - **Windows:** Microsoft Visual Studio C++ Build Tools, WebView2

#### Build Steps

```
git clone https://github.com/Woogy7/simplex-pdf.git
cd simplex-pdf
npm install
npm run tauri build
```

The built application will be in `src-tauri/target/release/`.

## Development

```
# Start development mode with hot reload
npm run tauri dev

# Run tests
cargo test

# Lint
cargo clippy
cargo fmt --check
```

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development guidelines.

## Roadmap

- [ ] Phase 1: PDF viewing, search, basic annotations
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
