import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    RefreshCw
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { cn } from '../lib/utils';
import TransactionTable from './TransactionTable';
import { useNetWorth } from '../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import IncomeExpenseCharts from './charts/IncomeExpenseCharts';
import { useFormatMoney } from '../hooks/useFormatMoney';
import { DateRangeFilter, type DateRange } from './DateRangeFilter';
import { AccountFilter } from './AccountFilter';

export default function AccountsDashboard() {
    const {
        isLoading,
        isLoaded,
        transactions,
        refreshData,
        workspace,
        setWorkspaceSettings
    } = useVaultStore();

    // Load persisted setting or default to current-month
    const [dateRange, setLocalDateRange] = useState<DateRange>(
        (workspace.accountsDashboard?.dateRange as DateRange) || 'current-month'
    );

    // Sync local state to store when changed (wrapped to debounce if needed, but simple set is fine)
    const handleDateRangeChange = (range: DateRange) => {
        setLocalDateRange(range);
        setWorkspaceSettings({
            accountsDashboard: {
                ...workspace.accountsDashboard,
                dateRange: range
            }
        });
    };

    // Account filter state
    const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
        workspace.accountsDashboard?.selectedAccountIds || []
    );

    const handleAccountFilterChange = (accountIds: string[]) => {
        setSelectedAccountIds(accountIds);
        setWorkspaceSettings({
            accountsDashboard: {
                ...workspace.accountsDashboard,
                selectedAccountIds: accountIds
            }
        });
    };

    // Load data on mount
    useEffect(() => {
        if (!isLoaded && !isLoading) {
            refreshData();
        }
    }, [isLoaded, isLoading, refreshData]);

    // Use Net Worth hook
    const { netWorth: totalWealth, convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    // Calculate summary stats based on date range
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

        // Date range for charts (Current Month default)
        // Date range for charts (Last 90 Days for better context, especially at start of month)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return {
            monthlyIncome,
            monthlyExpenses,
            recent,
            startDate,
            endDate
        };
    }, [transactions, convert]);

    // Filter transactions by selected accounts
    // Note: TransactionTable handles this internally now via selectedAccountIds prop?
    // Checking previous implementation: TransactionTable was passed selectedAccountIds.
    // So we don't strictly need to filter here unless we use filteredTransactions for stats? 
    // Stats use `transactions` (all of them) or filtered?
    // Usually dashboard stats show EVERYTHING unless filtered. 
    // The previous code used `transactions` for stats computations (lines 78-90 in previous version used `transactions` from store, not filtered). 
    // So logic remains same.

    const categories = useVaultStore(state => state.categories);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Wallet className="w-6 h-6 text-indigo-500" />
                    {t('accounts.title')}
                </h1>
                <div className="flex items-center gap-3">
                    <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />

                    <AccountFilter
                        selectedAccountIds={selectedAccountIds}
                        onChange={handleAccountFilterChange}
                    />

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
                <div className="p-4 rounded-xl bg-background-card border border-border shadow-sm">
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

                <div className="p-4 rounded-xl bg-background-card border border-border shadow-sm">
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

                <div className="p-4 rounded-xl bg-background-card border border-border shadow-sm">
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

            {/* Charts Row */}
            <div className="px-6 pb-6">
                <IncomeExpenseCharts
                    transactions={transactions}
                    categories={categories}
                    startDate={stats.startDate}
                    endDate={stats.endDate}
                />
            </div>

            <div className="flex-1 min-h-[650px] flex gap-6 px-6 pb-6">
                {/* Main Feed - Full Width */}
                <div className="flex-1 flex flex-col bg-background-card rounded-xl border border-border overflow-hidden shadow-sm">
                    <TransactionTable dateRange={dateRange} selectedAccountIds={selectedAccountIds} />
                </div>
            </div>
        </div>
    );
}
