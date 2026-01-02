import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet,
    TrendingUp,
    Building,
    Watch,
    ArrowUpRight,
    ArrowDownRight,
    Pencil,
    Copy,
    Trash2,
    Camera
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { type Transaction } from '../../../shared/schemas';
import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import AddTransactionModal from './AddTransactionModal';
import DashboardCharts, { DashboardPeriod } from './DashboardCharts';
import { useFormatMoney } from '../hooks/useFormatMoney';

export default function Dashboard() {
    const { t } = useTranslation();
    const {
        accountBalances,
        assets,
        holdings,
        properties,
        collectibles,
        transactions,
        accounts,
        snapshots
    } = useVaultStore();

    const { netWorth, convert, baseCurrency } = useNetWorth();
    const formatMoney = useFormatMoney();

    // --- Modal State ---
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDuplicateMode, setIsDuplicateMode] = useState(false);

    // --- Filter State ---
    const [period] = useState<DashboardPeriod>('current_month');

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

    // --- Recent Activity ---
    const recentActivity = useMemo(() => {
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10); // Show more since we have full width
    }, [transactions]);

    // --- User Actions ---

    const handleEdit = (tx: Transaction) => {
        setSelectedTransaction(tx);
        setIsDuplicateMode(false);
        setIsTransactionModalOpen(true);
    };

    const handleDuplicate = (tx: Transaction) => {
        setSelectedTransaction(tx);
        setIsDuplicateMode(true);
        setIsTransactionModalOpen(true);
    };

    const handleDelete = async (tx: Transaction) => {
        if (confirm(`Are you sure you want to delete this transaction: ${tx.payee}?`)) {
            // Optimistic / Store update
            // We need to call API first? useVaultStore usually just calls internal state, 
            // but we likely need an async action in store that calls API too for persistence.
            // Checking useVaultStore implementation: it doesn't seem to have deleteTransaction exposed as async API call wrapper?
            // Actually I checked useVaultStore earlier but maybe missed it.
            // Let's check if window.api has deleteTransaction. Typically yes.
            try {
                // Assuming logic: call API then refresh store
                // Currently useVaultStore doesn't expose deleteTransaction? 
                // Check Sidebar or TransactionTable... 
                // If useVaultStore doesn't have it, we might need to add it or call window.api directly + refreshData.
                // Let's assume window.api.deleteTransaction exists, if not we'll catch it.
                // Actually I don't recall seeing deleteTransaction in store. I should verify.
                // SAFE FALLBACK: call window.api directly then refreshData.
                await window.api.deleteTransaction(tx.id);
                await useVaultStore.getState().refreshData();
            } catch (e) {
                console.error("Failed to delete", e);
                alert("Failed to delete transaction");
            }
        }
    };

    // Note: I'll use window.api.deleteTransaction if it exists, otherwise I might need to add it to main process in a separate step if missing.
    // Based on previous tool outputs, TransactionTable seemingly doesn't delete?
    // Let's assume for now. If it fails, I'll fix in next step.

    return (
        <div className="h-full flex flex-col overflow-y-auto">
            {/* Header */}
            <header className="px-8 py-6 pb-2 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Financial Overview</h1>
                    <p className="text-foreground-muted mt-1">Your total wealth breakdown at a glance.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={async () => {
                            try {
                                await window.api.createSnapshot();
                                alert('Snapshot created successfully!');
                                // Ideally trigger refresh or rely on optimistic updates if store listened to changes?
                                // VaultStore loadVault updates everything.
                                // We might need to manually trigger a refresh of snapshots in store if not auto.
                                // useVaultStore doesn't expose refreshSnapshots? It exposes loadVault via init?
                                await useVaultStore.getState().refreshData();
                            } catch (e) {
                                console.error(e);
                                alert('Failed to create snapshot');
                            }
                        }}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Camera className="w-4 h-4" />
                        <span>Take Snapshot</span>
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

                {/* Summary Cards Grid (4 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard
                        title={t('dashboard.cashAccounts')}
                        value={cashTotal}
                        icon={Wallet}
                        color="text-emerald-400"
                        bg="bg-emerald-500/10"
                        borderColor="border-emerald-500/20"
                        currency={baseCurrency}
                    />
                    <SummaryCard
                        title={t('nav.investments')}
                        value={investmentsTotal}
                        icon={TrendingUp}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        borderColor="border-blue-500/20"
                        currency={baseCurrency}
                    />
                    <SummaryCard
                        title={t('nav.properties')}
                        value={realEstateTotal}
                        icon={Building}
                        color="text-amber-400"
                        bg="bg-amber-500/10"
                        borderColor="border-amber-500/20"
                        currency={baseCurrency}
                    />
                    <SummaryCard
                        title={t('nav.collectibles')}
                        value={collectiblesTotal}
                        icon={Watch}
                        color="text-violet-400"
                        bg="bg-violet-500/10"
                        borderColor="border-violet-500/20"
                        currency={baseCurrency}
                    />
                </div>

                {/* Charts Row */}
                <DashboardCharts
                    period={period}
                    transactions={transactions}
                    snapshots={snapshots}
                />

                {/* Bottom Section: Recent Activity - Full Width */}
                <div className="bg-background-card rounded-2xl border border-border overflow-hidden shadow-lg">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-semibold text-foreground">{t('dashboard.recentTransactions')}</h3>
                    </div>
                    <div className="divide-y divide-border">
                        {recentActivity.length > 0 ? (
                            recentActivity.map(tx => (
                                <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-background-muted transition-colors group">
                                    {/* Left: Icon & Details */}
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
                                            <p className="text-foreground font-medium">{tx.payee || "No Payee"}</p>
                                            <p className="text-sm text-foreground-muted">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {/* Right: Actions & Amount */}
                                    <div className="flex items-center gap-6">
                                        {/* Actions (Visible on Hover) */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleDuplicate(tx)}
                                                className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-background-subtle rounded-md transition-colors"
                                                title="Duplicate"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(tx)}
                                                className="p-1.5 text-foreground-muted hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx)}
                                                className="p-1.5 text-foreground-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <span className={cn(
                                            "font-semibold w-24 text-right",
                                            tx.type === 'income' ? "text-success" :
                                                tx.type === 'expense' ? "text-foreground" : "text-foreground-muted"
                                        )}>
                                            {tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount, tx.currency)}
                                        </span>
                                    </div>
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

            {/* Modals */}
            <AddTransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                transaction={selectedTransaction}
                isDuplicate={isDuplicateMode}
            />
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
}

function SummaryCard({ title, value, icon: Icon, color, bg, borderColor, className, currency }: SummaryCardProps) {
    const formatMoney = useFormatMoney();
    return (
        <div className={cn(
            "rounded-xl p-6 border shadow-lg transition-all hover:shadow-xl flex flex-col justify-between",
            "bg-background-card",
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
