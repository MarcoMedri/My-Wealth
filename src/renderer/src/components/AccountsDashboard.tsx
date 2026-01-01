import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    RefreshCw,
    Plus,
    Upload
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { formatMoney } from '../../../shared/schemas';
import { cn, getRelativeTime } from '../lib/utils';
import TransactionTable from './TransactionTable';
import AddTransactionModal from './AddTransactionModal';
import ImportModal from './ImportModal';
import { useNetWorth } from '../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';

export default function AccountsDashboard() {
    const {
        isLoading,
        isLoaded,
        transactions,
        refreshData
    } = useVaultStore();

    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Load data on mount
    useEffect(() => {
        if (!isLoaded && !isLoading) {
            refreshData();
        }
    }, [isLoaded, isLoading, refreshData]);

    // Use Net Worth hook
    const { netWorth: totalWealth, convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();

    // Calculate summary stats
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate.getMonth() === now.getMonth() &&
                txDate.getFullYear() === now.getFullYear();
        });

        const monthlyIncome = thisMonth
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + convert(t.amount, t.currency), 0);

        const monthlyExpenses = thisMonth
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + convert(t.amount, t.currency), 0);

        const recent = [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return {
            monthlyIncome,
            monthlyExpenses,
            recent
        };
    }, [transactions, convert]);

    return (
        <div className="h-full flex flex-col">
            <AddTransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
            <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

            {/* Header */}
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('accounts.title')}</h1>
                    <p className="text-sm text-foreground-muted mt-1">
                        {t('accounts.welcome')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-muted text-foreground-muted hover:bg-background-subtle hover:text-foreground transition-colors border border-border"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('accounts.importCSV')}</span>
                    </button>

                    <button
                        onClick={() => setIsTxModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-foreground hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('accounts.addTransaction')}</span>
                    </button>

                    <button
                        onClick={refreshData}
                        disabled={isLoading}
                        className={cn(
                            "p-2 rounded-lg bg-background-muted text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors border border-border",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                        title={t('accounts.refreshData')}
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6 p-6">
                <div className="p-4 rounded-xl bg-background-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Wallet className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground-muted">{t('accounts.totalNetWorth')}</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                        {formatMoney(totalWealth, baseCurrency)}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-background-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground-muted">{t('accounts.monthlyIncome')}</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                        +{formatMoney(stats.monthlyIncome, baseCurrency)}
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-background-card border border-border">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <TrendingDown className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground-muted">{t('accounts.monthlyExpenses')}</p>
                    </div>
                    <p className="text-3xl font-bold text-foreground tracking-tight">
                        -{formatMoney(stats.monthlyExpenses, baseCurrency)}
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex gap-6 px-6 pb-6">
                {/* Main Feed */}
                <div className="flex-[2] flex flex-col bg-background-card rounded-xl border border-border overflow-hidden">
                    <TransactionTable />
                </div>

                {/* Sidebar / Recent Blocks */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="bg-background-card rounded-xl border border-border p-4">
                        <h3 className="font-semibold text-foreground mb-4">{t('accounts.recentActivity')}</h3>
                        <div className="space-y-4">
                            {stats.recent.length === 0 ? (
                                <p className="text-sm text-foreground-subtle text-center py-4">{t('accounts.noRecentActivity')}</p>
                            ) : (
                                stats.recent.map((tx) => (
                                    <div key={tx.id} className="flex items-start justify-between group">
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg mt-0.5",
                                                tx.type === 'income' ? "bg-emerald-500/10 text-emerald-500" :
                                                    tx.type === 'expense' ? "bg-red-500/10 text-red-500" :
                                                        "bg-blue-500/10 text-blue-500"
                                            )}>
                                                {tx.type === 'income' ? <ArrowDownRight className="w-4 h-4" /> :
                                                    tx.type === 'expense' ? <ArrowUpRight className="w-4 h-4" /> :
                                                        <RefreshCw className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                                                    {tx.payee}
                                                </p>
                                                <p className="text-xs text-foreground-subtle">
                                                    {getRelativeTime(tx.date)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-semibold tabular-nums",
                                            tx.type === 'income' ? "text-emerald-400" : "text-foreground-muted"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}
                                            {formatMoney(tx.amount, tx.currency)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
