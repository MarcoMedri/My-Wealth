import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNetWorth } from '../../hooks/useNetWorth';
import { CHART_COLORS } from '../../lib/constants';
import { cn } from '../../lib/utils';

type GroupByOption = 'type' | 'broker' | 'currency';

interface ChartDataItem {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
}

export function AllocationPieChart() {
    const { t } = useTranslation();
    const { assets, holdings, brokers, accounts } = useVaultStore();
    const { convert } = useNetWorth();
    const formatMoney = useFormatMoney();
    const currency = useSettingsStore(state => state.currency);

    const [groupBy, setGroupBy] = useState<GroupByOption>('type');

    const groupByOptions: { value: GroupByOption; label: string }[] = [
        { value: 'type', label: t('investments.allocation.byType', 'By Type') },
        { value: 'broker', label: t('investments.allocation.byBroker', 'By Broker') },
        { value: 'currency', label: t('investments.allocation.byCurrency', 'By Currency') },
    ];

    const chartData = useMemo(() => {
        const distribution: Record<string, number> = {};

        holdings.forEach(holding => {
            if (holding.quantity === 0) return;
            const asset = assets.find(a => a.id === holding.assetId);
            if (!asset || asset.type === 'insurance') return;

            const value = convert(holding.quantity * asset.currentPrice, asset.currency);

            let groupKey = '';
            switch (groupBy) {
                case 'type':
                    groupKey = t(`investments.types.${asset.type}`, asset.type);
                    break;
                case 'broker': {
                    const account = accounts.find(a => a.id === holding.accountId);
                    const broker = account ? brokers.find(b => b.id === account.brokerId) : null;
                    groupKey = broker?.name || t('common.unknown', 'Unknown');
                    break;
                }
                case 'currency':
                    groupKey = asset.currency;
                    break;
            }

            distribution[groupKey] = (distribution[groupKey] || 0) + value;
        });

        const totalValue = Object.values(distribution).reduce((sum, val) => sum + val, 0);

        return Object.entries(distribution)
            .map(([name, value], index) => ({
                name,
                value,
                percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);
    }, [holdings, assets, brokers, accounts, groupBy, convert, t]);

    const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background-card px-3 py-2 rounded-lg shadow-lg border border-border">
                    <p className="font-semibold text-foreground">{data.name}</p>
                    <p className="text-sm font-medium text-foreground mt-1">
                        {formatMoney(data.value, currency)} ({data.percentage.toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <div className="bg-background-card rounded-xl border border-border p-6 flex items-center justify-center min-h-[300px]">
                <p className="text-foreground-muted text-sm">{t('common.noData', 'No data available')}</p>
            </div>
        );
    }

    return (
        <div className="bg-background-card rounded-xl border border-border p-6 shadow-sm">
            {/* Header with Tab Switcher */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                    {t('investments.allocation.title', 'Portfolio Allocation')}
                </h3>
                <div className="flex gap-1 bg-background-subtle rounded-lg p-1">
                    {groupByOptions.map(option => (
                        <button
                            key={option.value}
                            onClick={() => setGroupBy(option.value)}
                            className={cn(
                                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                                groupBy === option.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground-muted hover:text-foreground'
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={(props: { name: string }) => {
                                const data = chartData.find(d => d.name === props.name);
                                if (!data || data.percentage < 5) return '';
                                return `${data.percentage.toFixed(0)}%`;
                            }}
                            labelLine={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
                {chartData.slice(0, 5).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-foreground">{item.name}</span>
                        </div>
                        <span className="text-foreground-subtle">{item.percentage.toFixed(1)}%</span>
                    </div>
                ))}
                {chartData.length > 5 && (
                    <div className="text-xs text-foreground-muted text-center pt-1">
                        {t('investments.moreItems', { count: chartData.length - 5 })}
                    </div>
                )}
            </div>
        </div>
    );
}
