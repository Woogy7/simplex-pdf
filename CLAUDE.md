# CLAUDE.md — Simplex PDF Project

## Project Overview
Simplex PDF is an open-source, cross-platform PDF application built with Rust + Tauri v2.
It is a fast, lightweight alternative to Adobe Acrobat with smart form-filling features.

## Tech Stack
- Backend: Rust (2021 edition, latest stable)
- Desktop framework: Tauri v2
- Frontend: React/TypeScript
- Build: Cargo workspaces + Vite
- Target: Linux, macOS, Windows

## Development Commands
- `cargo build` — Build Rust backend
- `cargo test` — Run Rust tests
- `cargo clippy` — Lint Rust code
- `cargo fmt --check` — Check formatting
- `npm run tauri dev` — Run Tauri dev mode (hot reload)
- `npm run tauri build` — Build production binary
- `npm install` — Install frontend dependencies

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
- Frontend: TypeScript strict mode, functional React components, named exports

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

## Project Planning
- All plans, workflows, designs, and todos live in `.planning/`
- Reference `simplex-pdf-spec.md` for the full feature spec
- Development follows phased approach (see spec for phase details)

## Key Decisions Log
- [Decision] Using Tauri v2 over Electron for small binary size and native performance
- [Decision] React/TypeScript chosen for frontend (component-based architecture suits the UI complexity)
- [Decision] Dual MIT/Apache-2.0 license for Rust ecosystem compatibility
- [Decision] SQLite or JSON for local storage (TBD — evaluate during Phase 1)
- [Decision] PDFium or MuPDF for rendering (TBD — evaluate during Phase 1)
