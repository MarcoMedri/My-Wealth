/**
 * MyWealth Desktop - Zod Schemas
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * STRICT DATA VALIDATION FOR LOCAL-FIRST FINANCE APP
 * 
 * Since users can manually edit JSON files (like Obsidian), we must validate
 * ALL data before loading into memory and before writing to disk.
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ MONEY HANDLING: INTEGERS ONLY (CENTS)                                  │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ We store all monetary values as INTEGERS representing cents/minor      │
 * │ units to avoid floating-point precision errors.                        │
 * │                                                                         │
 * │ Examples:                                                               │
 * │   $10.99  → 1099 cents                                                 │
 * │   €5.00   → 500 cents                                                  │
 * │   ¥1000   → 1000 (JPY has no minor units, stored as-is)               │
 * │                                                                         │
 * │ This approach prevents issues like:                                    │
 * │   0.1 + 0.2 = 0.30000000000000004 (floating point error!)             │
 * │                                                                         │
 * │ Frontend is responsible for formatting: 1099 → "$10.99"               │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { z } from 'zod';



// ============================================================================
// PRIMITIVE TYPES
// ============================================================================

/**
 * Money - Integer representing cents/minor currency units
 * Must be an integer to avoid floating-point precision errors
 */
export const Money = z.number().int().describe('Amount in cents (integer only)');

/**
 * UUID - Unique identifier for all entities
 */
export const UUID = z.string().uuid().describe('Unique identifier');

/**
 * ISODate - ISO 8601 datetime string
 * Example: "2024-12-31T14:30:00.000Z"
 */
export const ISODate = z.string().datetime().describe('ISO 8601 datetime');

/**
 * Currency code - ISO 4217 (3-letter code)
 * Examples: "USD", "EUR", "GBP", "JPY"
 */
export const CurrencyCode = z.string().length(3).toUpperCase().describe('ISO 4217 currency code');

// ============================================================================
// ASSETS & HOLDINGS
// ============================================================================

export const AssetTypeSchema = z.enum([
  'stock',
  'etf',
  'crypto',
  'bond',
  'fund',
  'insurance',
  'other'
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Price history entry for historical tracking
 */
export const PriceHistoryEntrySchema = z.object({
  date: ISODate,
  price: Money,
});
export type PriceHistoryEntry = z.infer<typeof PriceHistoryEntrySchema>;

export const AssetSchema = z.object({
  id: UUID,
  symbol: z.string(),
  isin: z.string().optional(),
  name: z.string(),
  type: AssetTypeSchema,
  currency: CurrencyCode, // ISO 4217
  currentPrice: Money, // In cents
  previousClose: Money.optional(), // Yesterday's close for day change calculation
  priceHistory: z.array(PriceHistoryEntrySchema).optional(), // Historical prices (optional)
  lastUpdated: ISODate, // ISO 8601
  metadata: z.object({
    sector: z.string().optional(),
    industry: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    exchange: z.string().optional(),
  }).optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type Asset = z.infer<typeof AssetSchema>;

// ============================================================================
// BROKER/INSTITUTION SCHEMA
// ============================================================================

export const BrokerTypeSchema = z.enum([
  'bank',
  'broker',
  'crypto_exchange',
  'other'
]);
export type BrokerType = z.infer<typeof BrokerTypeSchema>;

export const BrokerSchema = z.object({
  id: UUID,
  name: z.string().min(1).max(100),
  type: BrokerTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type Broker = z.infer<typeof BrokerSchema>;

export const BrokersFileSchema = z.object({
  version: z.literal(1),
  brokers: z.array(BrokerSchema),
});
export type BrokersFile = z.infer<typeof BrokersFileSchema>;

export const HoldingSchema = z.object({
  id: UUID,
  accountId: UUID, // Links to the Broker Account
  brokerId: UUID.optional(), // Links holding directly to a broker
  assetId: UUID,   // Links to Asset
  quantity: z.number(),         // Float is acceptable for quantity
  averageBuyPrice: Money, // In cents (unit cost)
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type Holding = z.infer<typeof HoldingSchema>;

export const AssetsFileSchema = z.object({
  version: z.literal(1),
  assets: z.array(AssetSchema),
});
export type AssetsFile = z.infer<typeof AssetsFileSchema>;

export const HoldingsFileSchema = z.object({
  version: z.literal(1),
  holdings: z.array(HoldingSchema),
});
export type HoldingsFile = z.infer<typeof HoldingsFileSchema>;

// ============================================================================
// INVESTMENT TRADES & DIVIDENDS
// ============================================================================

/**
 * Investment Trade - Records buy/sell transactions for full tracking
 */
export const InvestmentTradeSchema = z.object({
  id: UUID,
  type: z.enum(['buy', 'sell']),
  assetId: UUID,
  accountId: UUID,
  quantity: z.number(),
  pricePerUnit: Money,        // In cents
  fees: Money.default(0),
  date: ISODate,
  // For sells only - realized profit/loss
  realizedGain: Money.optional(),
  createdAt: ISODate,
});
export type InvestmentTrade = z.infer<typeof InvestmentTradeSchema>;

export const TradesFileSchema = z.object({
  version: z.literal(1),
  trades: z.array(InvestmentTradeSchema),
});
export type TradesFile = z.infer<typeof TradesFileSchema>;

/**
 * Dividend - Records dividend payments received
 */
export const DividendSchema = z.object({
  id: UUID,
  assetId: UUID,
  accountId: UUID,
  date: ISODate,
  amountPerShare: Money,      // In cents per share
  totalAmount: Money,         // Total received (quantity * amountPerShare)
  currency: CurrencyCode,
  createdAt: ISODate,
});
export type Dividend = z.infer<typeof DividendSchema>;

export const DividendsFileSchema = z.object({
  version: z.literal(1),
  dividends: z.array(DividendSchema),
});
export type DividendsFile = z.infer<typeof DividendsFileSchema>;

// ============================================================================
// REAL ESTATE
// ============================================================================

export const PropertyTypeSchema = z.enum([
  'residence',    // Casa principale
  'rental',       // Immobile in affitto
  'vacation',     // Casa vacanze
  'land',         // Terreno
  'commercial',   // Commerciale
  'other'
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PropertySchema = z.object({
  id: UUID,
  name: z.string(),                    // "Appartamento Milano"
  type: PropertyTypeSchema,
  address: z.string().optional(),
  
  // Values
  purchaseDate: ISODate.optional(),
  purchasePrice: Money.optional(),     // cents
  currentValue: Money,                 // cents (stima manuale)
  lastValuationDate: ISODate,
  currency: CurrencyCode,
  
  // Details
  squareMeters: z.number().optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),     // path locale
  
  // Linked
  mortgageAccountId: UUID.optional(),  // Link a account tipo "loan"
  
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type Property = z.infer<typeof PropertySchema>;

export const PropertiesFileSchema = z.object({
  version: z.literal(1),
  properties: z.array(PropertySchema),
});
export type PropertiesFile = z.infer<typeof PropertiesFileSchema>;

// ============================================================================
// SNAPSHOTS (NET WORTH HISTORY)
// ============================================================================

export const SnapshotSchema = z.object({
  id: UUID,
  date: ISODate,
  totalNetWorth: Money, // in cents
  currency: CurrencyCode,
  breakdown: z.object({
    cash: Money,
    investments: Money,
    realEstate: Money.default(0),
    collectibles: Money.default(0),
    insurance: Money.default(0),
    deposits: Money.default(0),
    // Add liabilities if implemented later
  }),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export const SnapshotsFileSchema = z.object({
  version: z.literal(1),
  snapshots: z.array(SnapshotSchema),
});
export type SnapshotsFile = z.infer<typeof SnapshotsFileSchema>;

// ============================================================================
// COLLECTIBLES
// ============================================================================

export const CollectibleTypeSchema = z.enum([
  'watch',        // Orologi
  'art',          // Arte (Quadri, sculture)
  'wine',         // Vini / Whisky
  'jewelry',      // Gioielli
  'vehicle',      // Auto d'epoca / Moto
  'trading_card', // Carte collezionabili (Pokemon, Magic)
  'coin',         // Monete / Numismatica
  'other'         // Altro
]);

export type CollectibleType = z.infer<typeof CollectibleTypeSchema>;

export const CollectibleSchema = z.object({
  id: UUID,
  name: z.string(),
  type: CollectibleTypeSchema,
  description: z.string().optional(),
  
  // Values
  purchaseDate: ISODate.optional(),
  purchasePrice: Money.optional(),   // cents
  currentValue: Money,               // cents
  currency: CurrencyCode,
  
  // Image
  imageUrl: z.string().optional(),
  
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type Collectible = z.infer<typeof CollectibleSchema>;

export const CollectiblesFileSchema = z.object({
  version: z.literal(1),
  collectibles: z.array(CollectibleSchema),
});
export type CollectiblesFile = z.infer<typeof CollectiblesFileSchema>;

// ============================================================================
// INSURANCE
// ============================================================================

export const InsurancePolicySchema = z.object({
  id: UUID,
  name: z.string().min(1).max(100),
  provider: z.string().optional(),     // e.g. Allianz, Generali
  policyNumber: z.string().optional(),
  contactInfo: z.string().optional(),  // Emergency contacts
  
  type: z.string(),                    // 'life', 'auto', 'health', 'home', 'other'
  
  // Values
  premiumAmount: Money,                // cents (annual/monthly premium)
  premiumPeriod: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one-time']),
  nextPaymentDate: ISODate.optional(),
  
  startDate: ISODate,
  endDate: ISODate.optional(),
  autoRenewal: z.boolean().default(false),
  
  coverageAmount: Money.optional(),    // 'Massimale' - cents (max coverage)
  deductible: Money.optional(),        // 'Franchigia' - cents
  
  currentValue: Money.default(0),      // cents (for investment-linked policies)
  currency: CurrencyCode,
  
  insuredEntity: z.string().optional(), // Targa, Indirizzo, Beneficiario
  
  notes: z.string().optional(),
  accountId: UUID.optional(),          // Link to broker/account (IBAN source)
  
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type InsurancePolicy = z.infer<typeof InsurancePolicySchema>;

export const InsuranceFileSchema = z.object({
  version: z.literal(1),
  policies: z.array(InsurancePolicySchema),
});
export type InsuranceFile = z.infer<typeof InsuranceFileSchema>;

// ============================================================================
// DEPOSIT ACCOUNTS (Conti Deposito)
// ============================================================================

export const InterestPeriodicitySchema = z.enum(['end', 'monthly', 'quarterly', 'semiannual', 'annual']);
export type InterestPeriodicity = z.infer<typeof InterestPeriodicitySchema>;

export const ConstraintTypeSchema = z.enum(['free', 'locked', 'flexible']);
export type ConstraintType = z.infer<typeof ConstraintTypeSchema>;

export const DepositAccountSchema = z.object({
  id: UUID,
  name: z.string().min(1).max(100),
  brokerId: z.string().optional(),     // Linked broker/bank

  // Financials
  principal: Money,                    // Initial amount (cents)
  grossRate: z.number(),               // e.g. 4.5
  netRate: z.number(),                 // e.g. 3.33 (after 26% tax)
  interestPeriodicity: InterestPeriodicitySchema,
  
  // Timing
  activationDate: ISODate,
  durationMonths: z.number().int().positive(),
  maturityDate: ISODate,
  
  // Liquidity
  constraintType: ConstraintTypeSchema,
  
  currency: CurrencyCode,
  notes: z.string().optional(),
  createdAt: ISODate,
  updatedAt: ISODate,
});
export type DepositAccount = z.infer<typeof DepositAccountSchema>;

export const DepositsFileSchema = z.object({
  version: z.literal(1),
  deposits: z.array(DepositAccountSchema),
});
export type DepositsFile = z.infer<typeof DepositsFileSchema>;

// ============================================================================
// APP SETTINGS SCHEMA
// ============================================================================

export const AppSettingsSchema = z.object({
  vaultPath: z.string().nullable(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  lastAppVersion: z.string(),
  lastModified: ISODate,
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

// ============================================================================
// ACCOUNT SCHEMA
// ============================================================================

/**
 * Account types supported by the application
 */
export const AccountTypeSchema = z.enum([
  'checking',   // Regular bank account
  'savings',    // Savings account
  'credit',     // Credit card (negative balance = debt)
  'investment', // Investment/brokerage account
  'cash',       // Physical cash wallet
  'loan',       // Loan account (mortgage, car loan, etc.)
  'deposit',    // Deposit account (CDs, high yield savings)
  'other',      // Custom account type
]);

export type AccountType = z.infer<typeof AccountTypeSchema>;

/**
 * Account - represents a financial account (bank, credit card, etc.)
 * 
 * Note: `balance` is NOT stored - it's calculated from transactions.
 * We only store `initialBalance` for the starting point.
 */
export const AccountSchema = z.object({
  id: UUID,
  brokerId: UUID.optional(), // Links account to a broker
  name: z.string().min(1).max(100).describe('Account display name'),
  type: AccountTypeSchema,
  currency: CurrencyCode,
  /** Starting balance in cents when account was created */
  initialBalance: Money.default(0),
  /** Hex color for UI display */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  /** Lucide icon name (optional) */
  icon: z.string().optional(),
  /** Archived accounts are hidden but preserved */
  isArchived: z.boolean().default(false),
  /** For ordering in UI */
  sortOrder: z.number().int().default(0),
  createdAt: ISODate,
  updatedAt: ISODate,
});

export type Account = z.infer<typeof AccountSchema>;

/**
 * Accounts file stored on disk: /vault/accounts.json
 */
export const AccountsFileSchema = z.object({
  version: z.literal(1),
  accounts: z.array(AccountSchema),
});

export type AccountsFile = z.infer<typeof AccountsFileSchema>;

// ============================================================================
// CATEGORY SCHEMA
// ============================================================================

/**
 * Category type - income or expense
 */
export const CategoryTypeSchema = z.enum(['income', 'expense']);

export type CategoryType = z.infer<typeof CategoryTypeSchema>;

/**
 * Category - for organizing transactions
 * Supports hierarchy via parentId (e.g., Food → Restaurants, Groceries)
 */
export const CategorySchema = z.object({
  id: UUID,
  name: z.string().min(1).max(100),
  type: CategoryTypeSchema,
  /** Parent category ID for subcategories, null for top-level */
  parentId: UUID.nullable().default(null),
  /** Lucide icon name */
  icon: z.string().default('tag'),
  /** Hex color for UI display */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  /** For ordering in UI */
  sortOrder: z.number().int().default(0),
  createdAt: ISODate,
  updatedAt: ISODate,
});

export type Category = z.infer<typeof CategorySchema>;

/**
 * Categories file stored on disk: /vault/categories.json
 */
export const CategoriesFileSchema = z.object({
  version: z.literal(1),
  categories: z.array(CategorySchema),
});

export type CategoriesFile = z.infer<typeof CategoriesFileSchema>;

// ============================================================================
// TRANSACTION SCHEMA
// ============================================================================

/**
 * Transaction status
 */
export const TransactionStatusSchema = z.enum([
  'pending',  // Not yet confirmed (e.g., pending credit card charge)
  'cleared',  // Confirmed/reconciled
]);

export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * Transaction type - determines how the transaction affects accounts
 */
export const TransactionTypeSchema = z.enum([
  'income',   // Money coming in (salary, refund, etc.)
  'expense',  // Money going out (purchase, bill, etc.)
  'transfer', // Moving money between accounts (no net change)
]);

export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * Split - for dividing a transaction across multiple categories
 * 
 * Example: Grocery receipt with:
 *   - $50 → Groceries
 *   - $20 → Household
 *   - $15 → Personal Care
 *   Total: $85
 */
export const SplitSchema = z.object({
  categoryId: UUID,
  /** Amount in cents for this split */
  amount: Money,
  /** Optional memo for this specific split */
  memo: z.string().max(200).optional(),
});

export type Split = z.infer<typeof SplitSchema>;

/**
 * Transaction - the core financial record
 * 
 * SPLIT VALIDATION RULES:
 * ─────────────────────────────────────────────────────────────────────────
 * 1. If `splits` is empty or undefined → use `categoryId` for the full amount
 * 2. If `splits` has items → sum of split amounts MUST equal transaction `amount`
 * 3. When splits exist, `categoryId` can be null (category is in splits)
 */
export const TransactionSchema = z.object({
  id: UUID,
  type: TransactionTypeSchema,
  
  /** Transaction date (when it occurred) */
  date: ISODate,
  
  /** Who/what the transaction was with */
  payee: z.string().max(200).default(''),
  
  /**
   * Amount in cents (always positive)
   * The `type` field determines if it's income/expense/transfer
   */
  amount: Money.nonnegative(),
  
  /** Currency code for this transaction */
  currency: CurrencyCode,
  
  /** Primary account affected */
  accountId: UUID,
  
  /**
   * Category for simple transactions (no splits)
   * Can be null if using splits or for transfers
   */
  categoryId: UUID.nullable().default(null),
  
  /**
   * For transfers: destination account
   * For income/expense: null
   */
  toAccountId: UUID.nullable().default(null),
  
  /** Split categories for complex receipts */
  splits: z.array(SplitSchema).default([]),
  
  /** Transaction status */
  status: TransactionStatusSchema.default('cleared'),
  
  /** User notes */
  notes: z.string().max(2000).default(''),
  
  /** Tags for filtering/searching */
  tags: z.array(z.string().max(50)).default([]),
  
  /** Reconciled with bank statement */
  isReconciled: z.boolean().default(false),
  
  createdAt: ISODate,
  updatedAt: ISODate,
}).refine(
  // VALIDATION: If splits exist, their sum must equal the transaction amount
  (tx) => {
    if (tx.splits.length === 0) return true;
    const splitsSum = tx.splits.reduce((sum, split) => sum + split.amount, 0);
    return splitsSum === tx.amount;
  },
  {
    message: 'Sum of split amounts must equal total transaction amount',
    path: ['splits'],
  }
).refine(
  // VALIDATION: Transfers must have toAccountId
  (tx) => {
    if (tx.type === 'transfer') {
      return tx.toAccountId !== null;
    }
    return true;
  },
  {
    message: 'Transfer transactions must specify toAccountId',
    path: ['toAccountId'],
  }
).refine(
  // VALIDATION: Non-split transactions should have a categoryId (except transfers)
  (tx) => {
    if (tx.type === 'transfer') return true;
    if (tx.splits.length > 0) return true;
    return tx.categoryId !== null;
  },
  {
    message: 'Non-transfer transactions must have a categoryId or splits',
    path: ['categoryId'],
  }
);

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Monthly transactions file stored on disk:
 * /vault/transactions/YYYY/MM/transactions.json
 */
export const TransactionsFileSchema = z.object({
  version: z.literal(1),
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  transactions: z.array(TransactionSchema),
});

export type TransactionsFile = z.infer<typeof TransactionsFileSchema>;

// ============================================================================
// IN-MEMORY STATE INTERFACE
// ============================================================================

/**
 * VaultState - The in-memory representation of loaded vault data
 * 
 * This is what the React frontend works with after loading from files.
 * Uses Maps for O(1) lookup by ID.
 */
export interface VaultState {
  /** Is the vault loaded and ready? */
  isLoaded: boolean;
  
  /** Path to the current vault */
  vaultPath: string | null;
  
  /** All accounts indexed by ID */
  accounts: Map<string, Account>;
  
  /** All categories indexed by ID */
  categories: Map<string, Category>;
  
  /**
   * Transactions indexed by ID
   * Loaded lazily by month - starts with current month ± 1
   */
  transactions: Map<string, Transaction>;
  
  /**
    * Which months are currently loaded
    * Format: "YYYY-MM" → true
    */
   loadedMonths: Set<string>;
   
   /**
    * Calculated balances per account (derived from transactions)
    * Updated whenever transactions change
    */
   accountBalances: Map<string, number>;
 
   /**
    * Assets (Stocks, ETFs, Crypto)
    */
   assets: Asset[];
 
   /**
    * Holdings (User ownership of assets)
    */
   holdings: Holding[];
 
   /**
    * Real Estate Properties
    */
   properties: Property[];
 
   /**
    * Collectibles (Watches, Art, etc.)
    */
   collectibles: Collectible[];
 
   /**
    * Insurance Policies
    */
   insurance: InsurancePolicy[];
    deposits: DepositAccount[];

   /**
    * Investment trades history (buy/sell records)
    */
   trades: InvestmentTrade[];
 
   /**
    * Dividend payments received
    */
   dividends: Dividend[];
   
   /**
    * Loaded Brokers
    */
   brokers: Broker[];
 
   /**
    * Loaded Snapshots
    */
   snapshots: Snapshot[];
   
   /**
    * Workspace Settings (Filters, UI preferences)
    */
   workspace: WorkspaceSettings;
}

// ============================================================================
// WORKSPACE SETTINGS
// ============================================================================

export const WorkspaceSettingsSchema = z.object({
  accountsDashboard: z.object({
    dateRange: z.string().optional(), // 'current-month', 'last-3-months', etc.
  }).optional(),
  investmentsDashboard: z.object({
    dateRange: z.string().optional(),
    includeClosed: z.boolean().optional(),
  }).optional(),
  global: z.object({
    // potentially theme, language, etc in future?
  }).optional()
});

export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

/**
 * Create an empty VaultState for initialization
 */
export function createEmptyVaultState(): VaultState {
  return {
    isLoaded: false,
    vaultPath: null,
    accounts: new Map(),
    categories: new Map(),
    transactions: new Map(),
    loadedMonths: new Set(),
    accountBalances: new Map(),
    assets: [],
    holdings: [],
    properties: [],
    collectibles: [],
    insurance: [],
    deposits: [],
    trades: [],
    dividends: [],
    brokers: [],
    snapshots: [],
    workspace: {},
  };
}

/**
 * SerializableVaultState - IPC-safe version of VaultState
 * 
 * Maps and Sets cannot be serialized over IPC, so we use arrays and objects.
 * This is what gets sent from main process to renderer.
 */
export interface SerializableVaultState {
  isLoaded: boolean;
  vaultPath: string | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  assets: Asset[];
  holdings: Holding[];
  properties: Property[];
  collectibles: Collectible[];
  insurance: InsurancePolicy[];
  deposits: DepositAccount[];
  trades: InvestmentTrade[];
  dividends: Dividend[];
  brokers: Broker[];
  snapshots: Snapshot[];
  loadedMonths: string[];
  accountBalances: Record<string, number>;
  workspace: WorkspaceSettings;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert cents to display amount
 * @param cents - Amount in cents (integer)
 * @param currency - ISO 4217 currency code
 * @returns Formatted string like "$10.99"
 */
export function formatMoney(cents: number, currency: string, decimals: number = 2): string {
  // JPY and other zero-decimal currencies
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
  const isZeroDecimal = zeroDecimalCurrencies.includes(currency.toUpperCase());
  
  const amount = isZeroDecimal ? cents : cents / 100;
  
  // If zero decimal currency, force 0 decimals regardless of setting
  const fractionalDigits = isZeroDecimal ? 0 : decimals;

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: fractionalDigits,
    maximumFractionDigits: fractionalDigits,
  }).format(amount);
}

/**
 * Parse a display amount to cents
 * @param amount - Decimal amount (e.g., 10.99)
 * @param currency - ISO 4217 currency code
 * @returns Amount in cents (integer)
 */
export function parseToCents(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
  const isZeroDecimal = zeroDecimalCurrencies.includes(currency.toUpperCase());
  
  return isZeroDecimal ? Math.round(amount) : Math.round(amount * 100);
}
