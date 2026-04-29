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

Follow these step-by-step instructions to contribute code to the repository:

1. **Fork the repository**: Click the "Fork" button at the top right of this page to create your own copy of the project under your GitHub account.

2. **Clone your fork**:
   Clone the forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/vision-agentic-ai.git
   cd vision-agentic-ai
   ```

3. **Set up the upstream remote**:
   Link your local repository to the original repository to keep it in sync:
   ```bash
   git remote add upstream https://github.com/lwshakib/vision-agentic-ai.git
   ```

4. **Fetch and sync with upstream**:
   Make sure you are on the `main` branch and it is up to date before starting any new work:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```

5. **Create a branch**:
   Create a new branch for your feature or bug fix. Use a descriptive name:
   ```bash
   git checkout -b feature/cool-new-tool
   ```

6. **Develop**:
   Make your changes, ensuring you follow our [Style Guide](#style-guide).

7. **Lint and Format**:
   Ensure your changes follow the style guide and pass all formatting checks:
   ```bash
   bun run format
   bun run lint
   ```

8. **Commit your changes**:
   Commit your changes using Conventional Commits. Keep commits atomic and descriptive:
   ```bash
   git add .
   git commit -m "feat: add support for real-time speech-to-text"
   ```

9. **Push to your fork**:
   Push the changes to your remote branch:
   ```bash
   git push origin feature/cool-new-tool
   ```

10. **Create a Pull Request (PR)**:
    - Go to the original repository (`lwshakib/vision-agentic-ai`).
    - Click on "Compare & pull request".
    - Clearly describe what your PR does, the problem it solves, and link any related issues.
    - Submit the PR for review!

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
   - Fill in the required API keys (Google AI, Deepgram, Tavily, Resend, etc.).

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

## 📄 License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
