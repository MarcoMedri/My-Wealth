# Contributing to MyWealth

Thank you for your interest in contributing! This guide covers everything you need to know to get started, from setting up your environment to our technical principles and coding standards.

---

## 🏗️ Project Architecture & Principles

My Wealth is a **local-first** desktop application built with **Electron**. It follows a strict separation of concerns between the Main Process (OS interactions, file system) and the Renderer Process (UI).

### Core Principles

1.  **Local-First & Privacy**: All data is stored in the user's local filesystem as JSON files (The "Vault"). No external databases or cloud sync (unless user-managed via Dropbox/iCloud).
2.  **Type Safety**: Strict TypeScript usage with Zod schemas for all data validation at runtime.
3.  **Performance**: Optimized for large datasets using virtualization, lazy loading, and efficient re-rendering.
4.  **Money Handling**: All monetary values are stored as **integers (cents)** to avoid floating-point errors.

### The Broker-Centric Model

The most critical concept in this application is the **Broker-Centric Data Model**. The **Broker** (e.g., Fineco, Directa, Binance) is the **primary container** and the source of truth for user data.

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
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Installation
```bash
git clone https://github.com/MarcoMedri/My-Wealth.git
cd My-Wealth
npm install
npm run dev
```

---

## 🧩 Best Practices & Code Style

### 1. Money Handling 💸
**NEVER** use floating point numbers for currency storage or calculation.
*   ✅ Store: `1099` (cents)
*   ❌ Store: `10.99` (dollars/euros)

Use the `Money` Zod schema helper. Format only for display using `useFormatMoney` hook or `formatMoney` helper.

### 2. TypeScript & React
- **Strict Typing**: Use strict TypeScript. Define explicit return types.
- **Components**: Use functional components with hooks. Use `useCallback` and `useMemo` for performance.
- **UI Kit**: Use the shared UI components in `src/renderer/src/components/ui/` (Input, Button, Modal, etc.).
- **Tailwind CSS**: Use utility classes with semantic tokens (`text-foreground`, `bg-primary`).

### 3. State & IPC
- **Zustand**: Use `useVaultStore` for application data and `useSettingsStore` for UI preferences.
- **IPC Pattern**: 
    1. Define Channel in `src/shared/types.ts`.
    2. Expose API in `src/preload/index.ts`.
    3. Handle Logic in `src/main/index.ts`.

### 4. Performance 🚀
- **Virtualization**: Use `VirtualList` for lists exceeding 50 items.
- **Lazy Loading**: Use `LazyWrapper` for heavy components (Charts, complex modals).

---

## 🔄 Workflow

### Development
```bash
npm run dev
```

### Validation
Run these before committing:
```bash
npm run lint         # Check code style
npm run typecheck    # Check TypeScript (Main & Renderer)
npm test             # Run unit tests
```

---

## 🎯 Feature Implementation Reference

### Adding New Features
1. **Define Schema**: Add data models to `src/shared/schemas.ts`.
2. **Update Types**: Export the inferred type.
3. **Backend**: Add services in `src/main/services` if logic is complex.
4. **Store**: Update `useVaultStore` for persistence.
5. **UI**: Create components in `src/renderer/src/components`.

### Commit Messages
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `test:` Tests

Example: `feat: Add batch import for transactions`

---

## 🚀 Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes and run validation (lint, typecheck, test).
3. Commit with a conventional message.
4. Push and create a Pull Request.

---

## 🌍 i18n (Translations)

Add translations to both:
- `src/renderer/src/locales/en.json`
- `src/renderer/src/locales/it.json`

---

## Questions?

Open an issue on GitHub with the `question` label.
