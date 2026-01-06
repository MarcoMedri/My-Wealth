import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Label } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import { formatMoney } from '../../../../shared/schemas';
import { CHART_COLORS } from '../../lib/constants';

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
            <div className="bg-background-card px-3 py-2 rounded-lg shadow-lg border border-border">
                <p className="font-semibold text-foreground">{data.symbol}</p>
                <p className="text-sm text-foreground-muted">{data.name}</p>
                <p className="text-sm font-medium text-foreground mt-1">
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
        <div className="bg-background-card rounded-xl shadow-sm border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4">{t('investments.portfolioDistribution')}</h3>
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
                                <span className="text-sm text-foreground-muted">{value}</span>
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
                            <span className="font-medium text-foreground">{item.symbol}</span>
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
