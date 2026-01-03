# My Wealth - Development Guide 👩‍💻👨‍💻

Welcome to the **My Wealth** developer documentation. This guide provides an overview of the architecture, code structure, data models, and best practices used in the project.

---

## 🏗️ Project Architecture

My Wealth is a **local-first** desktop application built with **Electron**. It follows a strict separation of concerns between the Main Process (OS interactions, file system) and the Renderer Process (UI).

### Core Principles

1.  **Local-First & Privacy**: All data is stored in the user's local filesystem as JSON files (The "Vault"). No external databases or cloud sync (unless user-managed via Dropbox/iCloud).
2.  **Type Safety**: Strict TypeScript usage with Zod schemas for all data validation at runtime.
3.  **Performance**: Optimized for large datasets using virtualization, lazy loading, and efficient re-rendering.
4.  **Money Handling**: All monetary values are stored as **integers (cents)** to avoid floating-point errors.

### The Broker-Centric Model

The most critical specific concept in this application is the **Broker-Centric Data Model**. The **Broker** (e.g., Fineco, Directa, Binance) is the **primary container** and the source of truth for user data. It is not just a tag; it is the entity that physically holds the assets.

*   A Broker can hold:
    *   **Accounts**: For liquid cash (checking, savings) and transactions.
    *   **Holdings**: Investment positions (stocks, ETFs).
    *   **Deposit Accounts**: Constrained liquidity (Conti deposito).
    *   **Insurance**: Policies managed by that institution.

**Rule:** When adding new financial entities, always ask: *"Which Broker holds this?"*

---

## 📂 Code Structure

```
/src
├── /main                # Electron Main Process (Node.js)
│   ├── /importers       # CSV import logic
│   ├── /services        # Backend services (Backup, Recurring, etc.)
│   ├── index.ts         # Entry point, window creation
│   ├── ipc.ts           # IPC handlers definition
│   └── vault.ts         # File system operations (read/write JSON)
│
├── /preload             # IPC Bridge
│   └── index.ts         # Exposes safe API to Renderer
│
├── /renderer            # React UI (Browser environment)
│   ├── /src
│   │   ├── /assets      # Images, fonts
│   │   ├── /components  # React components
│   │   │   ├── /ui      # Reusable UI kit (Button, Input, etc.)
│   │   │   └── ...      # Feature components
│   │   ├── /hooks       # Custom React hooks (useKeyboardShortcuts, etc.)
│   │   ├── /lib         # Utilities (utils, cache, etc.)
│   │   ├── /store       # Zustand state management
│   │   ├── App.tsx      # Main component & Routing
│   │   └── main.tsx     # React Entry point
│   └── index.html
│
└── /shared              # Code shared between Main and Renderer
    ├── schemas.ts       # Zod data schemas (Single Source of Truth)
    └── types.ts         # TypeScript interfaces derived from schemas
    
├── /resources           # Static resources
│   ├── logo-registry.json # Registry of preset brokers
│   └── /asset-icons     # High-res logos for presets
```

---

## 🛠️ Key Technologies

*   **Electron**: Desktop runtime.
*   **React**: UI library.
*   **TypeScript**: Static typing.
*   **Tailwind CSS**: Utility-first styling.
*   **Zustand**: Lightweight global state management.
*   **Zod**: Schema validation and type inference.
*   **React-Window**: Virtual scrolling for performance.
*   **Recharts / Chart.js**: Data visualization.
*   **i18next**: Internationalization (English/Italian).
*   **Sonner**: Toast notifications.

---

## 💾 Data Persistence (The Vault)

Data is stored in strict JSON files locally. We use a **Relational JSON** approach.

*   `brokers.json`: List of brokers (ID, name, type).
*   `accounts.json`: Contains `brokerId` foreign key to link to a broker.
*   `holdings.json`: Contains `brokerId` OR `accountId` to link to the container.
*   `deposits.json`: Contains `brokerId` foreign key.

### Loading & Integrity
The `VaultManager` (`src/main/vault.ts`) loads all files into memory. The frontend store (`useVaultStore`) then reconstructs the relationships derived from these IDs.

*   **Zod Validation**: We strictly validate all data entering the application (from disk or user input) using Zod schemas defined in `src/shared/schemas.ts`.
*   **Cascading Deletion**: When an entity (Broker, Account) is deleted, the system performs a cascading delete to remove all dependent data (Transactions, Holdings, Trades) to ensure referential integrity.
*   **Account Archiving**: Accounts can be "Closed" (`isArchived: true`), which hides them from active selection but preserves their history and transactions.

---

## 🧩 Best Practices

### 1. Money Handling 💸
**NEVER** use floating point numbers for currency storage or calculation.
*   ✅ Store: `1099` (cents)
*   ❌ Store: `10.99` (dollars/euros)

Use the `Money` Zod schema helper. Format only for display using `useFormatMoney` hook or `formatMoney` helper.

### 2. State Management (Zustand)
We use independent stores for different concerns:
*   `useVaultStore`: Contains the application data (accounts, assets, transactions). Persisted to disk via Main process.
*   `useSettingsStore`: UI preferences (theme, language). Persisted to `workspace.json`.

### 3. IPC Communication
We use a strict IPC pattern between Renderer and Main process:
1.  **Define Channel** in `src/shared/types.ts` (`IPC_CHANNELS`).
2.  **Expose API** in `src/preload/index.ts` (typed in `index.d.ts`).
3.  **Handle Logic** in `src/main/index.ts` (calling managers like `VaultManager`).

### 4. Performance 🚀
*   **Virtualization**: Use `VirtualList` for any list that might exceed 50 items (Transactions, Holdings).
*   **Lazy Loading**: Use `LazyWrapper` for heavy components (Charts, complex modals).
*   **Memoization**: Use `useMemo` and `useCallback` for expensive calculations or stable references passed to children.

### 5. UI Patterns
*   **Component Composition**: Build complex UIs from small, reusable components in `src/renderer/src/components/ui`.
*   **Styles**: Use Tailwind CSS classes. Use `cn()` utility for conditional class merging.
*   **Modals**: Modals should be context-aware (e.g., "Adding an investment *to this specific broker*").
*   **Archive vs Delete**: Prefer archiving (`isArchived: true`) over deletion to preserve history. Use `CloseDeleteAccountModal` for standardized UX.

---

## 🔄 Workflow

### Development
```bash
npm run dev
```

### Type Checking
Run this before committing to ensure type safety:
```bash
npm run typecheck:node  # Check Main process
npm run typecheck:web   # Check Renderer process
```

### Building
```bash
npm run build:mac   # or :win, :linux
```

---

## 🎯 Feature Reference

### Manual Balance Adjustment
Accounts support manual balance override to handle incomplete history or reconciliation.
*   Implementation: `Account.manualBalance` in schema.
*   UI: `EditBalanceModal.tsx` via BrokerDetailView.

### Window Size Persistence
Window dimensions and position are automatically saved in `AppSettings.windowBounds` and restored on restart.

### Preset-First Broker Creation
A streamlined flow for adding brokers using a pre-defined registry (`resources/logo-registry.json`).
*   Uses custom `asset://` protocol for local images.
*   UI: `BrokerPresetSelectorModal`.

### Testing Imports
When working on the Import Wizard:
1.  Ensure you respect the `brokerId` context.
2.  If an account doesn't exist for the broker, create one with `type: 'investment'` automatically.
3.  Use the `imported` tag for transactions to bypass strict categorization rules during the initial import.

---

## 🚀 Adding New Features

1.  **Define Schema**: Add data models to `src/shared/schemas.ts`.
2.  **Update Types**: Export the inferred type.
3.  **Backend (Optional)**: If complex logic is needed, add a service in `src/main/services`.
4.  **Store**: Update `useVaultStore` to handle loading/saving the new data type.
5.  **UI**: Create components in `src/renderer/src/components`.

---
*Documentation consolidated for My Wealth v1.0*
