import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Holding, Asset } from '../../../../shared/schemas';
import { AddInvestmentModal } from './AddInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';
import { HoldingDetailModal } from './HoldingDetailModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { DateRangeFilter, type DateRange } from '../DateRangeFilter';
import { cn } from '../../lib/utils';
import { ReturnMetricsCard } from './ReturnMetricsCard';
import { PerformanceChart } from './PerformanceChart';

import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function InvestmentDashboard() {
    const { assets, holdings, brokers, accounts, refreshAllPrices, isLoading, workspace, setWorkspaceSettings } = useVaultStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [sellModal, setSellModal] = useState<{ holding: Holding; asset: Asset } | null>(null);
    const [detailModal, setDetailModal] = useState<{ holding: Holding; asset: Asset } | null>(null);

    // Load persisted settings
    const [dateRange, setLocalDateRange] = useState<DateRange>(
        (workspace.investmentsDashboard?.dateRange as DateRange) || 'all'
    );
    const [includeClosed, setLocalIncludeClosed] = useState(
        workspace.investmentsDashboard?.includeClosed || false
    );

    const handleDateRangeChange = (range: DateRange) => {
        setLocalDateRange(range);
        setWorkspaceSettings({
            investmentsDashboard: {
                ...workspace.investmentsDashboard,
                dateRange: range
            }
        });
    };

    const handleIncludeClosedChange = (checked: boolean) => {
        setLocalIncludeClosed(checked);
        setWorkspaceSettings({
            investmentsDashboard: {
                ...workspace.investmentsDashboard,
                includeClosed: checked
            }
        });
    };

    const { convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    // Use date range filter hook
    // Note: Holdings are current state, so date filtering applies more to performance/history charts. 
    // However, if we want to filter holdings based on "active during this period", that's complex.
    // Standard practice for 'Investments' dashboard is to show current holdings.
    // The DateRangeFilter is likely for the analytics/charts above.

    // Filter holdings based on closed status
    const filteredHoldings = useMemo(() => {
        return holdings.filter(h => {
            if (includeClosed) return true;
            // Exclude insurance from this view
            const asset = assets.find(a => a.id === h.assetId);
            if (asset?.type === 'insurance') return false;

            return h.quantity > 0; // Only show open positions by default
        });
    }, [holdings, includeClosed, assets]);

    // --- Metrics ---
    const metrics = useMemo(() => {
        let totalValue = 0;
        let totalCost = 0;
        let totalDayChange = 0;

        holdings.forEach(holding => {
            // Only include open positions in metrics by default or follow specific business logic?
            // Usually dashboard metrics show CURRENT value, so closed positions (qty 0) don't contribute to total value.
            if (holding.quantity === 0) return;

            const asset = assets.find(a => a.id === holding.assetId);
            if (!asset || asset.type === 'insurance') return;

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
            if (h.quantity === 0) return; // Exclude closed from charts
            const asset = assets.find(a => a.id === h.assetId);
            if (!asset || asset.type === 'insurance') return; // Exclude insurance
            const val = convert(h.quantity * asset.currentPrice, asset.currency);
            let typeLabel = 'Stock';
            switch (asset.type) {
                case 'crypto': typeLabel = 'Crypto'; break;
                case 'etf': typeLabel = 'ETF'; break;
                case 'bond': typeLabel = 'Bond'; break;
                case 'fund': typeLabel = 'Fund'; break;
                // case 'insurance': typeLabel = 'Insurance'; break; // Handled separately
                case 'other': typeLabel = 'Other'; break;
                default: typeLabel = 'Stock';
            }
            dist[typeLabel] = (dist[typeLabel] || 0) + val;
        });
        return dist;
    }, [holdings, assets, convert]);

    // 2. Broker Distribution
    const brokerDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        holdings.forEach(h => {
            if (h.quantity === 0) return; // Exclude closed from charts
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
            if (h.quantity === 0) return; // Exclude closed from charts
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
                borderWidth: 0,
            }]
        };
    };

    const chartOptions: ChartOptions<'doughnut'> = {
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
                        weight: 'bold', // Changed from '500' to valid type
                    },
                    boxWidth: 8,
                    padding: 15 // Increased padding
                }
            },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: function (context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
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
                    <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
                    <button
                        onClick={refreshAllPrices}
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
                <ChartCard title={t('investments.allocationByType')} data={getChartData(typeDistribution)} options={chartOptions} />
                <ChartCard title={t('investments.allocationByBroker')} data={getChartData(brokerDistribution)} options={chartOptions} />
                <ChartCard title={t('investments.allocationByGeography')} data={getChartData(geoDistribution)} options={chartOptions} />
            </div>

            {/* Row 3: Performance Metrics */}
            <div className="grid grid-cols-1 gap-6">
                <ReturnMetricsCard />
            </div>

            {/* Row 4: Portfolio Value Over Time */}
            <div className="grid grid-cols-1 gap-6">
                <PerformanceChart />
            </div>

            {/* Row 4: Holdings Table - Full Width */}
            <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden min-h-[650px] flex flex-col">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                    <span className="font-semibold text-foreground">{t('investments.holdings')}</span>

                    {/* Include Closed Positions Toggle */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-background-subtle rounded-lg px-2 py-1 border border-border">
                            <label className="text-sm text-foreground-muted cursor-pointer select-none" htmlFor="show-closed-toggle">
                                {t('investments.showClosedPositions')}
                            </label>
                            <button
                                id="show-closed-toggle"
                                aria-checked={includeClosed}
                                role="switch"
                                onClick={() => handleIncludeClosedChange(!includeClosed)}
                                className={cn(
                                    "w-9 h-5 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    includeClosed ? "bg-primary" : "bg-input hover:bg-input-hover"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                                        includeClosed ? "translate-x-4" : "translate-x-0"
                                    )}
                                />
                            </button>
                        </div>
                        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
                        <button
                            onClick={() => refreshAllPrices()}
                            className="btn btn-ghost flex items-center gap-1"
                            disabled={isLoading}
                            title={t('investments.refreshPrices')}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline text-sm">{t('investments.refresh')}</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-background-muted text-foreground-muted font-medium sticky top-0 z-10">
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
                            {filteredHoldings.map(holding => {
                                const asset = assets.find(a => a.id === holding.assetId);
                                if (!asset) return null;

                                const value = holding.quantity * asset.currentPrice;
                                const cost = holding.quantity * holding.averageBuyPrice;
                                const gain = value - cost;
                                // cost > 0 check handles division by zero. If cost is 0 (e.g. airdrop or error), return is infinite/undefined, display 0 or handle?
                                // If cost is 0 and value > 0, return is 100% technically (or infinite). Let's stick to 0 or handle logic elsewhere.
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
                                        <td className="px-6 py-4 text-right font-mono font-medium text-foreground">
                                            {formatMoney(value, asset.currency)}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono text-sm ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            <div className="flex flex-col items-end">
                                                <span>{gain >= 0 ? '+' : ''}{formatMoney(gain, asset.currency)}</span>
                                                <span className="text-xs opacity-80">{gainPercent.toFixed(2)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setSellModal({ holding, asset })}
                                                className="btn btn-ghost btn-sm text-foreground-muted hover:text-foreground"
                                                title={t('investments.sell')}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredHoldings.length === 0 && (
                        <div className="p-12 text-center text-foreground-subtle">
                            {t('common.noData') || 'No holdings found'}
                        </div>
                    )}
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
        <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="text-sm text-foreground-muted mb-1 truncate">{title}</div>
            <div className={`text-lg sm:text-xl lg:text-2xl font-bold flex items-center gap-1 ${colorClass} truncate`}>
                {isChange && (isPositive ? <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />)}
                <span className="truncate">{isChange && isPositive ? '+' : ''}{formatMoney(value, currency)}</span>
            </div>
            {percent !== undefined && (
                <div className={`text-sm mt-1 ${isChange ? (isPositive ? 'text-emerald-500/80' : 'text-rose-500/80') : 'text-foreground-muted'}`}>
                    {percent >= 0 ? '+' : ''}{percent.toFixed(2)}%
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, data, options }: { title: string, data: ChartData<'doughnut'>, options: ChartOptions<'doughnut'> }) {
    return (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col min-h-[300px]">
            <h3 className="text-sm font-semibold text-foreground-muted mb-4">{title}</h3>
            <div className="flex-1 relative">
                <Doughnut data={data} options={options} />
            </div>
        </div>
    );
}
