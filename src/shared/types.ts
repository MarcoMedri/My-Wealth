/**
 * MyWealth Desktop - Shared Types
 * TypeScript interfaces and constants
 */

// ============================================================================
// Vault Structure Constants
// ============================================================================

export const VAULT_STRUCTURE = {
  ACCOUNTS_FILE: 'accounts.json',
  CATEGORIES_FILE: 'categories.json',
  TRANSACTIONS_DIR: 'transactions',
  SETTINGS_FILE: 'settings.json',
  BROKERS_FILE: 'brokers.json',
  SNAPSHOTS_FILE: 'snapshots.json',
} as const;

/**
 * Get the path for monthly transactions
 */
export function getTransactionPath(year: number, month: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `${VAULT_STRUCTURE.TRANSACTIONS_DIR}/${year}/${monthStr}/transactions.json`;
}

// ============================================================================
// Vault Status (for IPC)
// ============================================================================

export interface VaultStatus {
  isInitialized: boolean;
  vaultPath: string | null;
  isAccessible: boolean;
  error?: string;
}

// ============================================================================
// IPC Channel Names
// ============================================================================

export const IPC_CHANNELS = {
  // Vault operations
  VAULT_GET_STATUS: 'vault:getStatus',
  VAULT_SELECT_PATH: 'vault:selectPath',
  VAULT_INITIALIZE: 'vault:initialize',
  VAULT_LOAD: 'vault:load',
  VAULT_CREATE_SNAPSHOT: 'vault:createSnapshot',
  
  // Transaction operations
  TRANSACTION_SAVE: 'transaction:save',
  TRANSACTION_DELETE: 'transaction:delete',
  
  // Account operations
  ACCOUNT_SAVE: 'account:save',
  
  // Category operations
  CATEGORY_SAVE: 'category:save',
  CATEGORY_DELETE: 'category:delete',

  // Broker operations
  BROKER_SAVE: 'broker:save',
  BROKER_DELETE: 'broker:delete',
  
  // Import operations
  IMPORT_CSV_PREVIEW: 'import:csvPreview',
  IMPORT_CSV_EXECUTE: 'import:csvExecute',
  IMPORT_GET_PRESETS: 'import:getPresets',
  
  // Investment operations
  INVESTMENTS_SEARCH: 'investments:search',
  INVESTMENTS_GET_QUOTE: 'investments:getQuote',
  INVESTMENTS_BUY: 'investments:buy', // Creates Asset(if missing) + Holding + Transaction
  INVESTMENTS_BUY_MANUAL: 'investments:buyManual', // Manual asset entry without Yahoo lookup
  INVESTMENTS_SELL: 'investments:sell', // Sell holding, create income transaction, track gain/loss
  INVESTMENTS_REFRESH_PRICES: 'investments:refreshPrices', // Batch update all asset prices
  
  // Asset & Holding operations
  ASSET_DELETE: 'asset:delete',
  HOLDING_DELETE: 'holding:delete', // Snapshot mode - just remove holding
  
  // Dividend operations
  DIVIDEND_SAVE: 'dividend:save',
  DIVIDEND_DELETE: 'dividend:delete',
  
  // Real Estate operations
  PROPERTY_SAVE: 'property:save',
  PROPERTY_DELETE: 'property:delete',

  // Collectible operations
  COLLECTIBLE_SAVE: 'collectible:save',
  COLLECTIBLE_DELETE: 'collectible:delete',
  
  // Settings operations
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  
  // Exchange Rates
  EXCHANGE_RATES_GET: 'exchange-rates:get',

  // Developer operations (dev-only)
  DEV_SEED: 'dev:seed',
  DEV_CLEAR: 'dev:clear',
} as const;

import type { Transaction } from './schemas';

// ============================================================================
// INVESTMENT TYPES
// ============================================================================

export interface InvestmentSearchResult {
  symbol: string;
  name: string;
  type: string;
  currency: string;
  exchange: string;
}

export interface InvestmentQuote {
  symbol: string;
  price: number; // in cents
  currency: string;
  name?: string;
}

// ... CSV TYPES ...

// ============================================================================
// CSV IMPORT TYPES
// ============================================================================

export interface ColumnMapping {
  /** Column name/index for date */
  dateColumn: string;
  /** Column name/index for description/payee */
  descriptionColumn: string;
  /** Column name/index for amount (can be single column or debit/credit) */
  amountColumn?: string;
  /** Column for debit amounts (negative) - used if amountColumn is not set */
  debitColumn?: string;
  /** Column for credit amounts (positive) - used if amountColumn is not set */
  creditColumn?: string;
  /** Date format string (e.g., "DD/MM/YYYY", "YYYY-MM-DD", "MM/DD/YYYY") */
  dateFormat: string;
  /** Whether amounts are inverted (negative = income) */
  invertSign?: boolean;
  /** Decimal separator ("." or ",") */
  decimalSeparator?: '.' | ',';
  /** Columns to skip (header rows, etc.) */
  skipRows?: number;
  /** Currency code */
  currency?: string;
}

/** Parsed CSV row before conversion to Transaction */
export interface ParsedRow {
  date: Date;
  description: string;
  amount: number; // In cents, positive for income, negative for expense
  rawData: Record<string, string>;
}

/** Import result */
export interface ImportResult {
  success: boolean;
  transactions: Transaction[];
  errors: string[];
  skippedRows: number;
}

/** Preset for common bank formats */
export interface ImportPreset {
  id: string;
  name: string;
  description: string;
  mapping: ColumnMapping;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'AUD' | 'CNY';
export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; name: string; symbol: string }[] = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
];

export type SupportedLanguage = 'en' | 'it';
export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'it', name: 'Italiano' },
];

export type Theme = 'system' | 'light' | 'dark';
