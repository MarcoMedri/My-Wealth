import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './useSettingsStore';

interface ExchangeRatesState {
  rates: Record<string, number>; // 1 Base = X Target
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
  
  fetchRates: (force?: boolean) => Promise<void>; // Added force parameter
  getRate: (targetCurrency: string) => number;
  isCacheStale: () => boolean; // New helper
}

// Cache TTL: 30 minutes
const CACHE_TTL = 30 * 60 * 1000;

export const useExchangeRates = create<ExchangeRatesState>()(
  persist(
    (set, get) => ({
      rates: {},
      lastUpdated: 0,
      isLoading: false,
      error: null,

      isCacheStale: () => {
        const { lastUpdated } = get();
        if (!lastUpdated) return true;
        return (Date.now() - lastUpdated) > CACHE_TTL;
      },

      fetchRates: async (force = false) => {
        // Intelligent caching: Skip if cache is fresh and not forced
        if (!force && !get().isCacheStale()) {
          console.log('[ExchangeRates] Using cached rates (still fresh)');
          return;
        }

        const baseCurrency = useSettingsStore.getState().currency;
        set({ isLoading: true, error: null });
        try {
          console.log('[ExchangeRates] Fetching fresh rates...');
          const rates = await window.api.getExchangeRates(baseCurrency);
          set({ rates, lastUpdated: Date.now(), isLoading: false });
        } catch (error) {
          console.error('Failed to fetch rates:', error);
          set({ error: 'Failed to fetch rates', isLoading: false });
        }
      },

      getRate: (target: string) => {
        const { rates } = get();
        const base = useSettingsStore.getState().currency;
        
        // Same currency
        if (target === base) return 1;
        
        // Direct rate available
        if (rates[target]) return rates[target];
        
        // If we have rates relative to base, we expect 1 Base = X Target
        // If target is missing, return 1 as fallback (1:1) to avoid breaking UI
        return 1;
      }
    }),
    {
      name: 'exchange-rates-storage',
      partialize: (state) => ({ rates: state.rates, lastUpdated: state.lastUpdated }),
    }
  )
);
