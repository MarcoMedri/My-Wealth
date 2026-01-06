/**
 * PortfolioXRay Component
 * 
 * Displays portfolio composition analysis across sectors, geographies, and asset classes.
 * Shows diversification score and concentration warnings.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Globe, Briefcase, AlertTriangle, TrendingUp } from 'lucide-react';

interface AllocationItem {
    name: string;
    value: number;
    percentage: number;
    count: number;
}

interface PortfolioComposition {
    totalValue: number;
    sectors: AllocationItem[];
    geographies: AllocationItem[];
    assetClasses: AllocationItem[];
    topHoldings: {
        assetId: string;
        symbol: string;
        name: string;
        value: number;
        percentage: number;
    }[];
}

export function PortfolioXRay() {
    const { t } = useTranslation();
    const [composition, setComposition] = useState<PortfolioComposition | null>(null);
    const [diversificationScore, setDiversificationScore] = useState<number>(0);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadComposition();
    }, []);

    const loadComposition = async () => {
        setLoading(true);
        try {
            // TODO: Call IPC to get composition
            // const data = await window.api.getPortfolioComposition();
            // setComposition(data);

            // Mock data for now
            setComposition({
                totalValue: 5250000, // €52,500
                sectors: [
                    { name: 'Technology', value: 1837500, percentage: 35, count: 5 },
                    { name: 'Healthcare', value: 1050000, percentage: 20, count: 3 },
                    { name: 'Finance', value: 787500, percentage: 15, count: 2 },
                    { name: 'Consumer', value: 787500, percentage: 15, count: 3 },
                    { name: 'Energy', value: 525000, percentage: 10, count: 2 },
                    { name: 'Other', value: 262500, percentage: 5, count: 1 },
                ],
                geographies: [
                    { name: 'North America', value: 3150000, percentage: 60, count: 8 },
                    { name: 'Europe', value: 1312500, percentage: 25, count: 5 },
                    { name: 'Asia', value: 787500, percentage: 15, count: 3 },
                ],
                assetClasses: [
                    { name: 'Stocks', value: 3675000, percentage: 70, count: 12 },
                    { name: 'ETFs', value: 1050000, percentage: 20, count: 3 },
                    { name: 'Cryptocurrency', value: 525000, percentage: 10, count: 2 },
                ],
                topHoldings: [
                    { assetId: '1', symbol: 'AAPL', name: 'Apple Inc.', value: 787500, percentage: 15 },
                    { assetId: '2', symbol: 'MSFT', name: 'Microsoft Corp.', value: 656250, percentage: 12.5 },
                    { assetId: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', value: 525000, percentage: 10 },
                ],
            });
            setDiversificationScore(72);
            setWarnings([]);
        } catch (error) {
            console.error('Failed to load portfolio composition:', error);
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

    const getScoreColor = (score: number): string => {
        if (score >= 70) return 'text-green-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreLabel = (score: number): string => {
        if (score >= 70) return 'Well Diversified';
        if (score >= 50) return 'Moderately Diversified';
        return 'Concentrated';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!composition) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No portfolio data available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Diversification Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {t('analytics.portfolioXRay')}
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.portfolioXRayDescription', 'Analisi approfondita della composizione del portafoglio')}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('analytics.diversificationScore')}</p>
                        <div className={`text-4xl font-bold ${getScoreColor(diversificationScore)}`}>
                            {diversificationScore}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getScoreLabel(diversificationScore)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                                {t('analytics.concentrationRisks')}
                            </h3>
                            <ul className="space-y-1">
                                {warnings.map((warning, i) => (
                                    <li key={i} className="text-sm text-yellow-800 dark:text-yellow-400">
                                        • {warning}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Sector Allocation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('analytics.sectorAllocation')}
                    </h2>
                </div>
                <div className="space-y-3">
                    {composition.sectors.map((sector) => (
                        <div key={sector.name}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {sector.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {sector.percentage.toFixed(1)}% • {formatCurrency(sector.value)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${sector.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Geographic Exposure */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('analytics.geographicExposure')}
                    </h2>
                </div>
                <div className="space-y-3">
                    {composition.geographies.map((geo) => (
                        <div key={geo.name}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {geo.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {geo.percentage.toFixed(1)}% • {formatCurrency(geo.value)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all"
                                    style={{ width: `${geo.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Asset Class Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('analytics.assetClassBreakdown')}
                    </h2>
                </div>
                <div className="space-y-3">
                    {composition.assetClasses.map((assetClass) => (
                        <div key={assetClass.name}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {assetClass.name}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {assetClass.percentage.toFixed(1)}% • {formatCurrency(assetClass.value)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                    style={{ width: `${assetClass.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Holdings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('analytics.topHoldings')}
                    </h2>
                </div>
                <div className="space-y-3">
                    {composition.topHoldings.map((holding, index) => (
                        <div
                            key={holding.assetId}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <span className="text-sm font-bold text-orange-600">
                                        {index + 1}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {holding.symbol}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {holding.name}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(holding.value)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {holding.percentage.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
