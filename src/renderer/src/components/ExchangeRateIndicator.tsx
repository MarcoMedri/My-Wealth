/**
 * ExchangeRateIndicator Component
 * Shows visual feedback about exchange rate status (loading, error, stale)
 */

import { useExchangeRates } from '../store/useExchangeRates';
import { useNetWorth } from '../hooks/useNetWorth';
import { Loader2, AlertTriangle, RefreshCw, Check, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface ExchangeRateIndicatorProps {
    className?: string;
    showLabel?: boolean;
}

export function ExchangeRateIndicator({ className, showLabel = true }: ExchangeRateIndicatorProps) {
    const { t } = useTranslation();
    const { isRatesLoading, ratesError, isRatesStale, ratesLastUpdated, baseCurrency } = useNetWorth();
    const fetchRates = useExchangeRates(state => state.fetchRates);

    const handleRefresh = () => {
        fetchRates();
    };

    // Format last updated time
    const getLastUpdatedText = () => {
        if (!ratesLastUpdated) return t('exchangeRates.never', 'Never');
        const date = new Date(ratesLastUpdated);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return t('exchangeRates.justNow', 'Just now');
        if (diffMins < 60) return t('exchangeRates.minsAgo', '{{mins}}m ago', { mins: diffMins });
        if (diffHours < 24) return t('exchangeRates.hoursAgo', '{{hours}}h ago', { hours: diffHours });
        return date.toLocaleDateString();
    };

    // Loading state
    if (isRatesLoading) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-foreground-muted", className)}>
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                {showLabel && <span>{t('exchangeRates.loading', 'Loading rates...')}</span>}
            </div>
        );
    }

    // Error state
    if (ratesError) {
        return (
            <button
                onClick={handleRefresh}
                className={cn(
                    "flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors",
                    className
                )}
                title={t('exchangeRates.clickToRetry', 'Click to retry')}
            >
                <AlertTriangle className="w-4 h-4" />
                {showLabel && <span>{t('exchangeRates.error', 'Rate error')}</span>}
                <RefreshCw className="w-3 h-3" />
            </button>
        );
    }

    // Stale state (rates older than 24h)
    if (isRatesStale) {
        return (
            <button
                onClick={handleRefresh}
                className={cn(
                    "flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors",
                    className
                )}
                title={t('exchangeRates.staleRates', 'Rates may be outdated, click to refresh')}
            >
                <Clock className="w-4 h-4" />
                {showLabel && <span>{t('exchangeRates.stale', 'Stale rates')}</span>}
                <RefreshCw className="w-3 h-3" />
            </button>
        );
    }

    // Success state - rates are fresh
    return (
        <div
            className={cn(
                "flex items-center gap-2 text-sm text-foreground-subtle group cursor-default",
                className
            )}
            title={`${t('exchangeRates.baseLabel', 'Base')}: ${baseCurrency} · ${t('exchangeRates.updated', 'Updated')}: ${getLastUpdatedText()}`}
        >
            <Check className="w-4 h-4 text-emerald-500" />
            {showLabel && (
                <span className="text-foreground-muted">
                    {baseCurrency} · {getLastUpdatedText()}
                </span>
            )}
            <button
                onClick={handleRefresh}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background-muted rounded"
                title={t('exchangeRates.refresh', 'Refresh rates')}
            >
                <RefreshCw className="w-3 h-3 text-foreground-muted" />
            </button>
        </div>
    );
}
