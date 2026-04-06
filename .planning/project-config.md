# Project Config — Simplex PDF

## Stack
- **Backend:** Rust 2021 edition
- **Framework:** Tauri v2
- **Frontend:** React 19 + TypeScript (Vite 6)
- **Testing:** `cargo test` (Rust), Vitest (frontend — TBD)
- **Linting:** `cargo clippy` + `cargo fmt`, TypeScript strict mode
- **Package manager:** npm

## Key Paths
- Rust source: `src-tauri/src/`
- Frontend source: `src/`
- Tests: `tests/` (integration), `src-tauri/src/` (unit, inline)
- Test fixtures: `tests/fixtures/`
- Spec document: `simplex-pdf-spec.md`

## Conventions
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Branch naming: `feature/`, `fix/`, `docs/`
- No `unwrap()` in production Rust code
- `thiserror` for library errors, `anyhow` in app code
- All public APIs documented with doc comments
