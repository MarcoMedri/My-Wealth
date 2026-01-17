import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useNetWorth } from '../../hooks/useNetWorth';
import { CHART_COLORS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import { Card, CardHeader, EmptyState } from '../ui';
import { DESIGN_TOKENS } from '../../lib/design-tokens';

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
                <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className={DESIGN_TOKENS.typography.cardTitle}>{data.name}</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {formatMoney(data.value, currency)} ({data.percentage.toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    if (chartData.length === 0) {
        return (
            <Card>
                <EmptyState
                    icon={PieChartIcon}
                    title={t('common.noData', 'No data available')}
                    description={t('investments.allocation.noDataDescription', 'Add some investments to see your allocation')}
                />
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader
                icon={PieChartIcon}
                iconColor={DESIGN_TOKENS.colors.icon.allocation}
                title={t('investments.allocation.title', 'Portfolio Allocation')}
                action={
                    <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-1">
                        {groupByOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => setGroupBy(option.value)}
                                className={cn(
                                    'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                                    groupBy === option.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                }
            />

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
                            label={(props: { name?: string }) => {
                                /* eslint-disable react/prop-types */
                                if (!props.name) return '';
                                const data = chartData.find(d => d.name === props.name);
                                if (!data || data.percentage < 5) return '';
                                return `${data.percentage.toFixed(0)}%`;
                                /* eslint-enable react/prop-types */
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
                            <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">{item.percentage.toFixed(1)}%</span>
                    </div>
                ))}
                {chartData.length > 5 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                        {t('investments.moreItems', { count: chartData.length - 5 })}
                    </div>
                )}
            </div>
        </Card>
    );
}
