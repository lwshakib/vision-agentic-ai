# Contributing to Vision Agentic AI

Thank you for your interest in contributing to Vision Agentic AI! We welcome contributions from the community to help make this platform even better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🤝 How to Contribute

### Reporting Bugs

- **Search first**: Check existing [Issues](https://github.com/lwshakib/vision-agentic-ai/issues) to see if the bug has already been reported.
- **Open an issue**: If not, create a new issue with a clear description, steps to reproduce, and any relevant logs or screenshots.

### Suggesting Enhancements

- **Feature Requests**: We love new ideas! Open an issue clearly describing the feature, its use case, and any implementation ideas.

### Code Contributions

1. **Fork** the repository.
2. **Clone** your fork to your local machine.
3. **Branch**: Create a new branch for your feature or fix (e.g., `feature/cool-new-tool`).
4. **Develop**: Make your changes, following the [Style Guide](#style-guide).
5. **Test**: Ensure your changes pass all tests and linting checks.
6. **Push**: Push your branch to your fork.
7. **PR**: Open a Pull Request against the main repository.

## 🛠 Development Setup

### Prerequisites

- [Bun](https://bun.sh/) 1.1+ (recommended) or [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/)

### Local Installation

1. **Get the code**:
   ```bash
   git clone https://github.com/lwshakib/vision-agentic-ai.git
   cd vision-agentic-ai
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Environment setup**:
   - Copy `.env.example` to `.env`.
   - Fill in the required API keys (Tavily, Cloudinary, etc.).

4. **Database setup**:
   ```bash
   bun run db:migrate
   ```

5. **Start development server**:
   ```bash
   bun run dev
   ```

### Quality Assurance

Before submitting a PR, please run these commands:

- **Linting**: `bun run lint`
- **Formatting**: `bun run format` (to fix) or `bun run format:check` (to verify)
- **Unit Testing**: `bun run test`
- **E2E Testing**: `bun run test:e2e` (requires local server running)

## 🔄 Pull Request Process

1. **Atomic Commits**: Keep your commits focused and descriptive.
2. **Update Docs**: If you're adding a feature or changing an interface, update the `README.md`.
3. **PR Description**: Clearly describe what your PR does and link any related issues.
4. **Maintenance**: Be prepared to make changes based on maintainer feedback.

## 📏 Style Guide

### Git Commit Messages

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
- Use types like `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
- Example: `feat: add support for real-time speech-to-text`

### Code Style

- Use **Prettier** for formatting and **ESLint** for linting (both integrated into the build process).
- Write clean, type-safe TypeScript code.
- Aim for high test coverage for new logic.

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
