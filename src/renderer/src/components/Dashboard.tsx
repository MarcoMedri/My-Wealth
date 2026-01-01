import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet,
    TrendingUp,
    Building,
    Watch,
    PieChart,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { formatMoney } from '../../../shared/schemas';
import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
    const { t } = useTranslation();
    const {
        accountBalances,
        assets,
        holdings,
        properties,
        collectibles,
        transactions,
        accounts
    } = useVaultStore();

    const { netWorth, convert, baseCurrency } = useNetWorth();

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

    // --- Chart Data ---

    const allocationData = {
        labels: ['Cash', 'Investments', 'Real Estate', 'Collectibles'],
        datasets: [
            {
                data: [
                    Math.max(0, cashTotal / 100),
                    investmentsTotal / 100,
                    realEstateTotal / 100,
                    collectiblesTotal / 100
                ],
                backgroundColor: [
                    '#10b981', // Emerald (Cash)
                    '#3b82f6', // Blue (Investments)
                    '#f59e0b', // Amber (Real Estate)
                    '#8b5cf6', // Violet (Collectibles)
                ],
                borderColor: '#1e293b',
                borderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    color: '#94a3b8',
                    font: {
                        family: 'Inter, sans-serif'
                    },
                    usePointStyle: true,
                }
            }
        },
        cutout: '70%',
        responsive: true,
        maintainAspectRatio: false
    };

    // --- Recent Activity ---
    const recentActivity = useMemo(() => {
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [transactions]);

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <header className="px-8 py-6 pb-2">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Financial Overview</h1>
                <p className="text-foreground-muted mt-1">Your total wealth breakdown at a glance.</p>
            </header>

            <div className="p-8 space-y-8 max-w-7xl">

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

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Col: Asset Allocation */}
                    <div className="bg-background-card rounded-2xl p-6 border border-border col-span-1 lg:col-span-1 flex flex-col shadow-lg">
                        <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-foreground-muted" />
                            {t('dashboard.assetAllocation')}
                        </h3>
                        {/* Chart Container */}
                        <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
                            {netWorth > 0 ? (
                                <Doughnut data={allocationData} options={chartOptions} />
                            ) : (
                                <p className="text-foreground-subtle text-sm">No data available yet</p>
                            )}
                        </div>
                    </div>

                    {/* Right Col: Breakdown Cards & Activity */}
                    <div className="col-span-1 lg:col-span-2 space-y-8">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <SummaryCard
                                title={t('dashboard.cashAccounts')}
                                value={cashTotal}
                                icon={Wallet}
                                color="text-emerald-400"
                                bg="bg-emerald-500/10"
                                borderColor="border-emerald-500/20"
                            />
                            <SummaryCard
                                title={t('nav.investments')}
                                value={investmentsTotal}
                                icon={TrendingUp}
                                color="text-blue-400"
                                bg="bg-blue-500/10"
                                borderColor="border-blue-500/20"
                            />
                            <SummaryCard
                                title={t('nav.properties')}
                                value={realEstateTotal}
                                icon={Building}
                                color="text-amber-400"
                                bg="bg-amber-500/10"
                                borderColor="border-amber-500/20"
                            />
                            <SummaryCard
                                title={t('nav.collectibles')}
                                value={collectiblesTotal}
                                icon={Watch}
                                color="text-violet-400"
                                bg="bg-violet-500/10"
                                borderColor="border-violet-500/20"
                            />
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-background-card rounded-2xl border border-border overflow-hidden shadow-lg">
                            <div className="px-6 py-4 border-b border-border">
                                <h3 className="font-semibold text-foreground">{t('dashboard.recentTransactions')}</h3>
                            </div>
                            <div className="divide-y divide-border">
                                {recentActivity.length > 0 ? (
                                    recentActivity.map(tx => (
                                        <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-background-muted transition-colors">
                                            {/* ... */}
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    tx.type === 'income' ? "bg-emerald-500/20 text-emerald-400" :
                                                        tx.type === 'expense' ? "bg-error/20 text-error" :
                                                            "bg-background-muted text-foreground-muted"
                                                )}>
                                                    {tx.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> :
                                                        tx.type === 'expense' ? <ArrowUpRight className="w-5 h-5" /> :
                                                            <Wallet className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="text-foreground font-medium">{tx.payee}</p>
                                                    <p className="text-sm text-foreground-muted">{new Date(tx.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "font-semibold",
                                                tx.type === 'income' ? "text-success" :
                                                    tx.type === 'expense' ? "text-foreground" : "text-foreground-muted"
                                            )}>
                                                {tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount, tx.currency)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-6 py-8 text-center text-foreground-muted text-sm">
                                        No recent activity
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

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
}

function SummaryCard({ title, value, icon: Icon, color, bg, borderColor }: SummaryCardProps) {
    return (
        <div className={cn(
            "rounded-xl p-5 border shadow-sm transition-all hover:shadow-md",
            "bg-background-card",
            borderColor
        )}>
            <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-lg", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="text-foreground-muted font-medium text-sm">{title}</span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">
                {formatMoney(value, 'EUR')}
            </p>
        </div>
    );
}
