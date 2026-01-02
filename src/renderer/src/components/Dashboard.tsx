import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet,
    TrendingUp,
    Building,
    Watch,
    Camera,
    Shield,
    PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';
import { useVaultStore } from '../store/useVaultStore';

import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import DashboardCharts, { DashboardPeriod } from './DashboardCharts';
import { useFormatMoney } from '../hooks/useFormatMoney';

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
        setActiveView
    } = useVaultStore();

    const { netWorth, convert, baseCurrency } = useNetWorth();
    const formatMoney = useFormatMoney();

    // --- Filter State ---
    const [period] = useState<DashboardPeriod>('1y');

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



    // --- User Actions ---



    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <header className="px-8 py-6 pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('dashboard.title')}</h1>
                    <p className="text-foreground-muted mt-1">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            try {
                                await window.api.createSnapshot();
                                toast.success(t('dashboard.snapshotSuccess'));
                                // Ideally trigger refresh or rely on optimistic updates if store listened to changes?
                                // VaultStore loadVault updates everything.
                                // We might need to manually trigger a refresh of snapshots in store if not auto.
                                // useVaultStore doesn't expose refreshSnapshots? It exposes loadVault via init?
                                await useVaultStore.getState().refreshData();
                            } catch (e) {
                                console.error(e);
                                toast.error(t('dashboard.snapshotError'));
                            }
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Camera className="w-4 h-4" />
                        <span>{t('dashboard.takeSnapshot')}</span>
                    </button>
                </div>
            </header>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">

                {/* Net Worth Hero */}
                <div className="bg-background-card rounded-2xl p-8 border border-border shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-success uppercase tracking-wider mb-2">{t('dashboard.netWorth')}</p>
                        <h2 className="text-5xl font-bold text-foreground tracking-tight">
                            {formatMoney(netWorth, baseCurrency)}
                        </h2>
                        <div className="mt-3">
                            <ExchangeRateIndicator />
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
                </div>

                {/* Summary Cards Grid (6 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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

                {/* Charts Row */}
                <DashboardCharts
                    period={period}
                    transactions={transactions}
                    snapshots={snapshots}
                />



            </div>


        </div>
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
            <div className="flex items-center gap-3 mb-3">
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
