import { useMemo } from 'react';
import { Transaction, Snapshot } from '../../../shared/schemas';
import NetWorthTrendChart from './charts/NetWorthTrendChart';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader } from './ui';
import { DESIGN_TOKENS } from '../lib/design-tokens';
import { useTranslation } from 'react-i18next';


export type DashboardPeriod = 'current_month' | 'last_month' | '3m' | '6m' | '1y' | 'all';

interface DashboardChartsProps {
    period: DashboardPeriod;
    transactions: Transaction[];
    snapshots: Snapshot[];
    viewMode?: 'gross' | 'net';
}

export default function DashboardCharts({ period, snapshots, viewMode }: DashboardChartsProps) {
    const { t } = useTranslation();

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
            case 'all':
                // Show all historical data - set start to very old date
                start.setFullYear(2000, 0, 1);
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
        <Card>
            <CardHeader
                icon={TrendingUp}
                iconColor={DESIGN_TOKENS.colors.icon.performance}
                title={t('dashboard.netWorthTrend')}
            />
            <NetWorthTrendChart
                snapshots={snapshots}
                startDate={startDate}
                endDate={endDate}
                viewMode={viewMode}
            />
        </Card>
    );
}
