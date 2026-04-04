---
description: Workflow for fixing bugs in the MyWealth app
---

# Bug Fix Workflow

## 1. Reproduce & Understand
- Read the affected file(s) completely
- Trace the data flow from UI → Store → IPC → VaultManager → File I/O
- Identify root cause vs symptoms

## 2. Check Related Files
- `src/shared/schemas.ts` for type definitions
- `src/shared/types.ts` for IPC channel definitions
- `src/renderer/src/store/useVaultStore.ts` for state management
- `src/main/vault.ts` for backend logic
- `src/preload/index.ts` for IPC bridge

## 3. Implement Fix
- Fix the root cause, not just the symptom
- Preserve existing patterns and code style
- Handle edge cases (empty data, undefined, null)
- Add error handling if missing

## 4. Update Translations
- If any user-facing text was added/changed, update both:
  - `src/renderer/src/locales/en.json`
  - `src/renderer/src/locales/it.json`

## 5. Verify
// turbo
- Run `npm run typecheck` from project root
// turbo
- Run `npm run test` from project root
- Test the fix manually with `npm run dev`

## 6. Regression Check
- Ensure related features still work
- Check both light and dark mode
- Test with both populated and empty data states
