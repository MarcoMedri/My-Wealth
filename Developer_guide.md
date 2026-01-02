# Developer Guide 🛠️

This guide is intended for developers contributing to **My Wealth**. It outlines the core architectural principles, data flow, and development practices.

## 🏗️ Architectural Philosophy: The Broker-Centric Model

The most critical concept in this application is the **Broker-Centric Data Model**.

### 1. The Container (Broker)
The **Broker** (e.g., Fineco, Directa, Binance) is the **primary container** and the source of truth for user data. It is not just a tag; it is the entity that physically holds the assets.

*   A Broker can hold:
    *   **Accounts**: For liquid cash (checking, savings) and transactions.
    *   **Holdings**: Investment positions (stocks, ETFs).
    *   **Deposit Accounts**: Constrained liquidity (Conti deposito).
    *   **Insurance**: Policies managed by that institution.

**Rule:** When adding new financial entities, always ask: *"Which Broker holds this?"*

### 2. The Views (Dashboards)
The main navigation links (Accounts, Investments, Deposits) are **Aggregated Views**, not independent containers.

*   **Accounts Dashboard**: Aggregates cash balances from *all* Brokers + physical wallets.
*   **Investments Dashboard**: Aggregates holdings from *all* Brokers to show total portfolio exposure.

### 3. Data Flow (Import)
Imports are **Broker-Scoped**. The user does not "import a file into the app"; they "import a file into a specific Broker".
*   The system creates technical "Accounts" automatically if needed to store transactions, but the user interaction is focused on the Broker.

## 💾 Data Persistence (The Vault)

Data is stored in strict JSON files locally. We use a **Relational JSON** approach.

*   `brokers.json`: List of brokers (ID, name, type).
*   `accounts.json`: Contains `brokerId` foreign key to link to a broker.
*   `holdings.json`: Contains `brokerId` OR `accountId` to link to the container.
*   `deposits.json`: Contains `brokerId` foreign key.

**Loading Logic:**
The `VaultManager` (`src/main/vault.ts`) loads all files into memory. The frontend store (`useVaultStore`) then reconstructs the relationships derived from these IDs.

## 🔧 Development workflow

### IPC Communication
We use a strict IPC pattern between Renderer and Main process:
1.  **Define Channel** in `src/shared/types.ts` (`IPC_CHANNELS`).
2.  **Expose API** in `src/preload/index.ts` (typed in `index.d.ts`).
3.  **Handle Logic** in `src/main/index.ts` (calling managers like `VaultManager`).

### Money Handling
**ALWAYS** use integers (cents) for monetary values.
*   `100` = €1.00
*   Never use floats for storage or calculation to avoid `0.1 + 0.2 = 0.300000004` errors.
*   Convert to float only for display/formatting at the UI layer.

## 🧪 Testing Imports
When working on the Import Wizard:
1.  Ensure you respect the `brokerId` context.
2.  If an account doesn't exist for the broker, create one with `type: 'investment'` automatically.
3.  Use the `imported` tag for transactions to bypass strict categorization rules during the initial import.
