import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Snapshot } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface NetWorthTrendProps {
    snapshots: Snapshot[];
    startDate: Date;
    endDate: Date;
    baseCurrency?: string;
}

import { useFormatDate } from '../../hooks/useFormatDate';

export default function NetWorthTrendChart({ snapshots, startDate, endDate }: NetWorthTrendProps) {
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();
    const currency = useSettingsStore(state => state.currency);

    const trendData = useMemo(() => {
        const filteredSnapshots = snapshots
            .filter(s => {
                const d = new Date(s.date);
                return d >= startDate && d <= endDate;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const cashData = filteredSnapshots.map(s => (s.breakdown?.cash || 0) / 100);
        const investmentsData = filteredSnapshots.map(s => (s.breakdown?.investments || 0) / 100);
        const realEstateData = filteredSnapshots.map(s => (s.breakdown?.realEstate || 0) / 100);
        const collectiblesData = filteredSnapshots.map(s => (s.breakdown?.collectibles || 0) / 100);

        return {
            labels: filteredSnapshots.map(s => formatDate(s.date)),
            datasets: [
                {
                    label: t('dashboard.cashAccounts') || 'Cash',
                    data: cashData,
                    backgroundColor: '#10b981', // emerald-500
                    stack: 'Stack 0',
                },
                {
                    label: t('nav.investments') || 'Investments',
                    data: investmentsData,
                    backgroundColor: '#3b82f6', // blue-500
                    stack: 'Stack 0',
                },
                {
                    label: t('nav.properties') || 'Real Estate',
                    data: realEstateData,
                    backgroundColor: '#f59e0b', // amber-500
                    stack: 'Stack 0',
                },
                {
                    label: t('nav.collectibles') || 'Collectibles',
                    data: collectiblesData,
                    backgroundColor: '#8b5cf6', // violet-500
                    stack: 'Stack 0',
                }
            ]
        };
    }, [snapshots, startDate, endDate, t, formatDate]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { size: 11 },
                    color: '#94a3b8' // foreground-muted
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatMoney(context.parsed.y * 100, currency);
                        }
                        return label;
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    footer: function (tooltipItems: any[]) {
                        const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                        return 'Total: ' + formatMoney(total * 100, currency);
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' }
            },
            y: {
                stacked: true,
                grid: { color: '#f1f5f9' },
                ticks: {
                    font: { size: 10 },
                    color: '#94a3b8',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    callback: (val: any) => formatMoney(val * 100, currency)
                }
            }
        }
    };

    return (
        <div className="w-full h-full min-h-[300px]">
            {trendData.labels.length > 0 ? (
                <Bar data={trendData} options={options} />
            ) : (
                <div className="flex h-full items-center justify-center text-foreground-subtle text-xs">{t('common.notEnoughData')}</div>
            )}
        </div>
    );
}
