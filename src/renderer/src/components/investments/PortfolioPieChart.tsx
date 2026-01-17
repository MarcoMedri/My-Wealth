import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PieChart as PieChartIcon } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { formatMoney } from '../../../../shared/schemas';
import { CHART_COLORS } from '../../lib/constants';
import { Card, CardHeader } from '../ui';
import { DESIGN_TOKENS } from '../../lib/design-tokens';

interface ChartDataItem {
    name: string;
    symbol: string;
    value: number;
    percentage: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: ChartDataItem }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <p className={DESIGN_TOKENS.typography.cardTitle}>{data.symbol}</p>
                <p className={DESIGN_TOKENS.typography.cardSubtitle}>{data.name}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {formatMoney(data.value, 'USD')} ({data.percentage.toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

export function PortfolioPieChart() {
    const { t } = useTranslation();
    const { assets, holdings } = useVaultStore();

    const chartData = useMemo(() => {
        let totalValue = 0;
        const holdingsWithValues: Array<{
            symbol: string;
            name: string;
            value: number;
        }> = [];

        holdings.forEach(holding => {
            const asset = assets.find(a => a.id === holding.assetId);
            if (!asset) return;

            const value = holding.quantity * asset.currentPrice;
            totalValue += value;
            holdingsWithValues.push({
                symbol: asset.symbol,
                name: asset.name,
                value,
            });
        });

        // Sort by value descending and assign colors
        return holdingsWithValues
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }));
    }, [assets, holdings]);

    if (chartData.length === 0) {
        return null;
    }

    return (
        <Card padding="sm">
            <CardHeader
                icon={PieChartIcon}
                iconColor={DESIGN_TOKENS.colors.icon.portfolio}
                title={t('investments.portfolioDistribution')}
            />
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
                            nameKey="symbol"
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
                        <Legend
                            formatter={(value) => (
                                <span className="text-sm text-gray-500 dark:text-gray-400">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend with percentages */}
            <div className="mt-4 space-y-2">
                {chartData.slice(0, 5).map((item) => (
                    <div key={item.symbol} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="font-medium text-gray-900 dark:text-white">{item.symbol}</span>
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
