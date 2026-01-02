# MyWealth Architecture

## Overview

MyWealth is an Electron-based personal finance management application built with:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js (Electron main process)
- **Storage**: Local JSON files (no external database)
- **State Management**: Zustand

---

## Directory Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # Entry point, IPC handlers
│   ├── vault.ts            # VaultManager - data persistence
│   ├── investments.ts      # Yahoo Finance integration
│   ├── seed.ts             # Demo data generation
│   ├── repositories/       # Data access layer
│   └── services/           # Business logic layer
├── renderer/               # React frontend
│   └── src/
│       ├── components/     # React components
│       │   ├── ui/         # Atomic UI components
│       │   ├── forms/      # Form-specific components
│       │   └── [feature]/  # Feature modules
│       ├── hooks/          # Custom React hooks
│       ├── store/          # Zustand store
│       ├── locales/        # i18n translations
│       └── lib/            # Utilities
├── shared/                 # Shared between main/renderer
│   ├── schemas.ts          # Zod schemas & types
│   ├── types.ts            # TypeScript interfaces
│   ├── constants.ts        # Magic numbers & enums
│   ├── currencies.ts       # Currency definitions
│   ├── config.ts           # App configuration
│   └── errors.ts           # Custom error classes
└── preload/                # Electron preload scripts
```

---

## Data Flow

```
┌──────────────┐      IPC      ┌──────────────┐      File I/O     ┌─────────────┐
│   React UI   │ ───────────▶  │  Main Process │ ────────────────▶ │  JSON Files │
│  (Renderer)  │ ◀───────────  │   (Node.js)   │ ◀──────────────── │   (Vault)   │
└──────────────┘               └──────────────┘                    └─────────────┘
      │                              │
      │                              │
      ▼                              ▼
  Zustand Store              Services/Repositories
```

---

## Key Patterns

### 1. Repository Pattern
Data access is abstracted through repositories:
```typescript
// src/main/repositories/InsuranceRepository.ts
class InsuranceRepository extends BaseRepository<InsurancePolicy> {
    save(policy: InsurancePolicy): Promise<InsurancePolicy>
    delete(id: string): Promise<boolean>
    findByType(type: string): InsurancePolicy[]
}
```

### 2. Service Layer
Business logic is separated from data access:
```typescript
// src/main/services/InsuranceService.ts
class InsuranceService {
    calculateAnnualPremium(policy: InsurancePolicy): number
    isExpiringSoon(policy: InsurancePolicy): boolean
}
```

### 3. Zod Schemas
All data is validated with Zod:
```typescript
// src/shared/schemas.ts
const InsurancePolicySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    // ...
});
```

### 4. Atomic UI Components
Reusable components in `src/renderer/src/components/ui/`:
- Input, Select, Button, Modal, Card, FormSection
- MoneyInput, DateInput (specialized)

---

## Vault Structure

Data is stored in a user-selected directory:

```
[Vault Path]/
├── accounts.json
├── categories.json
├── transactions/
│   ├── 2024-01.json
│   └── 2024-02.json
├── assets.json
├── holdings.json
├── properties.json
├── collectibles.json
├── insurance.json
├── deposits.json
├── brokers.json
├── snapshots.json
└── settings.json
```

---

## IPC Channels

Communication between renderer and main process:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `VAULT_LOAD` | R → M | Load vault data |
| `VAULT_SAVE_*` | R → M | Save specific entity |
| `INVESTMENT_SEARCH` | R → M | Yahoo Finance search |
| `INVESTMENT_BUY` | R → M | Execute buy order |
| `DEV_SEED` | R → M | Generate demo data |

---

## Adding a New Feature

1. **Schema**: Add Zod schema in `src/shared/schemas.ts`
2. **Repository**: Create in `src/main/repositories/`
3. **Service**: Create in `src/main/services/`
4. **IPC Handler**: Add in `src/main/index.ts`
5. **Store**: Update `useVaultStore.ts`
6. **UI Components**: Create in `src/renderer/src/components/[feature]/`
7. **Translations**: Add keys to `locales/en.json` and `locales/it.json`
