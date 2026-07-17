# Contributing to Project Management System

We appreciate your interest in contributing! Please read our contributing guide before opening issues or submitting pull requests.

## Development Workflow

1. Fork the repository and clone your fork.
2. Create a new branch following our naming standard:
   - `feat/feature-name`
   - `fix/issue-description`
   - `docs/documentation-update`
3. Install dependencies in root, client, and backend directories:
   ```bash
   cd client && npm install
   cd ../backend && npm install
   ```
4. Verify tests pass and code compiles with zero lint errors.
5. Submit a pull request targeting `main`.

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new capabilities
- `fix:` for bug fixes
- `docs:` for documentation updates
- `refactor:` for code restructuring without behavioral shifts
- `test:` for adding or updating test cases
- `chore:` for build scripts and auxiliary tools
