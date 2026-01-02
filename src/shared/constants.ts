/**
 * Application Constants
 * 
 * Centralized location for all magic numbers and configuration values.
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const TIME = {
    /** Debounce delay for search inputs (ms) */
    SEARCH_DEBOUNCE: 500,
    /** Debounce delay for form auto-save (ms) */
    AUTOSAVE_DEBOUNCE: 1000,
    /** Toast notification display duration (ms) */
    TOAST_DURATION: 5000,
    /** API request timeout (ms) */
    API_TIMEOUT: 30000,
    /** Price refresh interval (ms) */
    PRICE_REFRESH_INTERVAL: 60000,
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
    /** Default page size for lists */
    DEFAULT_PAGE_SIZE: 25,
    /** Maximum items per page */
    MAX_PAGE_SIZE: 100,
    /** Transaction history default limit */
    TRANSACTION_LIMIT: 50,
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const LIMITS = {
    /** Maximum file size for imports (bytes) */
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    /** Maximum length for text fields */
    MAX_TEXT_LENGTH: 500,
    /** Maximum length for notes */
    MAX_NOTES_LENGTH: 2000,
    /** Maximum decimal places for money */
    MONEY_DECIMALS: 2,
    /** Maximum transactions per import */
    MAX_IMPORT_TRANSACTIONS: 10000,
} as const;

// ============================================================================
// PREMIUM PERIODS
// ============================================================================

export const PREMIUM_PERIODS = [
    { value: 'monthly', label: 'Monthly', multiplier: 12 },
    { value: 'quarterly', label: 'Quarterly', multiplier: 4 },
    { value: 'semiannual', label: 'Semi-annual', multiplier: 2 },
    { value: 'annual', label: 'Annual', multiplier: 1 },
    { value: 'one-time', label: 'One-time', multiplier: 0 },
] as const;

export type PremiumPeriod = typeof PREMIUM_PERIODS[number]['value'];

// ============================================================================
// ASSET TYPES
// ============================================================================

export const ASSET_TYPES = [
    { value: 'stock', label: 'Stock', icon: 'trending-up' },
    { value: 'etf', label: 'ETF', icon: 'pie-chart' },
    { value: 'crypto', label: 'Cryptocurrency', icon: 'bitcoin' },
    { value: 'bond', label: 'Bond', icon: 'shield' },
    { value: 'fund', label: 'Mutual Fund', icon: 'layers' },
    { value: 'other', label: 'Other', icon: 'plus-circle' },
] as const;

export type AssetType = typeof ASSET_TYPES[number]['value'];

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

export const ACCOUNT_TYPES = [
    { value: 'checking', label: 'Checking', icon: 'credit-card' },
    { value: 'savings', label: 'Savings', icon: 'piggy-bank' },
    { value: 'investment', label: 'Investment', icon: 'trending-up' },
    { value: 'crypto', label: 'Crypto Wallet', icon: 'bitcoin' },
    { value: 'credit', label: 'Credit Card', icon: 'credit-card' },
    { value: 'loan', label: 'Loan', icon: 'minus-circle' },
    { value: 'cash', label: 'Cash', icon: 'banknote' },
] as const;

export type AccountType = typeof ACCOUNT_TYPES[number]['value'];

// ============================================================================
// INSURANCE TYPES
// ============================================================================

export const INSURANCE_TYPES = [
    { value: 'life', label: 'Life Insurance' },
    { value: 'health', label: 'Health Insurance' },
    { value: 'auto', label: 'Auto Insurance' },
    { value: 'home', label: 'Home Insurance' },
    { value: 'travel', label: 'Travel Insurance' },
    { value: 'other', label: 'Other' },
] as const;

export type InsuranceType = typeof INSURANCE_TYPES[number]['value'];

// ============================================================================
// PROPERTY TYPES
// ============================================================================

export const PROPERTY_TYPES = [
    { value: 'residence', label: 'Primary Residence' },
    { value: 'vacation', label: 'Vacation Home' },
    { value: 'rental', label: 'Rental Property' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'land', label: 'Land' },
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number]['value'];

// ============================================================================
// CONSTRAINT TYPES (Deposits)
// ============================================================================

export const CONSTRAINT_TYPES = [
    { value: 'fixed', label: 'Fixed Term' },
    { value: 'flexible', label: 'Flexible/Recallable' },
] as const;

export type ConstraintType = typeof CONSTRAINT_TYPES[number]['value'];

// ============================================================================
// INTEREST PERIODICITIES
// ============================================================================

export const INTEREST_PERIODICITIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semiannual', label: 'Semi-annual' },
    { value: 'annual', label: 'Annual' },
    { value: 'atMaturity', label: 'At Maturity' },
] as const;

export type InterestPeriodicity = typeof INTEREST_PERIODICITIES[number]['value'];
