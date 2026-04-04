import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedCurrency, SupportedLanguage, Theme, DateFormat, TimeFormat } from '../@my-wealth/shared/types';

interface SettingsState {
  currency: SupportedCurrency;
  language: SupportedLanguage;
  theme: Theme;
  decimals: number;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  hasCompletedTutorial: boolean;
  
  setCurrency: (currency: SupportedCurrency) => void;
  setLanguage: (language: SupportedLanguage) => void;
  setTheme: (theme: Theme) => void;
  setDecimals: (decimals: number) => void;
  setDateFormat: (format: DateFormat) => void;
  setTimeFormat: (format: TimeFormat) => void;
  setHasCompletedTutorial: (completed: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      currency: 'EUR', // Default as requested
      language: 'en', // Default to English
      theme: 'system', // Default as requested
      decimals: 2, // Default to 2 decimal places
      dateFormat: 'dd/MM/yyyy',
      timeFormat: 'HH:mm',
      hasCompletedTutorial: false,
      
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setDecimals: (decimals) => set({ decimals }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setHasCompletedTutorial: (hasCompletedTutorial) => set({ hasCompletedTutorial }),
    }),
    {
      name: 'my-wealth-settings',
      // We can add storage options here if needed, default is localStorage
      // partialize: (state) => ({ ... }) // to select what to persist
    }
  )
);
