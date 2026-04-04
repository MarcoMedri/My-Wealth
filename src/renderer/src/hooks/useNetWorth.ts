import { useMemo } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import { useCurrencyConverter } from './useCurrencyConverter';

export function useNetWorth() {
    const {
        accountBalances,
        accounts,
        assets,
        holdings,
        properties,
        collectibles,
        insurance,
        deposits
    } = useVaultStore();

    // Use the separated currency converter hook
    const { 
        convert, 
        baseCurrency, 
        isLoading: isRatesLoading, 
        error: ratesError, 
        lastUpdated: ratesLastUpdated,
        isStale: isRatesStale 
    } = useCurrencyConverter();

    const totalNetWorth = useMemo(() => {
        // Build lookup maps once (O(n)) instead of .find() per item (O(n²))
        const accountMap = new Map(accounts.map(a => [a.id, a]));
        const assetMap = new Map(assets.map(a => [a.id, a]));

        let total = 0;

        // 1. Accounts
        Object.entries(accountBalances).forEach(([accountId, balance]) => {
            const account = accountMap.get(accountId);
            if (account) {
                total += convert(balance, account.currency);
            }
        });

        // 2. Investments
        holdings.forEach(h => {
             const asset = assetMap.get(h.assetId);
             if (asset) {
                 const value = h.quantity * asset.currentPrice;
                 total += convert(value, asset.currency);
             }
        });

        // 3. Properties
        properties.forEach(p => {
            const value = p.currentValue || p.purchasePrice || 0;
            total += convert(value, p.currency);
        });

        // 4. Collectibles
        collectibles.forEach(c => {
             const value = c.currentValue || c.purchasePrice || 0;
             total += convert(value, c.currency);
        });

        // 5. Insurance (Life/Investment policies)
        insurance.forEach(p => {
            const value = p.currentValue || 0;
            total += convert(value, p.currency);
        });
        
        // 6. Deposits
        deposits.forEach(d => {
            total += convert(d.principal, d.currency);
        });

        return total;
    }, [
        accountBalances, 
        accounts, 
        holdings, 
        assets, 
        properties, 
        collectibles,
        insurance,
        deposits,
        convert
    ]);

    return {
        netWorth: totalNetWorth,
        convert,
        baseCurrency,
        // Rate status for UI indicators
        isRatesLoading,
        ratesError,
        isRatesStale,
        ratesLastUpdated
    };
}

