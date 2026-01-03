import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useFormatDate } from '../../hooks/useFormatDate';
import { useSettingsStore } from '../../store/useSettingsStore';

interface PerformanceChartProps {
    startDate?: Date;
    endDate?: Date;
}

export function PerformanceChart({ startDate, endDate }: PerformanceChartProps) {
    const { t } = useTranslation();
    const { snapshots } = useVaultStore();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();
    const currency = useSettingsStore(state => state.currency);

    const chartData = useMemo(() => {
        const now = endDate || new Date();
        const start = startDate || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        const filteredSnapshots = snapshots
            .filter(s => {
                const d = new Date(s.date);
                return d >= start && d <= now;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return filteredSnapshots.map(s => ({
            date: formatDate(s.date),
            rawDate: new Date(s.date),
            investments: (s.breakdown?.investments || 0) / 100,
            rawInvestments: s.breakdown?.investments || 0,
        }));
    }, [snapshots, startDate, endDate, formatDate]);

    if (chartData.length < 2) {
        return (
            <div className="bg-background-card rounded-xl border border-border p-6 flex flex-col items-center justify-center min-h-[300px]">
                <p className="text-foreground-muted text-sm">
                    {t('common.notEnoughData', 'Not enough data to display chart')}
                </p>
                <p className="text-foreground-subtle text-xs mt-1">
                    {t('investments.performance.needMoreSnapshots', 'Take more snapshots to see your performance over time')}
                </p>
            </div>
        );
    }

    // Calculate min/max for Y axis with padding
    const values = chartData.map(d => d.investments);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.1;

    return (
        <div className="bg-background-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-semibold text-foreground mb-4">
                {t('investments.performance.chartTitle', 'Portfolio Value Over Time')}
            </h3>
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={{ stroke: '#334155' }}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[minValue - padding, maxValue + padding]}
                            tickFormatter={(val) => formatMoney(val * 100, currency)}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--background-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
                            formatter={(value) => {
                                if (typeof value !== 'number') return ['', ''];
                                return [
                                    formatMoney(value * 100, currency),
                                    t('nav.investments', 'Investments')
                                ];
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="investments"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#investmentGradient)"
                            dot={false}
                            activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
