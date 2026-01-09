# My Wealth 💰

**My Wealth** is a modern, open-source, local-first personal finance application designed to give you complete control over your financial data. Built with privacy at its core, it allows you to track investments, accounts, real estate, and collectibles without your sensitive data ever leaving your device.

![My Wealth Dashboard](resources/dashboard-preview.png)

## 📥 Download

Download the latest version for your platform from the [**Releases Page**](https://github.com/MarcoMedri/My-Wealth/releases/latest).

**Available Downloads:**
- **macOS**: `.dmg` installer (Apple Silicon & Intel) - Signed and notarized
- **Windows**: `.exe` installer  
- **Linux**: `.AppImage` portable executable

---

## 📑 Table of Contents

- [Download](#-download)
- [Key Features](#-key-features)
- [Tech Stack](#️-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Building for Production](#-building-for-production)
- [Developer Commands](#-developer-commands)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Key Features

*   **🔒 Local-First & Private**: Your financial data is stored securely on your local machine. No cloud servers, no tracking, no data selling. You own your data.
*   **📈 Investment Portfolio**: 
    *   Real-time price updates via Yahoo Finance integration.
    *   Track Stocks, ETFs, Cryptocurrencies, and more.
    *   Visual portfolio distribution with interactive charts.
    *   Detailed performance metrics including Day Change, Total Return, and Cost Basis.
    *   Support for buy/sell transactions with automatic P/L calculation.
*   **🏦 Comprehensive Net Worth Tracking**:
    *   **Brokers & Institutions**: Organize accounts by broker/bank with a preset-first creation flow (47+ built-in presets) or custom manual entry.
    *   **Accounts**: Track checking, savings, credit cards, loans, and investment accounts with manual balance override support.
    *   **Advanced Management**: Archive unused accounts to preserve history ("Close Account") or permanently remove them ("Delete Account") with **cascading data cleanup** (transactions, holdings, trades).
    *   **Securities Accounts**: Dedicated accounts for managing investment portfolios, ensuring valid asset tracking.
    *   **Conti Deposito**: Track high-yield deposit accounts with maturity tracking.
    *   **Insurance**: Manage life, auto, and health insurance policies.
    *   **Real Estate**: Track property values and mortgages.
    *   **Collectibles**: Manage high-value assets like watches, art, jewelry, and vehicles.
*   **📊 Insightful Dashboard**: A beautiful, responsive interface that gives you an at-a-glance view of your financial health.
*   **⚡ Modern & Fast**: Built with cutting-edge web technologies for a native application experience.
    *   **Workspaces**: Collapsible sidebars and persistent layout preferences for a focused workflow.
    *   **Custom Categories**: Create, edit, and delete categories with custom icons and colors.
    *   **Demo Data**: Includes a robust seed generator for realistic historical data and exploring features.
    *   **Recurring Transactions**: Schedule automated daily, weekly, monthly, or yearly transactions.
    *   **Import Wizard**: Easy 4-step CSV import with column mapping and duplicate detection.
    *   **Budgets**: Set and track spending limits by category with rollover support.
*   **📊 Advanced Reporting**:
    *   **Export**: Generate professional PDF reports and CSV exports of your financial status.
    *   **Performance**: Virtual scrolling and lazy loading for smooth performance with thousands of transactions.
    *   **Backup**: Automatic backup system with rotation to keep your data safe.
    *   **Productivity**: Command Palette (`Cmd+K`) and keyboard shortcuts for rapid navigation.
*   **💾 Workspace Persistence**:
    *   Remembers your dashboard filters (date ranges, toggle states) across sessions.
    *   Stores UI preferences locally in the vault (`workspace.json`).
    *   Automatically saves and restores window size, position, and maximized state.

## 🛠️ Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icons)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Charts**: [Recharts](https://recharts.org/) & [Chart.js](https://www.chartjs.org/)
*   **Data Validation**: [Zod](https://zod.dev/)
*   **Utilities**: [Papaparse](https://www.papaparse.com/) (CSV Import), [Faker.js](https://fakerjs.dev/) (Data Seeding)
*   **Build Tooling**: [Electron-Vite](https://electron-vite.org/)

## 📁 Architecture

### Data Model

My Wealth uses a **Vault** system - a folder on your local machine containing JSON files for each data type:

```
/your-vault-folder/
├── logos/             # Broker logos (downloaded locally)
├── accounts.json      # Bank accounts, wallets, credit cards
├── transactions.json  # Income, expenses, transfers
├── assets.json        # Investment asset definitions (AAPL, BTC, etc.)
├── holdings.json      # Your positions in assets
├── trades.json        # Buy/sell transaction history
├── properties.json    # Real estate holdings
├── collectibles.json  # Watches, art, vehicles, etc.
├── brokers.json       # Financial institutions
├── categories.json    # Transaction categories
├── snapshots.json     # Historical net worth snapshots
├── insurance.json     # Insurance policies
├── deposits.json      # Deposit accounts
└── workspace.json     # UI preferences and workspace settings
```

### Core Concepts
        
| Concept | Description |
|---------|-------------|
| **Broker** | **The Primary Container.** A financial institution (bank, brokerage, crypto exchange, etc.) that acts as the "Source of Truth". It holds your Accounts, Investments, Insurance, and Deposits. |
| **Account** | A cash container (checking, savings, credit card) linked to a Broker. Used for liquid funds and transactions. |
| **Holding** | Your position in an asset (e.g., 10 shares of AAPL), held within a Broker. |
| **Asset** | An investable item with real-time price tracking (stocks, ETFs, crypto). |
| **Deposit Account** | High-yield savings/deposit contract held at a Broker. |
| **Insurance** | Insurance policy managed by a Broker/Provider. |
| **Property** | Real estate holdings (Independent entity, typically linked to a Mortgage Account). |
| **Collectible** | High-value physical items (Independent entity). |

**Architectural Model:** 
The application follows a **Broker-Centric** model. 
- You import data into a **Broker**.
- The **Broker View** shows everything you own at that specific institution.
- The **Global Dashboards** (Accounts, Investments, etc.) act as **Aggregated Views**, summing up data from all brokers to give you a complete financial picture.

### Money Handling

All monetary values are stored as **integers in cents** to avoid floating-point precision errors:

```
$10.99 → 1099 (stored in JSON)
€5.00  → 500
```

The frontend handles formatting for display.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/marcomedri/my-wealth.git
    cd my-wealth
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## 🔄 Automatic Backup System

My Wealth includes an intelligent automatic backup system to protect your financial data:

### Features

- **Intelligent Scheduling**: Backups are created automatically every 30 minutes when you save data
- **Compression**: Backups are compressed with gzip to save disk space
- **Automatic Rotation**: Keeps the last 10 backups, automatically deleting older ones
- **One-Click Restore**: Restore from any backup with a single click
- **Safe Restore**: Creates a backup of current data before restoring

### Location

Backups are stored in your vault folder:
```
/your-vault-folder/
├── backups/
│   ├── vault-backup-2026-01-05T12-00-00-000Z.json.gz
│   ├── vault-backup-2026-01-05T11-30-00-000Z.json.gz
│   └── ...
```

### How to Use

1. **View Backups**: Open Settings (⚙️) → Scroll to "Backups" section
2. **Restore**: Click "Restore" next to any backup → Confirm
3. **Delete**: Click "Delete" to remove a specific backup

### Technical Details

- Backups include all vault data (accounts, transactions, investments, etc.)
- 30-minute interval prevents excessive backup creation
- Backup failures don't interrupt normal operations
- Compressed backups typically use 10-20% of original vault size

## 🛡️ Error Handling & Recovery

My Wealth includes robust error handling to prevent crashes and data loss:

### Error Boundary System

- **React Error Boundaries**: Catches rendering errors and prevents app crashes
- **Fallback UI**: Shows user-friendly error screen with recovery options
- **Error Details**: Displays error information in development mode for debugging

### Centralized Error Handler

- **Severity Levels**: INFO, WARNING, ERROR, CRITICAL
- **File Logging**: Errors logged to `~/Library/Application Support/MyWealth/logs/errors.log` (macOS)
- **Log Rotation**: Automatic log file rotation when size exceeds 5MB (keeps last 5 files)
- **User Notifications**: Toast notifications based on error severity

### Error Recovery

1. **Try Again**: Resets error state and attempts to continue
2. **Reload Page**: Full page reload to recover from critical errors
3. **Automatic Logging**: All errors logged for debugging

### For Developers

```typescript
import { handleError, ErrorSeverity, createError } from './shared/errorHandler';

// Handle errors with context
try {
  await saveData();
} catch (error) {
  handleError(error, {
    context: { operation: 'save', userId: '123' },
    showToast: true,
    logToFile: true
  });
}

// Create custom errors
const error = createError(
  'SAVE_ERROR',
  'Failed to save data',
  ErrorSeverity.ERROR,
  { retryCount: 3 }
);
```

## 📦 Building for Production

To build the application for your operating system:

**macOS**
```bash
npm run build:mac
```

**Windows**
```bash
npm run build:win
```

**Linux**
```bash
npm run build:linux
```

## 🧪 Developer Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build:analyze` | Build with bundle analysis (opens visualization) |

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by Marco Medri
</p>
