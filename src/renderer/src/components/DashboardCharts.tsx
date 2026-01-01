import { useMemo } from 'react';
import { Transaction, Snapshot } from '../../../shared/schemas';
import NetWorthTrendChart from './charts/NetWorthTrendChart';
import IncomeExpenseCharts from './charts/IncomeExpenseCharts';
import { useVaultStore } from '../store/useVaultStore';

export type DashboardPeriod = 'current_month' | 'last_month' | '3m' | '6m' | '1y';

interface DashboardChartsProps {
    period: DashboardPeriod;
    transactions: Transaction[];
    snapshots: Snapshot[];
}

export default function DashboardCharts({ period, transactions, snapshots }: DashboardChartsProps) {
    const categories = useVaultStore(state => state.categories);

    // Filter Logic (Centralized here or passed down?)
    // Let's keep logic here to pass correct dates/data to sub-charts
    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        switch (period) {
            case 'current_month':
                start.setDate(1);
                break;
            case 'last_month':
                start.setMonth(now.getMonth() - 1);
                start.setDate(1);
                end.setDate(0);
                break;
            case '3m':
                start.setMonth(now.getMonth() - 3);
                break;
            case '6m':
                start.setMonth(now.getMonth() - 6);
                break;
            case '1y':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
    }, [period]);

    // Returns nothing, or maybe just the Trend Chart if we only want that on Dashboard?
    // User requested: "NetWorth Trend in alto", "Summary Cards 2x2", "Recent Activity" 
    // And "Income/Expense charts in Accounts"

    // So this file might just return the Trend Chart now?
    // Let's refactor this to ONLY return the TrendChart logic + Layout for the Dashboard top section if needed.
    // Or simpler: Rename this to something else or just export what's needed.

    // Actually, `Dashboard.tsx` uses this. Let's make this component JUST render layout for Dashboard.
    // BUT the user wants Trend + Net Worth Value side by side.

    return (
        <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-sm font-semibold text-foreground-muted mb-4 self-start">Net Worth Trend</h3>
            <NetWorthTrendChart
                snapshots={snapshots}
                startDate={startDate}
                endDate={endDate}
            />
        </div>
    );
}
