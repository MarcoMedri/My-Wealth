/**
 * useCurrencyConverter Hook
 * Provides currency conversion functionality independent of net worth calculation.
 * 
 * This hook can be used by any component that needs to convert amounts between currencies
 * without the overhead of computing net worth.
 */

import { useCallback } from 'react';
import { useExchangeRates } from '../store/useExchangeRates';
import { useSettingsStore } from '../store/useSettingsStore';

interface CurrencyConverterResult {
    /**
     * Convert an amount from a source currency to the user's base currency.
     * 
     * @param amount - The amount to convert
     * @param fromCurrency - The currency code of the amount (e.g., 'USD', 'EUR')
     * @returns The converted amount in the base currency
     */
    convert: (amount: number, fromCurrency: string) => number;
    
    /** The user's selected base currency */
    baseCurrency: string;
    
    /** Whether exchange rates are currently loading */
    isLoading: boolean;
    
    /** Error message if rates failed to load */
    error: string | null;
    
    /** Timestamp of last successful rate fetch */
    lastUpdated: number;
    
    /** Whether rates are stale (older than 24 hours) */
    isStale: boolean;
    
    /** Force a refresh of exchange rates */
    refreshRates: () => Promise<void>;
}

export function useCurrencyConverter(): CurrencyConverterResult {
    const baseCurrency = useSettingsStore(state => state.currency);
    const getRate = useExchangeRates(state => state.getRate);
    const isLoading = useExchangeRates(state => state.isLoading);
    const error = useExchangeRates(state => state.error);
    const lastUpdated = useExchangeRates(state => state.lastUpdated);
    const fetchRates = useExchangeRates(state => state.fetchRates);

    /**
     * Convert an amount from a source currency to the user's base currency.
     * 
     * Exchange rates are stored as: 1 Base = X Target
     * Example: If base=EUR and rates[USD]=1.10, then 1 EUR = 1.10 USD
     * 
     * To convert 100 USD to EUR: 100 / 1.10 = 90.91 EUR
     */
    const convert = useCallback((amount: number, fromCurrency: string): number => {
        // Same currency - no conversion needed
        if (fromCurrency === baseCurrency) return amount;
        
        // Get rate for source currency
        const rate = getRate(fromCurrency);
        
        // Safety checks
        if (rate === undefined || rate === null) {
            console.warn(`Missing exchange rate for ${fromCurrency}, using 1:1`);
            return amount;
        }
        if (rate <= 0) {
            console.warn(`Invalid exchange rate for ${fromCurrency}: ${rate}, using 1:1`);
            return amount;
        }
        
        // Convert: amount in fromCurrency / rate = amount in baseCurrency
        return amount / rate;
    }, [baseCurrency, getRate]);

    // Check if rates are stale (older than 24 hours)
    const isStale = !lastUpdated || (Date.now() - lastUpdated > 1000 * 60 * 60 * 24);

    return {
        convert,
        baseCurrency,
        isLoading,
        error,
        lastUpdated,
        isStale,
        refreshRates: fetchRates
    };
}
