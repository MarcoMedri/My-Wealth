import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { Holding, Asset } from '../../../../shared/schemas';
import { AddInvestmentModal } from './AddInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';
import { HoldingDetailModal } from './HoldingDetailModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { useFormatMoney } from '../../hooks/useFormatMoney';

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function InvestmentDashboard() {
    const { assets, holdings, accounts, brokers, refreshAllPrices, isLoading } = useVaultStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [sellModal, setSellModal] = useState<{ holding: Holding; asset: Asset } | null>(null);
    const [detailModal, setDetailModal] = useState<{ holding: Holding; asset: Asset } | null>(null);

    const { convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    // --- Metrics ---
    const metrics = useMemo(() => {
        let totalValue = 0;
        let totalCost = 0;
        let totalDayChange = 0;

        holdings.forEach(holding => {
            const asset = assets.find(a => a.id === holding.assetId);
            if (!asset) return;

            const value = holding.quantity * asset.currentPrice;
            const cost = holding.quantity * holding.averageBuyPrice;

            totalValue += convert(value, asset.currency);
            totalCost += convert(cost, asset.currency);

            if (asset.previousClose) {
                const previousValue = holding.quantity * asset.previousClose;
                const change = value - previousValue;
                totalDayChange += convert(change, asset.currency);
            }
        });

        const totalReturn = totalValue - totalCost;
        const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
        const dayChangePercent = totalValue > 0 && totalDayChange !== 0
            ? (totalDayChange / (totalValue - totalDayChange)) * 100
            : 0;

        return { totalValue, totalCost, totalReturn, returnPercent, totalDayChange, dayChangePercent };
    }, [assets, holdings, convert]);

    // --- Chart Data Helpers ---

    // 1. Asset Type Distribution
    const typeDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        holdings.forEach(h => {
            const asset = assets.find(a => a.id === h.assetId);
            if (!asset) return;
            const val = convert(h.quantity * asset.currentPrice, asset.currency);
            const type = asset.type === 'crypto' ? 'Crypto' : asset.type === 'etf' ? 'ETF' : 'Stock';
            dist[type] = (dist[type] || 0) + val;
        });
        return dist;
    }, [holdings, assets, convert]);

    // 2. Broker Distribution
    const brokerDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        holdings.forEach(h => {
            const asset = assets.find(a => a.id === h.assetId);
            const account = accounts.find(a => a.id === h.accountId);
            if (!asset || !account) return;

            const val = convert(h.quantity * asset.currentPrice, asset.currency);

            // Find Broker Name
            let brokerName = 'Unknown';
            if (account.brokerId) {
                const broker = brokers.find(b => b.id === account.brokerId);
                if (broker) brokerName = broker.name;
            } else {
                brokerName = account.name; // Fallback to account name
            }

            dist[brokerName] = (dist[brokerName] || 0) + val;
        });
        return dist;
    }, [holdings, assets, accounts, brokers, convert]);

    // 3. Geography Distribution (Inferred)
    const geoDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        holdings.forEach(h => {
            const asset = assets.find(a => a.id === h.assetId);
            if (!asset) return;
            const val = convert(h.quantity * asset.currentPrice, asset.currency);

            // Simple inference logic
            let region = 'Global';
            if (asset.symbol.includes('-USD') || asset.symbol === 'AAPL' || asset.symbol === 'TSLA') region = 'North America';
            else if (asset.symbol.endsWith('.DE') || asset.symbol.endsWith('.MI')) region = 'Europe';
            else if (asset.type === 'crypto') region = 'Digital'; // Or Global

            // Allow metadata override if available
            /* if (asset.metadata?.region) region = asset.metadata.region; */

            dist[region] = (dist[region] || 0) + val;
        });
        return dist;
    }, [holdings, assets, convert]);

    // Chart Configuration Builder
    const getChartData = (distribution: Record<string, number>) => {
        const labels = Object.keys(distribution);
        const data = Object.values(distribution);
        const colors = [
            '#86efac', // Green 300
            '#93c5fd', // Blue 300
            '#fde047', // Yellow 300
            '#d8b4fe', // Purple 300
            '#fca5a5', // Red 300
            '#fdba74', // Orange 300
            '#a5f3fc', // Cyan 300
            '#c4b5fd', // Violet 300
        ];

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#1e293b',
                borderWidth: 2,
            }]
        };
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    // Start of readability improvements
                    color: '#94a3b8', // Slate-400 (Lighter grey for dark mode readability)
                    usePointStyle: true,
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, Inter, system-ui', // Use system font stack 
                        size: 13, // Increased from 11
                        weight: '500' // Medium weight
                    },
                    boxWidth: 8,
                    padding: 15 // Increased padding
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            // Chart data is in currency units (from `convert` which returns cents/100 IF useNetWorth convert does divisions? 
                            // Wait, `convert` in useNetWorth usually returns value in base currency.
                            // Let's check `getChartData`. It uses `convert(h.quantity * asset.currentPrice, asset.currency)`.
                            // `convert` returns number (units or cents?).
                            // In `useNetWorth`: "convert(amountInCents, fromCurrency)". It returns cents by default?
                            // Let's assume it returns cents for consistency with formatMoney.
                            // BUT `metric.totalValue` uses `convert`.
                            // Let's safe-check context.parsed.
                            // If `convert` returns cents, we pass cents to `formatMoney`.
                            // But usually chart data is divided by 100 for display? 
                            // Current `getChartData` passes raw `val`.
                            // If `convert` returns cents, then the chart data is in cents.
                            // So formatMoney(context.parsed, currencySetting) is correct.
                            label += formatMoney(context.parsed, baseCurrency);
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false,
    };

    const handleRefresh = async () => {
        await refreshAllPrices();
    };

    if (!holdings.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-foreground-subtle">
                <div className="bg-background-muted p-4 rounded-full mb-4 dark:bg-background-subtle">
                    <TrendingUp className="w-8 h-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{t('investments.startInvesting')}</h2>
                <p className="max-w-md mb-6">{t('investments.trackDescription')}</p>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('investments.addFirst')}
                </button>
                {isAddModalOpen && (
                    <AddInvestmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="w-6 h-6 text-indigo-500" />
                    {t('investments.title')}
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="btn btn-ghost flex items-center gap-1"
                        disabled={isLoading}
                        title={t('investments.refreshPrices')}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline text-sm">{t('investments.refresh')}</span>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('investments.addInvestment')}
                    </button>
                </div>
            </div>

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KpiCard title={t('investments.totalValue')} value={metrics.totalValue} currency={baseCurrency} />
                <KpiCard
                    title={t('investments.dayChange')}
                    value={metrics.totalDayChange}
                    currency={baseCurrency}
                    percent={metrics.dayChangePercent}
                    isChange
                />
                <KpiCard
                    title={t('investments.totalReturn')}
                    value={metrics.totalReturn}
                    currency={baseCurrency}
                    percent={metrics.returnPercent}
                    isChange
                />
                <KpiCard title={t('investments.costBasis')} value={metrics.totalCost} currency={baseCurrency} />
            </div>

            {/* Row 2: Charts (Asset Type, Broker, Geography) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Allocation by Type" data={getChartData(typeDistribution)} options={chartOptions} />
                <ChartCard title="Allocation by Broker" data={getChartData(brokerDistribution)} options={chartOptions} />
                <ChartCard title="Allocation by Geography" data={getChartData(geoDistribution)} options={chartOptions} />
            </div>

            {/* Row 3: Holdings Table - Full Width */}
            <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border font-semibold text-foreground">
                    {t('investments.holdings')}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-background-muted text-foreground-muted font-medium">
                            <tr>
                                <th className="px-6 py-3">{t('investments.asset')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.price')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.day')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.qty')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.value')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.return')}</th>
                                <th className="px-6 py-3 text-right">{t('investments.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {holdings.map(holding => {
                                const asset = assets.find(a => a.id === holding.assetId);
                                if (!asset) return null;

                                const value = holding.quantity * asset.currentPrice;
                                const cost = holding.quantity * holding.averageBuyPrice;
                                const gain = value - cost;
                                const gainPercent = cost > 0 ? (gain / cost) * 100 : 0;

                                const dayChange = asset.previousClose ? asset.currentPrice - asset.previousClose : 0;
                                const dayChangePercent = asset.previousClose ? ((asset.currentPrice - asset.previousClose) / asset.previousClose) * 100 : 0;

                                return (
                                    <tr
                                        key={holding.id}
                                        className="hover:bg-background-muted-muted/50 group cursor-pointer transition-colors"
                                        onClick={() => setDetailModal({ holding, asset })}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-foreground">{asset.symbol}</div>
                                            <div className="text-xs text-foreground-subtle">{asset.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-foreground-muted">
                                            {formatMoney(asset.currentPrice, asset.currency)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono text-sm ${dayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex items-center justify-end gap-1">
                                                {dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                {dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-foreground-muted">
                                            {holding.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-foreground font-mono">
                                            {formatMoney(value, asset.currency)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div>{gain >= 0 ? '+' : ''}{formatMoney(gain, asset.currency)}</div>
                                            <div className="text-xs opacity-75">{gainPercent.toFixed(2)}%</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSellModal({ holding, asset });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg"
                                            >
                                                Sell
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {isAddModalOpen && <AddInvestmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
            {sellModal && <SellInvestmentModal isOpen={!!sellModal} onClose={() => setSellModal(null)} holding={sellModal.holding} asset={sellModal.asset} />}
            {detailModal && <HoldingDetailModal isOpen={!!detailModal} onClose={() => setDetailModal(null)} holding={detailModal.holding} asset={detailModal.asset} />}
        </div>
    );
}

// Sub-components

function KpiCard({ title, value, currency, percent, isChange }: { title: string, value: number, currency: string, percent?: number, isChange?: boolean }) {
    const isPositive = value >= 0;
    const colorClass = isChange ? (isPositive ? 'text-emerald-500' : 'text-rose-500') : 'text-foreground';
    const formatMoney = useFormatMoney();

    return (
        <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
            <div className="text-sm text-foreground-muted mb-1">{title}</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${colorClass}`}>
                {isChange && (isPositive ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />)}
                {isChange && isPositive ? '+' : ''}{formatMoney(value, currency)}
            </div>
            {percent !== undefined && (
                <div className={`text-sm mt-1 ${isChange ? (isPositive ? 'text-emerald-500/80' : 'text-rose-500/80') : 'text-foreground-muted'}`}>
                    {percent >= 0 ? '+' : ''}{percent.toFixed(2)}%
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, data, options }: { title: string, data: any, options: any }) {
    return (
        <div className="bg-background-card rounded-xl p-5 border border-border shadow-sm flex flex-col h-[300px]">
            <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
            <div className="flex-1 relative flex items-center justify-center">
                <Doughnut data={data} options={options} />
            </div>
        </div>
    );
}
