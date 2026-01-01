import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, TrendingUp, TrendingDown, RefreshCw, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatMoney } from '../../../../shared/schemas';
import type { Holding, Asset } from '../../../../shared/schemas';
import { AddInvestmentModal } from './AddInvestmentModal';
import { SellInvestmentModal } from './SellInvestmentModal';
import { PortfolioPieChart } from './PortfolioPieChart';
import { HoldingDetailModal } from './HoldingDetailModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';

export function InvestmentDashboard() {
    const { assets, holdings, refreshAllPrices, isLoading } = useVaultStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [sellModal, setSellModal] = useState<{ holding: Holding; asset: Asset } | null>(null);
    const [detailModal, setDetailModal] = useState<{ holding: Holding; asset: Asset } | null>(null);

    // Use Net Worth hook for currency conversion
    const { convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();

    // Calculate Overview Metrics including Day Change
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

            // Calculate day change using previousClose
            if (asset.previousClose) {
                const previousValue = holding.quantity * asset.previousClose;
                // current value - previous value
                // must convert difference, or convert both then subtract
                // (val - prev) * rate
                const change = value - previousValue;
                totalDayChange += convert(change, asset.currency);
            }
        });

        const totalReturn = totalValue - totalCost;
        const returnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
        const dayChangePercent = totalValue > 0 && totalDayChange !== 0
            ? (totalDayChange / (totalValue - totalDayChange)) * 100
            : 0;

        return {
            totalValue,
            totalCost,
            totalReturn,
            returnPercent,
            totalDayChange,
            dayChangePercent
        };
    }, [assets, holdings, convert]);

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
        <div className="p-6 space-y-6 overflow-y-auto h-full">
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('investments.totalValue')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalValue, baseCurrency)}
                    </div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('investments.dayChange')}</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${metrics.totalDayChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metrics.totalDayChange >= 0 ? (
                            <ArrowUpRight className="w-5 h-5" />
                        ) : (
                            <ArrowDownRight className="w-5 h-5" />
                        )}
                        {metrics.totalDayChange >= 0 ? '+' : ''}{formatMoney(metrics.totalDayChange, baseCurrency)}
                        <span className="text-sm font-normal bg-background-muted px-2 py-0.5 rounded">
                            {metrics.dayChangePercent >= 0 ? '+' : ''}{metrics.dayChangePercent.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('investments.totalReturn')}</div>
                    <div className={`text-2xl font-bold flex items-center gap-2 ${metrics.totalReturn >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metrics.totalReturn >= 0 ? '+' : ''}{formatMoney(metrics.totalReturn, baseCurrency)}
                        <span className="text-sm font-normal bg-background-muted px-2 py-0.5 rounded">
                            {metrics.returnPercent.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('investments.costBasis')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalCost, baseCurrency)}
                    </div>
                </div>
            </div>

            {/* Main Content Grid - Pie Chart + Holdings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart */}
                <div className="lg:col-span-1">
                    <PortfolioPieChart />
                </div>

                {/* Holdings Table */}
                <div className="lg:col-span-2 bg-background-card rounded-xl shadow-sm border border-border overflow-x-auto">
                    <div className="px-6 py-4 border-b border-border font-semibold text-foreground">
                        {t('investments.holdings')}
                    </div>
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

                                // Day change for this holding
                                const dayChange = asset.previousClose
                                    ? asset.currentPrice - asset.previousClose
                                    : 0;
                                const dayChangePercent = asset.previousClose && asset.previousClose > 0
                                    ? ((asset.currentPrice - asset.previousClose) / asset.previousClose) * 100
                                    : 0;

                                return (
                                    <tr
                                        key={holding.id}
                                        className="hover:bg-background-muted-muted/50 group cursor-pointer"
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
                                                {dayChange >= 0 ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : (
                                                    <TrendingDown className="w-3 h-3" />
                                                )}
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
                                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg"
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
            {isAddModalOpen && (
                <AddInvestmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            )}
            {sellModal && (
                <SellInvestmentModal
                    isOpen={!!sellModal}
                    onClose={() => setSellModal(null)}
                    holding={sellModal.holding}
                    asset={sellModal.asset}
                />
            )}
            {detailModal && (
                <HoldingDetailModal
                    isOpen={!!detailModal}
                    onClose={() => setDetailModal(null)}
                    holding={detailModal.holding}
                    asset={detailModal.asset}
                />
            )}
        </div>
    );
}


