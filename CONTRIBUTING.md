# Contributing to ARGUS

Thank you for your interest in contributing to ARGUS. This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [License](#license)

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/argus.git
   cd argus
   ```
3. Add the upstream repository as a remote:
   ```bash
   git remote add upstream https://github.com/0xhav0c/argus.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Set up Cesium assets:
   ```bash
   npm run setup-cesium
   ```
6. Start the application in development mode:
   ```bash
   npm run dev
   ```

## Development Setup

### Prerequisites

- **Node.js** 18 or higher
- **Python 3** (required for native module compilation)
- **C++ build tools** (e.g., Visual Studio Build Tools on Windows, Xcode CLI on macOS, `build-essential` on Linux)
- **Git**

### Installation

```bash
npm install
npm run setup-cesium
npm run dev
```

The development server supports hot reload for renderer process changes. Main process changes require a restart.

## Project Structure

```
src/
  main/        # Electron main process (backend, IPC handlers, system integration)
  renderer/    # Frontend UI (React components, pages, styles)
  preload/     # Preload scripts (secure bridge between main and renderer)
  shared/      # Shared TypeScript types and interfaces
```

## Making Changes

### Branch Naming

Create a new branch from `main` using the following naming conventions:

- `feature/<short-description>` -- new features
- `fix/<short-description>` -- bug fixes
- `docs/<short-description>` -- documentation changes

```bash
git checkout -b feature/my-new-feature
```

### Coding Standards

- Use **TypeScript** with strict mode enabled.
- Use consistent, descriptive naming for variables, functions, and types.
- Avoid `any` where possible; prefer explicit types or generics.
- Write small, focused commits with clear messages.

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Push your branch to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```
3. Open a pull request against the `main` branch of the upstream repository.
4. Fill in the PR template with:
   - A clear description of the change.
   - The motivation or issue it addresses.
   - Steps to test the change.
   - Screenshots, if applicable.
5. Ensure all CI checks pass.
6. A maintainer will review your PR. Address any requested changes promptly.
7. Once approved, a maintainer will merge the PR.

## Code Style

- **Language:** TypeScript (strict mode).
- **Linting:** ESLint. Run `npm run lint` before submitting.
- **Logging:** Use `argusLog` for all logging. Do not use `console.log` in renderer process code.
- **Formatting:** Follow the existing code style in the repository. Consistent indentation, spacing, and bracket placement are expected.
- **Imports:** Prefer named imports. Group imports by external dependencies, then internal modules.

## Reporting Bugs

Open an issue on GitHub with the following information:

- A clear, descriptive title.
- Steps to reproduce the bug.
- Expected behavior vs. actual behavior.
- Your environment (OS, Node.js version, application version).
- Relevant logs or screenshots.

Search existing issues before opening a new one to avoid duplicates.

## Feature Requests

Feature requests are welcome. Open an issue on GitHub and include:

- A clear description of the proposed feature.
- The problem it solves or the use case it supports.
- Any relevant context, mockups, or examples.

Feature requests will be triaged and discussed by maintainers. There is no guarantee that a request will be implemented, but well-reasoned proposals with community support are prioritized.

## License

By contributing to ARGUS, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE). All submitted code must be compatible with this license.
