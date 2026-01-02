/**
 * Supported Currencies
 * 
 * Centralized currency definitions with symbols and metadata.
 */

export interface Currency {
    code: string;
    name: string;
    symbol: string;
    decimalDigits: number;
    /** Position of symbol: 'before' ($100) or 'after' (100€) */
    symbolPosition: 'before' | 'after';
    /** Thousands separator */
    thousandsSeparator: string;
    /** Decimal separator */
    decimalSeparator: string;
}

export const CURRENCIES: Record<string, Currency> = {
    EUR: {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalDigits: 2,
        symbolPosition: 'after',
        thousandsSeparator: '.',
        decimalSeparator: ',',
    },
    USD: {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalDigits: 2,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
    GBP: {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalDigits: 2,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
    CHF: {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'CHF',
        decimalDigits: 2,
        symbolPosition: 'after',
        thousandsSeparator: "'",
        decimalSeparator: '.',
    },
    JPY: {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalDigits: 0,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
    CAD: {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'CA$',
        decimalDigits: 2,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
    AUD: {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalDigits: 2,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
    CNY: {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalDigits: 2,
        symbolPosition: 'before',
        thousandsSeparator: ',',
        decimalSeparator: '.',
    },
} as const;

/**
 * Get currency by code with fallback
 */
export function getCurrency(code: string): Currency {
    return CURRENCIES[code] || CURRENCIES.USD;
}

/**
 * Get list of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
    return Object.keys(CURRENCIES);
}

/**
 * Format amount with currency (unified function)
 */
export function formatCurrency(
    amount: number,
    currencyCode: string,
    options?: {
        showSymbol?: boolean;
        compact?: boolean;
    }
): string {
    const currency = getCurrency(currencyCode);
    const { showSymbol = true, compact = false } = options || {};

    // Convert from cents to units
    const value = amount / Math.pow(10, currency.decimalDigits);

    // Format number
    let formatted: string;
    if (compact && Math.abs(value) >= 1000) {
        if (Math.abs(value) >= 1000000) {
            formatted = (value / 1000000).toFixed(1) + 'M';
        } else {
            formatted = (value / 1000).toFixed(1) + 'K';
        }
    } else {
        formatted = value.toLocaleString('en-US', {
            minimumFractionDigits: currency.decimalDigits,
            maximumFractionDigits: currency.decimalDigits,
        });
        // Replace separators based on currency
        formatted = formatted
            .replace(/,/g, '{{THOUSANDS}}')
            .replace(/\./g, currency.decimalSeparator)
            .replace(/{{THOUSANDS}}/g, currency.thousandsSeparator);
    }

    // Add symbol
    if (showSymbol) {
        if (currency.symbolPosition === 'before') {
            return `${currency.symbol}${formatted}`;
        } else {
            return `${formatted} ${currency.symbol}`;
        }
    }

    return formatted;
}

/**
 * Parse currency string back to cents
 */
export function parseCurrency(value: string, currencyCode: string = 'EUR'): number {
    const currency = getCurrency(currencyCode);
    
    // Remove currency symbol and whitespace
    let cleaned = value.replace(currency.symbol, '').trim();
    
    // Normalize separators
    cleaned = cleaned
        .replace(new RegExp(`\\${currency.thousandsSeparator}`, 'g'), '')
        .replace(currency.decimalSeparator, '.');
    
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) return 0;
    
    // Convert to cents
    return Math.round(parsed * Math.pow(10, currency.decimalDigits));
}
