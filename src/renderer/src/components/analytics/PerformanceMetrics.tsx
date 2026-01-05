/**
 * PerformanceMetrics Component
 * 
 * Displays portfolio performance metrics including TWR and MWR
 * with period selection and visual comparison.
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, Info } from 'lucide-react';

type Period = 'YTD' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL';

interface PerformanceMetricsProps {
    className?: string;
}

interface MetricsData {
    twr: number;
    mwr: number;
    startValue: number;
    endValue: number;
    totalCashFlow: number;
    absoluteGain: number;
    period: string;
}

export function PerformanceMetrics({ className = '' }: PerformanceMetricsProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('YTD');
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(false);

    // Load metrics when period changes
    const loadMetrics = async (period: Period) => {
        setLoading(true);
        try {
            // TODO: Call IPC to get metrics
            // const data = await window.api.getPerformanceMetrics(period);
            // setMetrics(data);

            // Mock data for now
            setMetrics({
                twr: 12.5,
                mwr: 10.8,
                startValue: 4200000, // €42,000 in cents
                endValue: 5250000,   // €52,500 in cents
                totalCashFlow: 525000, // €5,250 in cents
                absoluteGain: 525000,
                period,
            });
        } catch (error) {
            console.error('Failed to load performance metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load metrics on mount and period change
    useState(() => {
        loadMetrics(selectedPeriod);
    });

    const formatCurrency = (cents: number): string => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
        }).format(cents / 100);
    };

    const formatPercentage = (value: number): string => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const periods: Period[] = ['YTD', '1M', '3M', '6M', '1Y', '3Y', 'ALL'];

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Performance Metrics
                    </h2>
                </div>

                {/* Info tooltip */}
                <button
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="TWR eliminates cash flow impact. MWR accounts for timing."
                >
                    <Info className="w-4 h-4" />
                </button>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {periods.map((period) => (
                    <button
                        key={period}
                        onClick={() => {
                            setSelectedPeriod(period);
                            loadMetrics(period);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedPeriod === period
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        {period}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : metrics ? (
                <>
                    {/* TWR vs MWR Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* TWR Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                                    Time-Weighted Return
                                </span>
                                <Calendar className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-bold ${metrics.twr >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatPercentage(metrics.twr)}
                                </span>
                                {metrics.twr >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                                Eliminates cash flow impact
                            </p>
                        </div>

                        {/* MWR Card */}
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-purple-900 dark:text-purple-300">
                                    Money-Weighted Return
                                </span>
                                <Calendar className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-bold ${metrics.mwr >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatPercentage(metrics.mwr)}
                                </span>
                                {metrics.mwr >= 0 ? (
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                )}
                            </div>
                            <p className="text-xs text-purple-700 dark:text-purple-400 mt-2">
                                Accounts for timing of cash flows
                            </p>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Value</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(metrics.startValue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Value</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(metrics.endValue)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cash Flow</p>
                            <p className={`text-sm font-semibold ${metrics.totalCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(metrics.totalCashFlow)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Gain</p>
                            <p className={`text-sm font-semibold ${metrics.absoluteGain >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {formatCurrency(metrics.absoluteGain)}
                            </p>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            <strong>TWR</strong> measures investment strategy performance (what the portfolio earned).
                            <strong className="ml-2">MWR</strong> measures your personal return (what you earned, including timing).
                        </p>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No performance data available</p>
                    <p className="text-sm mt-2">Add transactions to see performance metrics</p>
                </div>
            )}
        </div>
    );
}
