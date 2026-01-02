# My Wealth - Developer Guide 👩‍💻👨‍💻

Welcome to the **My Wealth** developer documentation. This guide provides an overview of the architecture, code structure, and best practices used in the project.

---

## 🏗️ Project Architecture

My Wealth is a **local-first** desktop application built with **Electron**. It follows a strict separation of concerns between the Main Process (OS interactions, file system) and the Renderer Process (UI).

### Core Principles

1.  **Local-First & Privacy**: All data is stored in the user's local filesystem as JSON files (The "Vault"). No external databases or cloud sync (unless user-managed via Dropbox/iCloud).
2.  **Type Safety**: Strict TypeScript usage with Zod schemas for all data validation at runtime.
3.  **Performance**: Optimized for large datasets using virtualization, lazy loading, and efficient re-rendering.
4.  **Money Handling**: All monetary values are stored as **integers (cents)** to avoid floating-point errors.

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

---

##  best practices

### 1. Data Integrity (Zod)
We strictly validate all data entering the application (from disk or user input) using Zod schemas defined in `src/shared/schemas.ts`.

**Do:**
```typescript
// Define schema
export const AssetSchema = z.object({
  currentPrice: Money,
  symbol: z.string(),
});

// Infer type
export type Asset = z.infer<typeof AssetSchema>;
```

### 2. Money Handling 💸
**NEVER** use floating point numbers for currency storage or calculation.
*   ✅ Store: `1099` (cents)
*   ❌ Store: `10.99` (dollars/euros)

Use the `Money` Zod schema helper. Format only for display using `useFormatMoney` hook or `formatMoney` helper.

### 3. State Management (Zustand)
We use independent stores for different concerns:
*   `useVaultStore`: Contains the application data (accounts, assets, transactions). Persisted to disk via Main process.
*   `useSettingsStore`: UI preferences (theme, language). Persisted to `workspace.json`.

### 4. Performance 🚀
*   **Virtualization**: Use `VirtualList` for any list that might exceed 50 items (Transactions, Holdings).
*   **Lazy Loading**: Use `LazyWrapper` for heavy components (Charts, complex modals).
*   **Memoization**: Use `useMemo` and `useCallback` for expensive calculations or stable references passed to children.

### 5. Components
*   **Composition**: Build complex UIs from small, reusable components in `src/renderer/src/components/ui`.
*   **Styles**: Use Tailwind CSS classes. Use `cn()` utility for conditional class merging.

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

## 🎯 Recent Features

### Manual Balance Adjustment
Accounts support manual balance override to handle:
- Incomplete transaction history (e.g., starting mid-year)
- Dividends/interest without creating individual transactions
- Reconciliation with real bank statements

**Implementation:**
- `Account.manualBalance` (optional field in schema)
- If set, overrides calculated balance from transactions
- UI: Edit button on account cards in BrokerDetailView
- Component: `EditBalanceModal.tsx`

### Window Size Persistence
Window dimensions and position are automatically saved:
- Stored in `AppSettings.windowBounds`
- Debounced saves (500ms) on resize/move events
- Immediate save on window close
- Restores size, position, and maximized state on app restart

**Implementation:**
- Schema: `AppSettingsSchema.windowBounds`
- Main process: `createWindow()` in `src/main/index.ts`
- Methods: `VaultManager.getSettings()`, `VaultManager.updateSettings()`

---

## 🧩 Adding New Features

1.  **Define Schema**: Add data models to `src/shared/schemas.ts`.
2.  **Update Types**: Export the inferred type.
3.  **Backend (Optional)**: If complex logic is needed, add a service in `src/main/services`.
4.  **Store**: Update `useVaultStore` to handle loading/saving the new data type.
5.  **UI**: Create components in `src/renderer/src/components`.

---

*Documentation generated by code assistant*
