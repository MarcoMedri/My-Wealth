---
description: Workflow for validating code quality and running tests
---

# Typecheck & Test Workflow

// turbo-all

## 1. TypeScript Typecheck
```bash
npm run typecheck
```
This runs both `typecheck:node` (main process) and `typecheck:web` (renderer).

## 2. Unit Tests
```bash
npm run test
```
Tests are located in `src/__tests__/` and use Vitest.

## 3. Lint
```bash
npm run lint
```

## 4. Production Build (optional, for release validation)
```bash
npm run build
```
This will run typecheck + vite build for all three targets (main, preload, renderer).

## 5. Bundle Analysis (optional)
```bash
npm run build:analyze
```
Opens a visual bundle size report.

## Notes
- Test files follow the pattern `src/__tests__/**/*.test.ts`
- Coverage is collected with `@vitest/coverage-v8`
- ESLint config is in `.eslintrc.cjs`
- Prettier config is in `.prettierrc.yaml`
