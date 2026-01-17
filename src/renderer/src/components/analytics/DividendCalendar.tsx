/**
 * DividendCalendar Component
 * 
 * Displays upcoming dividend payments and monthly passive income estimates.
 * Shows yield on cost for dividend-paying holdings.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, Info } from 'lucide-react';
import { Card, CardHeader, CardSkeleton, EmptyState } from '../ui';
import { DESIGN_TOKENS } from '../../lib/design-tokens';

interface DividendPrediction {
    assetId: string;
    symbol: string;
    name: string;
    expectedDate: string;
    estimatedAmount: number;
    amountPerShare: number;
    confidence: 'high' | 'medium' | 'low';
}

interface MonthlyIncome {
    month: string;
    totalIncome: number;
    payments: DividendPrediction[];
}

export function DividendCalendar() {
    const { t } = useTranslation();
    const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDividends();
    }, []);

    const loadDividends = async () => {
        setLoading(true);
        try {
            // TODO: Call IPC to get dividend predictions
            // const data = await window.api.getMonthlyIncome(12);
            // setMonthlyIncome(data);

            // Mock data for now
            setMonthlyIncome([
                {
                    month: '2026-01',
                    totalIncome: 45000, // €450
                    payments: [
                        {
                            assetId: '1',
                            symbol: 'AAPL',
                            name: 'Apple Inc.',
                            expectedDate: '2026-01-15',
                            estimatedAmount: 12000,
                            amountPerShare: 24,
                            confidence: 'high',
                        },
                        {
                            assetId: '2',
                            symbol: 'MSFT',
                            name: 'Microsoft Corp.',
                            expectedDate: '2026-01-25',
                            estimatedAmount: 15000,
                            amountPerShare: 68,
                            confidence: 'high',
                        },
                        {
                            assetId: '3',
                            symbol: 'JNJ',
                            name: 'Johnson & Johnson',
                            expectedDate: '2026-01-30',
                            estimatedAmount: 18000,
                            amountPerShare: 106,
                            confidence: 'high',
                        },
                    ],
                },
                {
                    month: '2026-02',
                    totalIncome: 38000,
                    payments: [
                        {
                            assetId: '4',
                            symbol: 'KO',
                            name: 'Coca-Cola',
                            expectedDate: '2026-02-10',
                            estimatedAmount: 18000,
                            amountPerShare: 44,
                            confidence: 'high',
                        },
                        {
                            assetId: '5',
                            symbol: 'PEP',
                            name: 'PepsiCo',
                            expectedDate: '2026-02-20',
                            estimatedAmount: 20000,
                            amountPerShare: 118,
                            confidence: 'medium',
                        },
                    ],
                },
            ]);
        } catch (error) {
            console.error('Failed to load dividend predictions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (cents: number): string => {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR',
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('it-IT', {
            day: 'numeric',
            month: 'short',
        }).format(date);
    };

    const formatMonth = (monthStr: string): string => {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return new Intl.DateTimeFormat('it-IT', {
            month: 'long',
            year: 'numeric',
        }).format(date);
    };

    const getConfidenceBadge = (confidence: string) => {
        const colors = {
            high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors[confidence as keyof typeof colors]}`}>
                {t(`analytics.${confidence}`)}
            </span>
        );
    };

    const totalAnnualIncome = monthlyIncome.reduce((sum, m) => sum + m.totalIncome, 0);
    const avgMonthlyIncome = monthlyIncome.length > 0 ? totalAnnualIncome / monthlyIncome.length : 0;

    if (loading) {
        return <CardSkeleton lines={5} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader
                    icon={Calendar}
                    iconColor={DESIGN_TOKENS.colors.icon.dividend}
                    title={t('analytics.dividendCalendar')}
                    subtitle={t('analytics.upcomingPayments', 'Pagamenti previsti e previsione reddito passivo')}
                />
                <div className="text-right mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('analytics.avgMonthlyIncome')}</p>
                    <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(avgMonthlyIncome)}
                    </p>
                </div>
            </Card>

            {/* Monthly Income Timeline */}
            {monthlyIncome.length > 0 ? (
                <div className="space-y-4">
                    {monthlyIncome.map((month) => (
                        <div
                            key={month.month}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                        >
                            {/* Month Header */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatMonth(month.month)}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    <span className="text-lg font-bold text-green-600">
                                        {formatCurrency(month.totalIncome)}
                                    </span>
                                </div>
                            </div>

                            {/* Payments */}
                            <div className="space-y-3">
                                {month.payments.map((payment) => (
                                    <div
                                        key={`${payment.assetId}-${payment.expectedDate}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center min-w-[60px]">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(payment.expectedDate)}
                                                </p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {payment.symbol}
                                                    </p>
                                                    {getConfidenceBadge(payment.confidence)}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    {payment.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(payment.estimatedAmount)}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatCurrency(payment.amountPerShare)}/share
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card>
                    <EmptyState
                        icon={Calendar}
                        title={t('analytics.noPaymentsExpected')}
                        description={t('analytics.addStocksForPredictions')}
                    />
                </Card>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                            {t('analytics.aboutPredictions')}
                        </h4>
                        <p className="text-sm text-blue-800 dark:text-blue-400">
                            {t('analytics.predictionsBasedOnHistory')}
                            <strong className="ml-1">{t('analytics.high')}</strong> {t('analytics.confidenceExplanation', 'indica 2+ anni di pagamenti regolari.')}
                            {t('analytics.actualAmountsMayVary')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
