import { useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { formatMoney as sharedFormatMoney } from '../../../shared/schemas';

/**
 * Hook to format money using the global settings (currency, decimals)
 */
export function useFormatMoney() {
  const decimals = useSettingsStore(state => state.decimals);

  /**
   * Format cents to display string
   * @param cents Amount in cents
   * @param currencyCode Optional currency override (defaults to 'EUR' if not passed, though function expects it)
   */
  const formatMoney = useCallback((cents: number, currencyCode: string) => {
    return sharedFormatMoney(cents, currencyCode, decimals);
  }, [decimals]);

  return formatMoney;
}
