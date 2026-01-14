/**
 * Centralized Yahoo Finance Service
 * 
 * Provides a singleton instance with:
 * - Request queue to serialize all API calls
 * - Rate limit detection and automatic backoff
 * - Disk-based price caching
 */

import yahooFinanceModule from 'yahoo-finance2';
import { app } from 'electron';
import { join } from 'path';
import fs from 'fs-extra';
import { logger } from './services/LoggerService';

// Handle CommonJS/ESM interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YahooFinanceModule = (yahooFinanceModule as any).default || yahooFinanceModule;

/**
 * Price cache entry stored on disk
 */
interface PriceCacheEntry {
  price: number;         // in cents
  previousClose: number; // in cents
  timestamp: number;
  currency: string;
}

interface PriceCacheFile {
  version: number;
  entries: Record<string, PriceCacheEntry>;
}

/**
 * Request queue item
 */
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

// Constants
const MIN_REQUEST_DELAY_MS = 5000;      // Minimum 5 seconds between requests
const RATE_LIMIT_PAUSE_MS = 60 * 60 * 1000; // 1 hour pause on 429 (Yahoo is aggressive)
const PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PRICE_CACHE_FILE = 'yahoo_price_cache.json';

class YahooService {
  private yahooFinance: typeof YahooFinanceModule;
  private requestQueue: QueuedRequest<unknown>[] = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private rateLimitedUntil = 0;
  private priceCachePath: string;
  private priceCache: PriceCacheFile = { version: 1, entries: {} };
  private initialized = false;

  constructor() {
    // Initialize Yahoo Finance instance
    this.yahooFinance = typeof YahooFinanceModule === 'function' 
      ? new YahooFinanceModule() 
      : YahooFinanceModule;
    
    this.priceCachePath = join(app.getPath('userData'), PRICE_CACHE_FILE);
    
    logger.info('[YahooService] Initialized');
  }

  /**
   * Load price cache from disk
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (await fs.pathExists(this.priceCachePath)) {
        this.priceCache = await fs.readJson(this.priceCachePath);
        logger.info('[YahooService] Price cache loaded', { 
          entries: Object.keys(this.priceCache.entries).length 
        });
      }
    } catch (error) {
      logger.warn('[YahooService] Failed to load price cache, starting fresh', { error });
      this.priceCache = { version: 1, entries: {} };
    }
    
    this.initialized = true;
  }

  /**
   * Save price cache to disk
   */
  private async savePriceCache(): Promise<void> {
    try {
      await fs.writeJson(this.priceCachePath, this.priceCache);
    } catch (error) {
      logger.error('[YahooService] Failed to save price cache', { error });
    }
  }

  /**
   * Check if we're currently rate limited
   */
  isRateLimited(): boolean {
    return Date.now() < this.rateLimitedUntil;
  }

  /**
   * Get rate limit remaining time in seconds
   */
  getRateLimitRemainingSeconds(): number {
    if (!this.isRateLimited()) return 0;
    return Math.ceil((this.rateLimitedUntil - Date.now()) / 1000);
  }

  /**
   * Get cached price for a symbol if valid
   */
  getCachedPrice(symbol: string): PriceCacheEntry | null {
    const entry = this.priceCache.entries[symbol];
    if (!entry) return null;
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > PRICE_CACHE_TTL_MS) {
      return null; // Expired
    }
    
    return entry;
  }

  /**
   * Set cached price for a symbol
   */
  setCachedPrice(symbol: string, price: number, previousClose: number, currency: string): void {
    this.priceCache.entries[symbol] = {
      price,
      previousClose,
      timestamp: Date.now(),
      currency
    };
    
    // Save async, don't wait
    this.savePriceCache().catch(() => {});
  }

  /**
   * Get last update timestamp for a symbol
   */
  getLastUpdateTime(symbol: string): Date | null {
    const entry = this.priceCache.entries[symbol];
    if (!entry) return null;
    return new Date(entry.timestamp);
  }

  /**
   * Queue a Yahoo Finance request for execution
   * Requests are serialized with minimum delay between them
   */
  private queueRequest<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check rate limit
      if (this.isRateLimited()) {
        const waitTime = this.rateLimitedUntil - Date.now();
        logger.warn('[YahooService] Rate limited, waiting', { waitSeconds: Math.ceil(waitTime / 1000) });
        await this.sleep(waitTime);
      }

      // Ensure minimum delay between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_DELAY_MS) {
        await this.sleep(MIN_REQUEST_DELAY_MS - timeSinceLastRequest);
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        this.lastRequestTime = Date.now();
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        // Check for rate limit error
        if (this.isRateLimitError(error)) {
          logger.error('[YahooService] Rate limit detected (429), pausing for 5 minutes');
          this.rateLimitedUntil = Date.now() + RATE_LIMIT_PAUSE_MS;
          request.reject(new Error('Yahoo Finance rate limited. Please wait 5 minutes before retrying.'));
        } else {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Check if an error is a rate limit error (including crumb failures)
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      return msg.includes('429') || 
             msg.includes('too many requests') ||
             msg.includes('rate limit') ||
             msg.includes('failed to get crumb'); // Crumb failure is also rate limiting
    }
    return false;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Public API ====================

  /**
   * Search for securities
   */
  async search(query: string): Promise<unknown> {
    await this.init();
    
    return this.queueRequest(async () => {
      logger.info('[YahooService] Searching', { query });
      return await this.yahooFinance.search(query);
    });
  }

  /**
   * Get quote for a single symbol
   */
  async quote(symbol: string): Promise<unknown> {
    await this.init();
    
    // Check cache first
    const cached = this.getCachedPrice(symbol);
    if (cached) {
      logger.info('[YahooService] Using cached price', { 
        symbol, 
        price: cached.price / 100,
        age: Math.round((Date.now() - cached.timestamp) / 1000 / 60) + ' min'
      });
      return {
        symbol,
        regularMarketPrice: cached.price / 100,
        regularMarketPreviousClose: cached.previousClose / 100,
        currency: cached.currency,
        _fromCache: true
      };
    }
    
    // Check rate limit BEFORE trying to fetch
    if (this.isRateLimited()) {
      const remainingMinutes = Math.ceil(this.getRateLimitRemainingSeconds() / 60);
      logger.warn('[YahooService] Skipping fetch due to rate limit', { symbol, remainingMinutes });
      throw new Error(`Yahoo Finance rate limited. Try again in ${remainingMinutes} minutes.`);
    }
    
    return this.queueRequest(async () => {
      logger.info('[YahooService] Fetching quote', { symbol });
      const quote = await this.yahooFinance.quote(symbol);
      
      // Cache the result
      if (quote && quote.regularMarketPrice) {
        this.setCachedPrice(
          symbol,
          Math.round(quote.regularMarketPrice * 100),
          Math.round((quote.regularMarketPreviousClose || 0) * 100),
          quote.currency || 'USD'
        );
      }
      
      return quote;
    });
  }

  /**
   * Get asset profile (sector, industry, country, etc.)
   */
  async getAssetProfile(symbol: string): Promise<any> {
    await this.init();

    // Check rate limit
    if (this.isRateLimited()) {
       throw new Error(`Yahoo Finance rate limited.`);
    }

    return this.queueRequest(async () => {
      logger.info('[YahooService] Fetching asset profile', { symbol });
      const result = await this.yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'price'] });
      return result;
    });
  }

  /**
   * Get quotes for multiple symbols (batched)
   */
  async quotes(symbols: string[]): Promise<unknown[]> {
    await this.init();
    
    const results: unknown[] = [];
    const symbolsToFetch: string[] = [];
    
    // Check cache for each symbol
    for (const symbol of symbols) {
      const cached = this.getCachedPrice(symbol);
      if (cached) {
        results.push({
          symbol,
          regularMarketPrice: cached.price / 100,
          regularMarketPreviousClose: cached.previousClose / 100,
          currency: cached.currency,
          _fromCache: true
        });
      } else {
        symbolsToFetch.push(symbol);
      }
    }
    
    // Fetch uncached symbols one by one (to respect rate limits)
    for (const symbol of symbolsToFetch) {
      try {
        const quote = await this.quote(symbol);
        results.push(quote);
      } catch (error) {
        logger.error('[YahooService] Failed to fetch quote', { symbol, error });
        // Don't fail entirely, just skip this symbol
      }
    }
    
    return results;
  }

  /**
   * Clear all cached prices (for testing)
   */
  async clearCache(): Promise<void> {
    this.priceCache = { version: 1, entries: {} };
    await this.savePriceCache();
    logger.info('[YahooService] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { total: number; valid: number; expired: number } {
    const entries = Object.entries(this.priceCache.entries);
    const now = Date.now();
    
    let valid = 0;
    let expired = 0;
    
    for (const [, entry] of entries) {
      if (now - entry.timestamp > PRICE_CACHE_TTL_MS) {
        expired++;
      } else {
        valid++;
      }
    }
    
    return { total: entries.length, valid, expired };
  }
}

// Singleton instance
let instance: YahooService | null = null;

export function getYahooService(): YahooService {
  if (!instance) {
    instance = new YahooService();
  }
  return instance;
}

export { YahooService };
