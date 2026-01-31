import { useMemo, memo } from 'react';
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
import { Snapshot } from '../../../@my-wealth/shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation } from 'react-i18next';
import { AREA_CHART_COLORS } from '../../lib/constants';

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
    viewMode?: 'gross' | 'net';
}

import { useFormatDate } from '../../hooks/useFormatDate';

// Memoized component - prevents re-render if props unchanged
function NetWorthTrendChartComponent({ snapshots, startDate, endDate, viewMode = 'gross' }: NetWorthTrendProps) {
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
        const insuranceData = filteredSnapshots.map(s => (s.breakdown?.insurance || 0) / 100);

        const datasets = [
            {
                label: t('dashboard.cashAccounts') || 'Cash',
                data: cashData,
                backgroundColor: AREA_CHART_COLORS.accounts,
                stack: 'Stack 0',
            },
            {
                label: t('nav.investments') || 'Investments',
                data: investmentsData,
                backgroundColor: AREA_CHART_COLORS.investments,
                stack: 'Stack 0',
            },
            {
                label: t('nav.properties') || 'Real Estate',
                data: realEstateData,
                backgroundColor: AREA_CHART_COLORS.properties,
                stack: 'Stack 0',
            },
            {
                label: t('nav.collectibles') || 'Collectibles',
                data: collectiblesData,
                backgroundColor: AREA_CHART_COLORS.collectibles,
                stack: 'Stack 0',
            },
            {
                label: t('insurance.title') || 'Insurance',
                data: insuranceData,
                backgroundColor: AREA_CHART_COLORS.insurance,
                stack: 'Stack 0',
            }
        ];

        if (viewMode === 'net') {
            const taxData = filteredSnapshots.map(s => -((s.unrealizedTax || 0) / 100));
            datasets.push({
                label: t('dashboard.taxLiability') || 'Tax Liability',
                data: taxData,
                backgroundColor: '#ef4444', // Red-500
                stack: 'Stack 0'
            });
        }

        return {
            labels: filteredSnapshots.map(s => formatDate(s.date)),
            datasets
        };
    }, [snapshots, startDate, endDate, t, formatDate, viewMode]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { size: 12 },
                    color: '#64748b', // improved contrast
                    padding: 12,
                }
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(15, 23, 42, 0.95)', // dark with transparency
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderColor: '#334155',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                footerFont: { size: 13 },
                footerColor: '#10b981', // green for total
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
                grid: {
                    display: false
                },
                ticks: {
                    font: { size: 11 },
                    color: '#64748b',
                    maxRotation: 45,
                    minRotation: 0,
                }
            },
            y: {
                stacked: true,
                grid: {
                    color: 'rgba(51, 65, 85, 0.3)', // more subtle
                    lineWidth: 1,
                },
                ticks: {
                    font: { size: 11 },
                    color: '#64748b',
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

// Export memoized version as default
export default memo(NetWorthTrendChartComponent);
