---
description: Workflow for improving code quality, stability, and performance
---

# Quality Improvement Workflow

## 1. Identify Issues
Scan for common problems:
- Duplicated code (DRY violations)
- Dead code (unreachable returns, unused imports)
- Hardcoded values (magic numbers, untranslated strings)
- Missing error handling (async without try/catch)
- Performance anti-patterns (`.find()` in loops, missing memoization)
- Inconsistent patterns across similar components

## 2. Prioritize
Priority order:
1. **Bugs** (wrong behavior) — fix immediately
2. **Data integrity** (potential data loss/corruption) — fix immediately
3. **Performance** (slow operations, excessive re-renders)
4. **DRY violations** (code duplication)
5. **Polish** (animations, transitions, micro-interactions)

## 3. Common Patterns to Fix

### Store Actions
- Every async action should follow: `set loading → try/catch → api call → optimistic update → finally set !loading`
- Never call `refreshData()` if you can do an optimistic update instead

### Component Re-renders
- Use Zustand selectors to pick individual state slices: `useVaultStore(state => state.accounts)`
- Never destructure the entire store: `const store = useVaultStore()` ❌
- Memoize derived data with `useMemo`, handlers with `useCallback`

### IPC Calls
- All IPC calls go through `window.api.*` (defined in preload)
- Never call `ipcRenderer` directly from components
- Handle errors with user-friendly toast messages

### File I/O (Main Process)
- Always validate with Zod before writing
- Use atomic writes (write to temp + rename) for critical data
- Log errors with the LoggerService

## 4. Verify
// turbo  
- `npm run typecheck`
// turbo
- `npm run test`
- Manual smoke test with `npm run dev`
