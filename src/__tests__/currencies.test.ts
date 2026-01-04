/**
 * Currency Utilities Tests
 * Tests for currency formatting, parsing, and lookup functions.
 */

import { describe, it, expect } from 'vitest';
import {
    CURRENCIES,
    getCurrency,
    getSupportedCurrencies,
    formatCurrency,
    parseCurrency
} from '../shared/currencies';

describe('Currency Utilities', () => {
    describe('CURRENCIES', () => {
        it('should have EUR defined with correct properties', () => {
            expect(CURRENCIES.EUR).toBeDefined();
            expect(CURRENCIES.EUR.code).toBe('EUR');
            expect(CURRENCIES.EUR.symbol).toBe('€');
            expect(CURRENCIES.EUR.decimalDigits).toBe(2);
            expect(CURRENCIES.EUR.symbolPosition).toBe('after');
        });

        it('should have USD defined with correct properties', () => {
            expect(CURRENCIES.USD).toBeDefined();
            expect(CURRENCIES.USD.code).toBe('USD');
            expect(CURRENCIES.USD.symbol).toBe('$');
            expect(CURRENCIES.USD.symbolPosition).toBe('before');
        });

        it('should have JPY with 0 decimal digits', () => {
            expect(CURRENCIES.JPY.decimalDigits).toBe(0);
        });
    });

    describe('getCurrency', () => {
        it('should return EUR for EUR code', () => {
            const currency = getCurrency('EUR');
            expect(currency.code).toBe('EUR');
        });

        it('should return USD for USD code', () => {
            const currency = getCurrency('USD');
            expect(currency.code).toBe('USD');
        });

        it('should fallback to USD for unknown currency', () => {
            const currency = getCurrency('UNKNOWN');
            expect(currency.code).toBe('USD');
        });
    });

    describe('getSupportedCurrencies', () => {
        it('should return array of currency codes', () => {
            const codes = getSupportedCurrencies();
            expect(Array.isArray(codes)).toBe(true);
            expect(codes).toContain('EUR');
            expect(codes).toContain('USD');
            expect(codes).toContain('GBP');
        });

        it('should have at least 5 currencies', () => {
            const codes = getSupportedCurrencies();
            expect(codes.length).toBeGreaterThanOrEqual(5);
        });
    });

    describe('formatCurrency', () => {
        it('should format EUR with symbol after', () => {
            // 10000 cents = €100.00
            const result = formatCurrency(10000, 'EUR');
            expect(result).toContain('€');
            expect(result).toContain('100');
        });

        it('should format USD with symbol before', () => {
            // 10000 cents = $100.00
            const result = formatCurrency(10000, 'USD');
            expect(result.startsWith('$')).toBe(true);
        });

        it('should format large amounts correctly', () => {
            // 1,000,000 cents = €10,000.00
            const result = formatCurrency(1000000, 'EUR');
            expect(result).toContain('10');
        });

        it('should handle compact mode for thousands', () => {
            // 500,000 cents = €5,000 -> 5.0K
            const result = formatCurrency(500000, 'EUR', { compact: true });
            expect(result).toContain('K');
        });

        it('should handle compact mode for millions', () => {
            // 100,000,000 cents = €1,000,000 -> 1.0M
            const result = formatCurrency(100000000, 'EUR', { compact: true });
            expect(result).toContain('M');
        });

        it('should hide symbol when showSymbol is false', () => {
            const result = formatCurrency(10000, 'EUR', { showSymbol: false });
            expect(result).not.toContain('€');
        });

        it('should format JPY without decimals', () => {
            // 1000 for JPY (no cents)
            const result = formatCurrency(1000, 'JPY');
            expect(result).toContain('¥');
            // Should not have decimal separator since JPY has 0 decimals
        });

        it('should handle zero amount', () => {
            const result = formatCurrency(0, 'EUR');
            expect(result).toContain('0');
        });

        it('should handle negative amounts', () => {
            const result = formatCurrency(-5000, 'EUR');
            expect(result).toContain('-');
            expect(result).toContain('50');
        });
    });

    describe('parseCurrency', () => {
        it('should parse EUR string to cents', () => {
            const result = parseCurrency('100,00 €', 'EUR');
            expect(result).toBe(10000);
        });

        it('should parse USD string to cents', () => {
            const result = parseCurrency('$100.00', 'USD');
            expect(result).toBe(10000);
        });

        it('should handle string without symbol', () => {
            const result = parseCurrency('50.00', 'USD');
            expect(result).toBe(5000);
        });

        it('should return 0 for invalid input', () => {
            const result = parseCurrency('invalid', 'EUR');
            expect(result).toBe(0);
        });

        it('should handle thousands separators', () => {
            const result = parseCurrency('1.000,00', 'EUR');
            expect(result).toBe(100000);
        });
    });
});
