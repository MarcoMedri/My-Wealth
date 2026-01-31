/**
 * Simple In-Memory Cache with TTL
 * 
 * For caching API responses, computed values, etc.
 */

interface CacheEntry<T> {
    value: T;
    expiry: number;
}

class MemoryCache {
    private cache = new Map<string, CacheEntry<unknown>>();
    private defaultTTL: number;

    constructor(defaultTTLMs: number = 60000) {
        this.defaultTTL = defaultTTLMs;
    }

    /**
     * Get a cached value
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) return null;
        
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value as T;
    }

    /**
     * Set a cached value
     */
    set<T>(key: string, value: T, ttlMs?: number): void {
        const expiry = Date.now() + (ttlMs ?? this.defaultTTL);
        this.cache.set(key, { value, expiry });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Delete a cached value
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cached values
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get or compute a value
     */
    async getOrSet<T>(
        key: string,
        factory: () => T | Promise<T>,
        ttlMs?: number
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) return cached;

        const value = await factory();
        this.set(key, value, ttlMs);
        return value;
    }

    /**
     * Remove expired entries
     */
    cleanup(): number {
        const now = Date.now();
        let removed = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
                removed++;
            }
        }
        
        return removed;
    }

    /**
     * Get cache stats
     */
    stats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/** Cache for API responses (1 minute default) */
export const apiCache = new MemoryCache(60000);

/** Cache for exchange rates (5 minutes) */
export const exchangeRateCache = new MemoryCache(300000);

/** Cache for computed values (10 seconds) */
export const computeCache = new MemoryCache(10000);

// ============================================================================
// CACHE KEY HELPERS
// ============================================================================

/**
 * Create a cache key from function name and arguments
 */
export function createCacheKey(prefix: string, ...args: unknown[]): string {
    return `${prefix}:${JSON.stringify(args)}`;
}

/**
 * Memoize an async function with caching
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    cache: MemoryCache,
    keyPrefix: string,
    ttlMs?: number
): T {
    return (async (...args: Parameters<T>) => {
        const key = createCacheKey(keyPrefix, ...args);
        return cache.getOrSet(key, () => fn(...args), ttlMs);
    }) as T;
}

export { MemoryCache };
