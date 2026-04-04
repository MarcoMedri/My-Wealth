---
description: Workflow for safe refactoring in MyWealth
---

# Refactoring Workflow

## 1. Scope Analysis
- Identify ALL consumers of the code being refactored
- Use `grep` to find all imports and usages across the codebase
- Document the current behavior as a baseline

## 2. Safety Checks
// turbo
- Run `npm run typecheck` BEFORE starting — establish baseline
// turbo
- Run `npm run test` BEFORE starting — establish baseline
- Note any pre-existing errors

## 3. Principles
- **One change at a time**: Don't mix refactoring with feature additions
- **Preserve interfaces**: External API (IPC channels, store interface) should NOT change unless explicitly intended
- **Backward compatible**: Data files (JSON vault) must remain readable
- **No silent behavior changes**: If logic changes, it must be intentional and documented

## 4. Key Architecture Constraints
- **Main Process** (`src/main/`): Node.js, no DOM, no React
- **Renderer** (`src/renderer/`): React, no Node.js, no fs
- **Shared** (`src/shared/`): Pure TypeScript, no platform-specific code
- **Preload** (`src/preload/`): Bridge between main and renderer via IPC
- **Communication**: Renderer ↔ Main ONLY via IPC (defined in `src/shared/types.ts`)

## 5. Vault Data Rules
- All monetary values are stored as **integers in centesimi** (€10.99 → 1099)
- All dates are ISO 8601
- All IDs are UUID v4
- Files must include `version` field for future migrations
- Zod schemas in `src/shared/schemas.ts` are the source of truth for types

## 6. Execute Refactoring
- Move code in small, verifiable steps
- After each step:
  // turbo  
  - Run `npm run typecheck`
- Maintain re-exports for backward compatibility when moving files

## 7. Final Verification
// turbo
- Run `npm run typecheck` — must pass with 0 errors
// turbo
- Run `npm run test` — must pass same tests as baseline
// turbo
- Run `npm run build` — must produce a clean production build
- Quick manual test with `npm run dev`
