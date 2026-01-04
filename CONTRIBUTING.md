# Contributing to My Wealth

First off, thank you for considering contributing to My Wealth! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/My-Wealth.git
   cd My-Wealth
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When creating a bug report, include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment (OS, app version)

### Suggesting Features

Feature requests are welcome! Please provide:
- A clear description of the feature
- The problem it solves
- Any alternative solutions you've considered

### Code Contributions

We welcome code contributions for:
- Bug fixes
- New features
- Documentation improvements
- Performance optimizations
- Test coverage improvements

## Pull Request Process

1. **Ensure your code passes all checks**:
   ```bash
   npm run typecheck   # TypeScript check
   npm run lint        # ESLint
   npm run test        # Unit tests
   ```

2. **Update documentation** if needed

3. **Follow the commit message convention**:
   ```
   type(scope): description
   
   Types: feat, fix, docs, style, refactor, test, chore
   
   Examples:
   feat(investments): add dividend tracking
   fix(accounts): correct balance calculation
   docs: update README with new features
   ```

4. **Create a Pull Request** with:
   - A clear title and description
   - Reference to any related issues
   - Screenshots for UI changes

5. **Wait for review** - maintainers will review your PR and may request changes

## Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Define types/interfaces for all props and state
- Use Zod schemas for runtime validation

### React

- Prefer functional components with hooks
- Use meaningful component names
- Keep components focused and single-purpose

### CSS (Tailwind)

- Use Tailwind utility classes
- Follow the existing color scheme (CSS variables in `index.css`)
- Ensure responsive design for all components

### File Organization

```
src/
├── main/           # Electron main process
├── preload/        # Preload scripts
├── renderer/       # React frontend
│   ├── components/ # UI components
│   ├── hooks/      # Custom React hooks
│   ├── store/      # Zustand stores
│   └── lib/        # Utilities
└── shared/         # Shared types and schemas
```

### Testing

- Write tests for new features
- Maintain existing test coverage
- Use Vitest for unit tests

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/main` | Electron main process, IPC handlers, file management |
| `src/renderer` | React application, UI components |
| `src/shared` | Shared types, Zod schemas, constants |
| `src/__tests__` | Unit tests |

## Community

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion
- **Pull Requests**: For code contributions

---

Thank you for contributing! 🙏
