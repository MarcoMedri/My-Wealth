/**
 * Application Configuration
 * 
 * Centralized configuration with environment-aware defaults.
 */

// Detect environment
const isDev = process.env.NODE_ENV === 'development';

export const config = {
    // ========== Application ==========
    app: {
        name: 'MyWealth',
        version: process.env.npm_package_version || '0.1.0',
        isDev,
        isProduction: !isDev,
    },

    // ========== API Settings ==========
    api: {
        /** Yahoo Finance API timeout (ms) */
        yahooTimeout: 10000,
        /** Price update interval (ms) */
        priceRefreshInterval: isDev ? 300000 : 60000, // 5min dev, 1min prod
        /** Maximum retries for failed requests */
        maxRetries: 3,
        /** Retry delay base (ms) - will be multiplied by attempt number */
        retryDelayBase: 1000,
    },

    // ========== Storage ==========
    storage: {
        /** Max backup files to keep */
        maxBackups: 10,
        /** Auto-save debounce (ms) */
        autoSaveDelay: 2000,
    },

    // ========== UI Settings ==========
    ui: {
        /** Toast duration (ms) */
        toastDuration: 5000,
        /** Search debounce (ms) */
        searchDebounce: 500,
        /** Animation duration (ms) */
        animationDuration: 200,
    },

    // ========== Chart Settings ==========
    charts: {
        /** Default chart period */
        defaultPeriod: '1y' as const,
        /** Available periods */
        availablePeriods: ['1m', '3m', '6m', '1y', 'ytd', 'all'] as const,
        /** Net worth chart color */
        netWorthColor: '#6366f1',
        /** Positive change color */
        positiveColor: '#10b981',
        /** Negative change color */
        negativeColor: '#ef4444',
    },

    // ========== Validation ==========
    validation: {
        /** Minimum password length (if auth added) */
        minPasswordLength: 8,
        /** Maximum notes length */
        maxNotesLength: 2000,
        /** Maximum file import size (bytes) */
        maxImportFileSize: 10 * 1024 * 1024, // 10MB
    },

    // ========== Defaults ==========
    defaults: {
        /** Default currency for new items */
        currency: 'EUR',
        /** Default date format */
        dateFormat: 'YYYY-MM-DD',
        /** Default number of transactions to show */
        transactionLimit: 50,
    },
} as const;

export type Config = typeof config;

/**
 * Get a nested config value safely
 */
export function getConfig<T>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: unknown = config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = (value as Record<string, unknown>)[key];
        } else {
            return defaultValue as T;
        }
    }
    
    return value as T;
}
