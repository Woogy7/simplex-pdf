# Contributing to Simplex PDF

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Rust](https://rustup.rs) (latest stable)
- [Node.js](https://nodejs.org) v18+ and npm
- Platform-specific Tauri v2 dependencies (see [README](../README.md#prerequisites))

## Development Setup

```bash
# Clone the repo
git clone https://github.com/Woogy7/simplex-pdf.git
cd simplex-pdf

# Install frontend dependencies
npm install

# Start development mode with hot reload
npm run tauri dev
```

## Code Style

### Rust

- Format with `rustfmt` — run `cargo fmt` before committing
- Lint with `clippy` — run `cargo clippy -- -D warnings`
- No `unwrap()` in production code; use proper error handling (`?`, `anyhow`, `thiserror`)
- Write doc comments for all public items
- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)

### TypeScript / React

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use named exports
- Keep components focused and small
- Follow existing patterns in the codebase

### General

- No compiler/linter warnings
- Write tests for new functionality
- Keep functions short and focused

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `ci` | CI/CD changes |

**Examples:**

```
feat(viewer): add page zoom controls
fix(annotations): prevent highlight overlap on rotated pages
docs: update build instructions for Windows
```

## Pull Request Process

1. **Fork and branch** — Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** — Write code, tests, and documentation.

3. **Verify locally:**
   ```bash
   cargo fmt --check
   cargo clippy -- -D warnings
   cargo test
   ```

4. **Push and open a PR** — Fill out the PR template completely.

5. **Respond to review** — Address feedback promptly.

### PR Guidelines

- Keep PRs focused — one feature or fix per PR
- Include screenshots for UI changes
- Update documentation if behavior changes
- Ensure CI passes before requesting review

## Reporting Issues

### Bug Reports

Use the [Bug Report](https://github.com/Woogy7/simplex-pdf/issues/new?template=bug_report.md) template. Include:

- Clear steps to reproduce
- Expected vs actual behavior
- OS, app version, and relevant PDF file details

### Feature Requests

Use the [Feature Request](https://github.com/Woogy7/simplex-pdf/issues/new?template=feature_request.md) template. Describe:

- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

## Security Issues

Please report security vulnerabilities privately. See [SECURITY.md](SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the same dual license as the project: MIT OR Apache-2.0.
