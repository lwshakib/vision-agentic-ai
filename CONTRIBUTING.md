# Contributing to Vision Agentic AI

First off, thank you for considering contributing to Vision Agentic AI! We appreciate your time and effort to make this project better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#-getting-started)
- [How to Contribute](#-how-to-contribute)
- [Reporting Bugs](#-reporting-bugs)
- [Suggesting Enhancements](#-suggesting-enhancements)
- [Your First Code Contribution](#-your-first-code-contribution)
- [Pull Request Process](#-pull-request-process)
- [Development Setup](#-development-setup)
- [Style Guide](#-style-guide)
- [License](#license)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🤝 Getting Started

1. **Fork** the repository on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. **Push** your work back up to your fork
5. Submit a **Pull Request** so we can review your changes

## 💡 How to Contribute

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/lwshakib/vision-agentic-ai/issues)
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/lwshakib/vision-agentic-ai/issues/new). Be sure to include:
  - A clear title and description
  - As much relevant information as possible
  - A code sample or an executable test case demonstrating the issue

### Suggesting Enhancements

- Use the GitHub issue tracker to submit feature requests
- Clearly describe the enhancement and why it would be useful
- Include any relevant code, screenshots, or documentation

## 🚀 Your First Code Contribution

1. **Set up the development environment**

   ```bash
   git clone https://github.com/your-username/vision-agentic-ai.git
   cd vision-agentic-ai
   bun install
   ```

2. **Create a new branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**

   - Follow the project's coding standards
   - Update documentation as needed

4. **Commit your changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to [Pull Requests](https://github.com/lwshakib/vision-agentic-ai/pulls)
   - Click "New Pull Request"
   - Select your branch and submit the PR

## 🔄 Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md with details of changes to the interface, including new environment variables, exposed ports, useful file locations, and container parameters.
3. The PR will be reviewed by the maintainers and may require changes before being merged.

## 🛠 Development Setup

### Prerequisites

- Node.js 18+
- Bun
- Git

### Installation

1. Clone the repository
2. Install dependencies: `bun install`
3. Copy `.env.example` to `.env` and update the values
4. Run the development server: `bun run dev`

## 📏 Style Guide

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally
- Consider starting the commit message with an applicable emoji:
  - 🎨 `:art:` when improving the format/structure of the code
  - 🐛 `:bug:` when fixing a bug
  - 🔥 `:fire:` when removing code or files
  - ✨ `:sparkles:` when adding new features

### Code Style

- Follow the existing code style in the project
- Use Prettier for code formatting
- Use ESLint for code linting
- Write clear, self-documenting code with appropriate comments

## 📄 License

By contributing, you agree that your contributions will be licensed under its MIT License.
