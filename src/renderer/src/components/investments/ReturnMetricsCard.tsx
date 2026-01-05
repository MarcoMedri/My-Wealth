import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';
import { cn } from '../../lib/utils';

interface PerformanceMetrics {
    twr: number;
    mwr: number;
    startValue: number;
    endValue: number;
    totalCashFlow: number;
    absoluteGain: number;
    period: string;
}

export function ReturnMetricsCard() {
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const currency = useSettingsStore(state => state.currency);

    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const data = await window.api.getPerformanceMetrics('YTD');
                setMetrics(data);
            } catch (error) {
                console.error('Failed to load performance metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, []);

    if (loading) {
        return (
            <div className="bg-background-card rounded-xl border border-border p-6 flex items-center justify-center min-h-[140px]">
                <Loader2 className="w-6 h-6 animate-spin text-foreground-muted" />
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="bg-background-card rounded-xl border border-border p-6 flex items-center justify-center min-h-[140px]">
                <p className="text-sm text-foreground-muted">{t('common.noData')}</p>
            </div>
        );
    }

    const formatPercent = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${(value * 100).toFixed(2)}%`;
    };

    return (
        <div className="bg-background-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">
                    {t('investments.performance.title', 'Performance Metrics')}
                </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* TWR */}
                <MetricItem
                    label={t('investments.performance.twr', 'TWR')}
                    description={t('investments.performance.twrDescription', 'Time-Weighted Return')}
                    value={formatPercent(metrics.twr)}
                    isPositive={metrics.twr >= 0}
                />

                {/* MWR */}
                <MetricItem
                    label={t('investments.performance.mwr', 'MWR')}
                    description={t('investments.performance.mwrDescription', 'Money-Weighted Return')}
                    value={formatPercent(metrics.mwr)}
                    isPositive={metrics.mwr >= 0}
                />

                {/* Absolute Gain */}
                <MetricItem
                    label={t('investments.performance.absoluteReturn', 'Absolute')}
                    description={t('investments.performance.absoluteDescription', 'Total Gain/Loss')}
                    value={formatMoney(metrics.absoluteGain, currency)}
                    isPositive={metrics.absoluteGain >= 0}
                />
            </div>
        </div>
    );
}

interface MetricItemProps {
    label: string;
    description: string;
    value: string;
    isPositive: boolean;
}

function MetricItem({ label, description, value, isPositive }: MetricItemProps) {
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-success' : 'text-error';

    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn('w-4 h-4', colorClass)} />
                <span className="text-xs font-medium text-foreground-muted uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <span className={cn('text-xl font-bold', colorClass)}>
                {value}
            </span>
            <span className="text-xs text-foreground-subtle mt-0.5">
                {description}
            </span>
        </div>
    );
}
