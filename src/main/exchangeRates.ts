import yahooFinance from 'yahoo-finance2';
import { app } from 'electron';
import { join } from 'path';
import fs from 'fs-extra';
import { SUPPORTED_CURRENCIES } from '../shared/types';

interface ExchangeRateCache {
  base: string;
  rates: Record<string, number>; // e.g. "USD": 1.05
  timestamp: number;
}

const CACHE_FILE = 'exchange_rates.json';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class ExchangeRateManager {
  private cachePath: string;

  constructor() {
    this.cachePath = join(app.getPath('userData'), CACHE_FILE);
  }

  /**
   * Get exchange rates for the given base currency.
   * Returns a map of currency codes to rates (e.g. 1 Base = X Target).
   */
  async getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
    try {
      // 1. Check cache
      const cached = await this.readCache();
      if (cached && cached.base === baseCurrency && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.rates;
      }

      // 2. Fetch fresh rates
      const rates = await this.fetchRates(baseCurrency);
      
      // 3. Update cache
      await this.writeCache(baseCurrency, rates);
      
      return rates;
    } catch (error) {
      console.error('Failed to get exchange rates:', error);
      // Fallback to cache if available even if stale
      const cached = await this.readCache();
      if (cached && cached.base === baseCurrency) {
        return cached.rates;
      }
      // Ultimate fallback: 1:1 rates
      const fallback: Record<string, number> = {};
      SUPPORTED_CURRENCIES.forEach(c => fallback[c.code] = 1);
      return fallback;
    }
  }

  private async fetchRates(base: string): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    // Yahoo Finance quotes for currencies usually look like "EURUSD=X" (EUR to USD)
    // We want 1 Base = ? Target
    // So if Base = EUR, we query EURUSD=X, EURGBP=X, etc.
    
    const symbols = SUPPORTED_CURRENCIES
      .filter(c => c.code !== base)
      .map(c => `${base}${c.code}=X`);
    
    if (symbols.length === 0) return { [base]: 1 };

    try {
      const results = await yahooFinance.quote(symbols);
      
      // Initialize with base = 1
      rates[base] = 1;

      // Ensure results is array
      const quotes = (Array.isArray(results) ? results : [results]) as any[];

      quotes.forEach(quote => {
        // Symbol is like "EURUSD=X"
        const target = quote.symbol.replace(base, '').replace('=X', '');
        if (typeof quote.regularMarketPrice === 'number') {
          rates[target] = quote.regularMarketPrice;
        }
      });
      
      // Fill in any missing with 1 (or handle error)
      SUPPORTED_CURRENCIES.forEach(c => {
        if (!rates[c.code]) rates[c.code] = 1;
      });

      return rates;

    } catch (e) {
      console.error('Yahoo Finance rate fetch error:', e);
      // If batch fails, maybe try individual? For now rethrow
      throw e;
    }
  }

  private async readCache(): Promise<ExchangeRateCache | null> {
    try {
      if (await fs.pathExists(this.cachePath)) {
        return await fs.readJson(this.cachePath);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  private async writeCache(base: string, rates: Record<string, number>): Promise<void> {
    try {
      await fs.writeJson(this.cachePath, {
        base,
        rates,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to write rate cache:', e);
    }
  }
}

export const exchangeRateManager = new ExchangeRateManager();
