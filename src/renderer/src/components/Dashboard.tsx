import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from './ui/PageHeader';
import {
    Wallet,
    TrendingUp,
    Building,
    Watch,
    Camera,
    Shield,
    PiggyBank,
    RefreshCw,
    LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';
import { useVaultStore } from '../store/useVaultStore';

import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import DashboardCharts, { DashboardPeriod } from './DashboardCharts';
import { useFormatMoney } from '../hooks/useFormatMoney';
import { SnapshotConfirmationModal } from './modals/SnapshotConfirmationModal';
import { PerformanceMetrics } from './analytics/PerformanceMetrics';
import { DashboardSkeleton } from './skeletons/DashboardSkeleton';

// Force HMR update
export default function Dashboard() {
    const { t } = useTranslation();
    const {
        accountBalances,
        assets,
        holdings,
        properties,
        collectibles,
        insurance,
        deposits,
        transactions,
        accounts,
        snapshots,
        setActiveView,
        workspace,
        setWorkspaceSettings,
        isLoading,
        isLoaded
    } = useVaultStore();

    const { netWorth, convert, baseCurrency } = useNetWorth();
    const formatMoney = useFormatMoney();

    const [showSnapshotModal, setShowSnapshotModal] = useState(false);

    // --- Filter State ---
    const [period] = useState<DashboardPeriod>('all');
    const [viewMode, setViewMode] = useState<'gross' | 'net'>(workspace.defaultViewMode || 'gross');

    // Update view mode when default settings change, but only if user hasn't manually interacted?
    // Actually, simple initialization is enough. If user changes defaults, it should probably reflect here.
    useEffect(() => {
        if (workspace.defaultViewMode) {
            setViewMode(workspace.defaultViewMode);
        }
    }, [workspace.defaultViewMode]);

    // --- Aggregations ---

    const cashTotal = useMemo(() => {
        return Object.entries(accountBalances).reduce((sum, [id, bal]) => {
            const acc = accounts.find(a => a.id === id);
            return sum + (acc ? convert(bal, acc.currency) : bal);
        }, 0);
    }, [accountBalances, accounts, convert]);

    const investmentsTotal = useMemo(() => {
        return holdings.reduce((sum, h) => {
            const asset = assets.find(a => a.id === h.assetId);
            if (!asset) return sum;
            const val = h.quantity * asset.currentPrice;
            return sum + convert(val, asset.currency);
        }, 0);
    }, [holdings, assets, convert]);

    const realEstateTotal = useMemo(() => {
        return properties.reduce((sum, p) => {
            const val = p.currentValue || p.purchasePrice || 0;
            return sum + convert(val, p.currency);
        }, 0);
    }, [properties, convert]);

    const collectiblesTotal = useMemo(() => {
        return collectibles.reduce((sum, c) => {
            const val = c.currentValue || c.purchasePrice || 0;
            return sum + convert(val, c.currency);
        }, 0);
    }, [collectibles, convert]);

    const insuranceTotal = useMemo(() => {
        return insurance.reduce((sum, p) => {
            const val = p.currentValue || 0;
            return sum + convert(val, p.currency);
        }, 0);
    }, [insurance, convert]);

    const depositsTotal = useMemo(() => {
        return deposits.reduce((sum, d) => {
            return sum + convert(d.principal, d.currency);
        }, 0);
    }, [deposits, convert]);

    // --- Chart Data ---



    // --- Tax Calculation ---
    const totalUnrealizedTax = useMemo(() => {
        let totalTax = 0;

        // 1. Holdings
        for (const h of holdings) {
            const asset = assets.find(a => a.id === h.assetId);
            if (asset) {
                const marketValue = h.quantity * asset.currentPrice;
                const costBasis = h.quantity * h.averageBuyPrice;
                const gain = marketValue - costBasis;
                if (gain > 0) {
                    const rate = h.taxRate ?? workspace.taxDefaults?.[asset.type] ?? 26;
                    const tax = gain * (rate / 100);
                    // Convert tax (in asset currency) to base currency
                    totalTax += convert(tax, asset.currency);
                }
            }
        }

        // 2. Properties
        for (const p of properties) {
            const marketValue = p.currentValue || 0;
            const costBasis = p.purchasePrice || 0;
            const gain = marketValue - costBasis;
            if (gain > 0) {
                const rate = p.taxRate ?? workspace.taxDefaults?.[p.type] ?? 0;
                const tax = gain * (rate / 100);
                totalTax += convert(tax, p.currency);
            }
        }

        // 3. Collectibles
        for (const c of collectibles) {
            const marketValue = c.currentValue || 0;
            const costBasis = c.purchasePrice || 0;
            const gain = marketValue - costBasis;
            if (gain > 0) {
                const rate = c.taxRate ?? workspace.taxDefaults?.['collectible'] ?? 0;
                const tax = gain * (rate / 100);
                totalTax += convert(tax, c.currency);
            }
        }

        return totalTax;
    }, [holdings, assets, properties, collectibles, workspace.taxDefaults, convert]);

    const displayedNetWorth = viewMode === 'net' ? netWorth - totalUnrealizedTax : netWorth;

    // --- User Actions ---
    const handleSnapshotAction = async (refresh: boolean) => {
        try {
            if (refresh) {
                await useVaultStore.getState().refreshAllPrices();
            }

            await window.api.createSnapshot();
            toast.success(t('dashboard.snapshotSuccess'));
            await useVaultStore.getState().refreshData();
        } catch (e) {
            console.error(e);
            toast.error(t('dashboard.snapshotError'));
        }
    };

    const handleModalConfirm = async (shouldRefresh: boolean, rememberChoice: boolean) => {
        setShowSnapshotModal(false);

        if (rememberChoice) {
            await setWorkspaceSettings({
                autoRefreshOnSnapshot: shouldRefresh
            });
        }

        await handleSnapshotAction(shouldRefresh);
    };

    const handleSnapshotClick = async () => {
        const autoRefresh = workspace.autoRefreshOnSnapshot; // This is a boolean | null | undefined

        // Explicitly check for boolean values
        if (autoRefresh === true) {
            await handleSnapshotAction(true);
        } else if (autoRefresh === false) {
            await handleSnapshotAction(false);
        } else {
            // Null or undefined -> Ask user
            setShowSnapshotModal(true);
        }
    };

    // Skeleton Loading Check
    if (isLoading && !isLoaded) {
        return <DashboardSkeleton />;
    }



    return (
        <div className="p-card-p space-y-card-gap overflow-y-auto h-full" data-tour="dashboard">
            <SnapshotConfirmationModal
                isOpen={showSnapshotModal}
                onClose={() => setShowSnapshotModal(false)}
                onConfirm={handleModalConfirm}
            />

            {/* Header */}
            <PageHeader
                title={t('dashboard.title')}
                description={t('dashboard.subtitle')}
                icon={LayoutDashboard}
                iconClassName="text-blue-500"
                actions={
                    <>
                        <button
                            onClick={() => useVaultStore.getState().refreshAllPrices()}
                            className="flex items-center gap-2 btn btn-ghost text-sm font-medium"
                            title={t('investments.refreshPrices')}
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('investments.refresh')}</span>
                        </button>
                        <button
                            onClick={handleSnapshotClick}
                            className="flex items-center gap-2 btn btn-primary text-sm font-medium"
                        >
                            <Camera className="w-4 h-4" />
                            <span>{t('dashboard.takeSnapshot')}</span>
                        </button>
                    </>
                }
            />

            <div className="p-card-p space-y-card-gap max-w-7xl mx-auto w-full">

                {/* Net Worth Hero - Enhanced with Gradient */}
                <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-8 shadow-2xl overflow-hidden group">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                        <div className="flex items-start justify-between">
                            {/* Left: Net Worth */}
                            <div className="flex-1">
                                <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-3">
                                    {t('dashboard.netWorth')}
                                </p>
                                <h2 className="text-6xl font-bold text-white tracking-tight mb-4 transition-all duration-300 group-hover:scale-105">
                                    {formatMoney(displayedNetWorth, baseCurrency)}
                                </h2>

                                {/* Trend Indicator */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                        <TrendingUp className="w-5 h-5 text-green-300" />
                                        <span className="text-xl font-semibold text-green-300">
                                            +12.5%
                                        </span>
                                        <span className="text-blue-100 text-sm">
                                            {t('dashboard.vsLastMonth', 'vs last month')}
                                        </span>
                                    </div>
                                </div>

                                {viewMode === 'net' && (
                                    <div className="inline-flex items-center gap-2 bg-red-500/20 backdrop-blur-sm rounded-lg px-3 py-2">
                                        <span className="text-red-200 text-sm font-medium">
                                            {t('dashboard.taxLiability')}: -{formatMoney(totalUnrealizedTax, baseCurrency)}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-4">
                                    <ExchangeRateIndicator />
                                </div>
                            </div>

                            {/* Right: View Mode Toggle */}
                            <div className="bg-white/10 backdrop-blur-md p-1 rounded-lg border border-white/20 flex text-xs font-medium shadow-lg">
                                <button
                                    onClick={() => setViewMode('gross')}
                                    className={cn(
                                        "px-4 py-2 rounded-md transition-all duration-200",
                                        viewMode === 'gross'
                                            ? "bg-white text-blue-700 shadow-md"
                                            : "text-white/70 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {t('dashboard.gross')}
                                </button>
                                <button
                                    onClick={() => setViewMode('net')}
                                    className={cn(
                                        "px-4 py-2 rounded-md transition-all duration-200",
                                        viewMode === 'net'
                                            ? "bg-white text-blue-700 shadow-md"
                                            : "text-white/70 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    {t('dashboard.net')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Decorative gradient orbs */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
                </div>

                {/* Summary Cards Grid (6 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    <SummaryCard
                        title={t('dashboard.cashAccounts')}
                        value={cashTotal}
                        icon={Wallet}
                        color="text-emerald-400"
                        bg="bg-emerald-500/10"
                        borderColor="border-emerald-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('accounts')}
                    />
                    <SummaryCard
                        title={t('nav.investments')}
                        value={investmentsTotal}
                        icon={TrendingUp}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        borderColor="border-blue-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('investments')}
                    />
                    <SummaryCard
                        title={t('nav.properties')}
                        value={realEstateTotal}
                        icon={Building}
                        color="text-amber-400"
                        bg="bg-amber-500/10"
                        borderColor="border-amber-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('properties')}
                    />
                    <SummaryCard
                        title={t('nav.collectibles')}
                        value={collectiblesTotal}
                        icon={Watch}
                        color="text-violet-400"
                        bg="bg-violet-500/10"
                        borderColor="border-violet-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('collectibles')}
                    />
                    <SummaryCard
                        title={t('insurance.title')}
                        value={insuranceTotal}
                        icon={Shield}
                        color="text-rose-400"
                        bg="bg-rose-500/10"
                        borderColor="border-rose-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('insurance')}
                    />
                    <SummaryCard
                        title={t('deposits.title')}
                        value={depositsTotal}
                        icon={PiggyBank}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        borderColor="border-blue-500/20"
                        currency={baseCurrency}
                        onClick={() => setActiveView('deposits')}
                    />
                </div>

                {/* Performance Metrics */}
                <PerformanceMetrics />

                {/* Charts Row */}
                <DashboardCharts
                    period={period}
                    transactions={transactions}
                    snapshots={snapshots}
                    viewMode={viewMode}
                />



            </div>


        </div >
    );
}

interface SummaryCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bg: string;
    borderColor: string;
    className?: string;
    currency: string;
    onClick?: () => void;
}

function SummaryCard({ title, value, icon: Icon, color, bg, borderColor, className, currency, onClick }: SummaryCardProps) {
    const formatMoney = useFormatMoney();
    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-xl p-6 border shadow-lg transition-all flex flex-col justify-between",
                "bg-background-card",
                onClick ? "cursor-pointer hover:shadow-xl hover:border-emerald-500/50 hover:bg-emerald-500/5" : "hover:shadow-xl",
                borderColor,
                className
            )}>
            <div className="flex items-center gap-card-gap mb-3">
                <div className={cn("p-2 rounded-lg", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-foreground-muted font-medium text-sm">{title}</span>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-foreground tracking-tight truncate" title={formatMoney(value, currency)}>
                {formatMoney(value, currency)}
            </p>
        </div>
    );
}
