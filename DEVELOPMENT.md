# Project Management System — Development Guide

This repository contains the web client and backend for the Project Management System. Use this guide as a starting point when setting up a local development environment.

## Repository layout

- `backend/` — API server and backend application code.
- `client/` — React/Vite web application.
- `package-lock.json` and `package.json` — root Node.js dependency metadata.
- `prd.txt` — product requirements and architecture notes.

## Before you start

- Install a currently supported Node.js LTS release compatible with each workspace.
- Use the lockfiles committed for the relevant workspace and prefer `npm ci` for reproducible installs.
- Keep local environment files and credentials out of source control. Configure secrets using your own local environment or deployment secret manager.

## Suggested verification workflow

1. Install dependencies from the relevant project directory using its committed lockfile.
2. Run the scripts defined by that directory's `package.json`; do not assume a root script exists for backend or client checks.
3. Run the available tests and build/type checks before opening a pull request.
4. Review the final diff to ensure generated files, local databases, logs, and secrets are not included.

## Configuration and security

Check each workspace's example environment files and documentation before configuring services. Never commit production tokens, JWT secrets, database credentials, or real user data. Rotate any credential that is accidentally exposed.

## Contribution checklist

- Keep changes focused and consistent with the existing project structure.
- Update relevant documentation when behavior or setup instructions change.
- Describe manual testing honestly in the pull request, including checks that could not be run.
