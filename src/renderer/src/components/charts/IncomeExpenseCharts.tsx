import { useMemo } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Transaction, Category } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';

ChartJS.register(ArcElement, Tooltip, Legend);

// PASTEL PALETTE
const PASTEL_COLORS = [
    '#86efac', // Green 300
    '#93c5fd', // Blue 300
    '#fde047', // Yellow 300
    '#d8b4fe', // Purple 300
    '#fca5a5', // Red 300
    '#fdba74', // Orange 300
    '#a5f3fc', // Cyan 300
    '#c4b5fd', // Violet 300
];

interface IncomeExpenseChartsProps {
    transactions: Transaction[];
    categories: Category[];
    startDate: Date;
    endDate: Date;
}

export default function IncomeExpenseCharts({ transactions, categories, startDate, endDate }: IncomeExpenseChartsProps) {
    const formatMoney = useFormatMoney();
    const currency = useSettingsStore(state => state.currency);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d >= startDate && d <= endDate;
        });
    }, [transactions, startDate, endDate]);

    // Income Breakdown
    const incomeData = useMemo(() => {
        const incomeTxs = filteredTransactions.filter(t => t.type === 'income');
        const byCategory = new Map<string, number>();

        incomeTxs.forEach(tx => {
            const categoryName = tx.categoryId
                ? categories.find(c => c.id === tx.categoryId)?.name || 'Uncategorized'
                : 'Uncategorized';
            const amount = tx.amount;
            byCategory.set(categoryName, (byCategory.get(categoryName) || 0) + amount);
        });

        const labels = Array.from(byCategory.keys());
        const data = Array.from(byCategory.values()).map(v => v / 100);

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: PASTEL_COLORS,
                borderWidth: 0,
            }]
        };
    }, [filteredTransactions, categories]);

    // Expense Breakdown
    const expenseData = useMemo(() => {
        const expenseTxs = filteredTransactions.filter(t => t.type === 'expense');
        const byCategory = new Map<string, number>();

        expenseTxs.forEach(tx => {
            if (tx.splits && tx.splits.length > 0) {
                tx.splits.forEach(split => {
                    const catName = categories.find(c => c.id === split.categoryId)?.name || 'Uncategorized';
                    byCategory.set(catName, (byCategory.get(catName) || 0) + split.amount);
                });
            } else {
                const catName = tx.categoryId
                    ? categories.find(c => c.id === tx.categoryId)?.name || 'Uncategorized'
                    : 'Uncategorized';
                byCategory.set(catName, (byCategory.get(catName) || 0) + tx.amount);
            }
        });

        const sorted = Array.from(byCategory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        return {
            labels: sorted.map(e => e[0]),
            datasets: [{
                data: sorted.map(e => e[1] / 100),
                backgroundColor: PASTEL_COLORS,
                borderWidth: 0,
            }]
        };
    }, [filteredTransactions, categories]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    font: {
                        family: '-apple-system, BlinkMacSystemFont, Inter, system-ui',
                        size: 13,
                    },
                    color: '#94a3b8',
                    boxWidth: 8,
                    padding: 15
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            // Chart data is in units (amount/100), but formatMoney expects cents
                            // Our data prep sets data = amount / 100.
                            // So we pass context.parsed * 100 to formatMoney.
                            label += formatMoney(context.parsed * 100, currency);
                        }
                        return label;
                    }
                }
            }
        },
        maintainAspectRatio: false,
        cutout: '70%',
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-sm font-semibold text-foreground-muted mb-4 self-start">Income Source (90d)</h3>
                <div className="w-full h-full flex-1 relative">
                    {incomeData.datasets[0].data.length > 0 ? (
                        <Doughnut data={incomeData} options={chartOptions} />
                    ) : (
                        <div className="flex h-full items-center justify-center text-foreground-subtle text-xs">No income data</div>
                    )}
                </div>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-sm border border-border flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-sm font-semibold text-foreground-muted mb-4 self-start">Expense Categories (90d)</h3>
                <div className="w-full h-full flex-1 relative">
                    {expenseData.datasets[0].data.length > 0 ? (
                        <Doughnut data={expenseData} options={chartOptions} />
                    ) : (
                        <div className="flex h-full items-center justify-center text-foreground-subtle text-xs">No expense data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
