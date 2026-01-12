import { getYahooService } from './yahooService';
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
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days (reduced API calls)

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
      console.warn('Failed to get exchange rates (using defaults):', error instanceof Error ? error.message : String(error));
      // Fallback to cache if available even if stale
      const cached = await this.readCache();
      if (cached && cached.base === baseCurrency) {
        return cached.rates;
      }
      // Fallback to defaults if API fails (e.g. 429 Too Many Requests) and no cache, or cache is for a different base
      if (baseCurrency === 'EUR') {
        return {
          EUR: 1,
          USD: 1.05, // Approximate fallback
          GBP: 0.85,
          CHF: 0.95,
          JPY: 160
        };
      }
      // Ultimate fallback: 1:1 rates
      const fallback: Record<string, number> = {};
      SUPPORTED_CURRENCIES.forEach(c => fallback[c.code] = 1);
      return fallback;
    }
  }

  private async fetchRates(base: string): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    const yahooService = getYahooService();
    
    // Yahoo Finance quotes for currencies usually look like "EURUSD=X" (EUR to USD)
    // We want 1 Base = ? Target
    // So if Base = EUR, we query EURUSD=X, EURGBP=X, etc.
    
    const targetCurrencies = SUPPORTED_CURRENCIES
      .filter(c => c.code !== base)
      .map(c => c.code);
    
    if (targetCurrencies.length === 0) return { [base]: 1 };
    
    // Initialize with base = 1
    rates[base] = 1;

    // Check if rate limited
    if (yahooService.isRateLimited()) {
      console.warn('[ExchangeRateManager] Yahoo Finance rate limited, using fallback');
      throw new Error('Yahoo Finance rate limited');
    }

    // Fetch rates one by one (YahooService handles rate limiting)
    for (const target of targetCurrencies) {
      const symbol = `${base}${target}=X`;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote = await yahooService.quote(symbol) as any;
        
        if (quote && quote.regularMarketPrice) {
          rates[target] = quote.regularMarketPrice;
        }
      } catch (error) {
        console.warn(`[ExchangeRateManager] Failed to fetch ${symbol}:`, error instanceof Error ? error.message : String(error));
        // Continue with other currencies, don't fail entirely
      }
    }

    console.log(`[ExchangeRateManager] Fetched ${Object.keys(rates).length} rates for ${base}`);
    return rates;
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

// Lazy-loaded singleton to avoid Electron app access at import time (breaks tests)
let _exchangeRateManager: ExchangeRateManager | null = null;

export function getExchangeRateManager(): ExchangeRateManager {
  if (!_exchangeRateManager) {
    _exchangeRateManager = new ExchangeRateManager();
  }
  return _exchangeRateManager;
}

// Keep for backwards compatibility but prefer getExchangeRateManager()
export const exchangeRateManager = {
  getExchangeRates: async (baseCurrency: string) => getExchangeRateManager().getExchangeRates(baseCurrency)
};
