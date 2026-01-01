import { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Snapshot } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useSettingsStore } from '../../store/useSettingsStore';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface NetWorthTrendProps {
    snapshots: Snapshot[];
    startDate: Date;
    endDate: Date;
    baseCurrency?: string;
}

export default function NetWorthTrendChart({ snapshots, startDate, endDate }: NetWorthTrendProps) {
    const formatMoney = useFormatMoney();
    const currency = useSettingsStore(state => state.currency);

    const trendData = useMemo(() => {
        const filteredSnapshots = snapshots
            .filter(s => {
                const d = new Date(s.date);
                return d >= startDate && d <= endDate;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
            labels: filteredSnapshots.map(s => new Date(s.date).toLocaleDateString()),
            datasets: [
                {
                    label: 'Net Worth',
                    data: filteredSnapshots.map(s => s.totalNetWorth / 100),
                    borderColor: '#6366f1', // Primary brand color
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2,
                }
            ]
        };
    }, [snapshots, startDate, endDate]);

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatMoney(context.parsed.y * 100, currency);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' }
            },
            y: {
                grid: { color: '#f1f5f9' },
                ticks: {
                    font: { size: 10 },
                    color: '#94a3b8',
                    callback: (val: any) => formatMoney(val * 100, currency)
                }
            }
        }
    };

    return (
        <div className="w-full h-full min-h-[300px]">
            {trendData.labels.length > 0 ? (
                <Line data={trendData} options={lineOptions} />
            ) : (
                <div className="flex h-full items-center justify-center text-foreground-subtle text-xs">Not enough data</div>
            )}
        </div>
    );
}
