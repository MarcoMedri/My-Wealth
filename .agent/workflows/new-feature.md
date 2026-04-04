---
description: Workflow for adding new features to MyWealth (project-specific, overrides global)
---

# New Feature Implementation — MyWealth

## 1. Understand & Plan
- Identify ALL screens, data flows, and state slices involved
- Check docs: `docs/ARCHITECTURE.md`, `docs/app-structure.md`
- Determine if new IPC channels are needed

## 2. Define Data Layer (bottom-up)

### 2a. Schema (`src/shared/schemas.ts`)
- Add Zod schema for the new entity
- Export the inferred TypeScript type
- Add file schema wrapper (e.g., `MyEntityFileSchema`)
- All monetary values must be integers in centesimi
- All IDs must be UUID v4

### 2b. Types (`src/shared/types.ts`)
- Add new IPC channel constants to `IPC_CHANNELS`
- Add vault structure constants if new files are introduced

### 2c. Preload (`src/preload/index.ts`)
- Expose new IPC handlers in the renderer API
- Update type definitions in `src/preload/index.d.ts`

## 3. Build Backend

### 3a. Repository (optional, `src/main/repositories/`)
- Extend `BaseRepository` if the entity needs standalone CRUD
- Alternatively, add methods directly to VaultManager

### 3b. Service (optional, `src/main/services/`)
- Encapsulate business logic separate from data access

### 3c. VaultManager (`src/main/vault.ts`)
- Add load method for the new JSON file
- Add save/delete methods
- Use atomic writes pattern: write to `.tmp` + rename

### 3d. IPC Handlers (`src/main/index.ts`)
- Register `ipcMain.handle()` for each new channel

## 4. Build Frontend

### 4a. Store (`src/renderer/src/store/useVaultStore.ts`)
- Add state slice for the new entity array
- Add CRUD actions with optimistic updates
- Add selectors for derived state

### 4b. Components (`src/renderer/src/components/[feature]/`)
- Dashboard view with KPI cards, charts, table
- Add/Edit modal with form validation
- Empty state using `<EmptyState>`
- Loading state using skeletons

### 4c. Navigation
- Add nav item in `Sidebar.tsx`
- Add route in `App.tsx` (lazy loaded)
- Add command to `CommandPalette`

## 5. Translations
- Add ALL user-facing strings to:
  - `src/renderer/src/locales/en.json`
  - `src/renderer/src/locales/it.json`

## 6. Handle All States
Every view MUST handle:
- ✅ Loading (skeleton)
- ✅ Empty (EmptyState component)
- ✅ Error (inline error with retry)  
- ✅ Success (normal render)

## 7. Verify
// turbo
- `npm run typecheck`
// turbo
- `npm run test`
- `npm run dev` → manual test with real data
- Test dark mode + light mode
- Test with 0 items, 1 item, many items
