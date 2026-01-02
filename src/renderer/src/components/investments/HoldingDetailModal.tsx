import React from 'react';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign, Percent } from 'lucide-react';
import { formatMoney } from '../../../../shared/schemas';
import type { Holding, Asset } from '../../../../shared/schemas';
import { useFormatDate } from '../../hooks/useFormatDate';

interface HoldingDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: Holding;
    asset: Asset;
}

export function HoldingDetailModal({ isOpen, onClose, holding, asset }: HoldingDetailModalProps) {
    const { formatDateTime } = useFormatDate();
    if (!isOpen) return null;

    const currentValue = holding.quantity * asset.currentPrice;
    const costBasis = holding.quantity * holding.averageBuyPrice;
    const totalGain = currentValue - costBasis;
    const gainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
    const isProfit = totalGain >= 0;

    // Day change
    const dayChange = asset.previousClose
        ? (asset.currentPrice - asset.previousClose) * holding.quantity
        : 0;
    const dayChangePercent = asset.previousClose && asset.previousClose > 0
        ? ((asset.currentPrice - asset.previousClose) / asset.previousClose) * 100
        : 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-2xl shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{asset.symbol}</h2>
                        <p className="text-sm text-foreground-muted mt-1">{asset.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Current Price */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-xl">
                        <div className="text-sm text-foreground-muted mb-1">Current Price</div>
                        <div className="text-3xl font-bold text-foreground">
                            {formatMoney(asset.currentPrice, asset.currency)}
                        </div>
                        {asset.previousClose && (
                            <div className={`flex items-center gap-1 mt-2 text-sm ${dayChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {dayChangePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span>{dayChangePercent >= 0 ? '+' : ''}{dayChangePercent.toFixed(2)}% today</span>
                            </div>
                        )}
                    </div>

                    {/* Position Overview */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background-muted p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-foreground-muted text-sm mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Holdings</span>
                            </div>
                            <div className="text-xl font-bold text-foreground">{holding.quantity}</div>
                            <div className="text-xs text-foreground-subtle mt-1">shares</div>
                        </div>

                        <div className="bg-background-muted p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-foreground-muted text-sm mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Current Value</span>
                            </div>
                            <div className="text-xl font-bold text-foreground">
                                {formatMoney(currentValue, asset.currency)}
                            </div>
                        </div>

                        <div className="bg-background-muted p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-foreground-muted text-sm mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Avg Cost</span>
                            </div>
                            <div className="text-xl font-bold text-foreground">
                                {formatMoney(holding.averageBuyPrice, asset.currency)}
                            </div>
                            <div className="text-xs text-foreground-subtle mt-1">per share</div>
                        </div>

                        <div className="bg-background-muted p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-foreground-muted text-sm mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Cost Basis</span>
                            </div>
                            <div className="text-xl font-bold text-foreground">
                                {formatMoney(costBasis, asset.currency)}
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className={`p-6 rounded-xl ${isProfit ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Percent className={`w-5 h-5 ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
                                <span className={`font-semibold ${isProfit ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'}`}>
                                    Total {isProfit ? 'Gain' : 'Loss'}
                                </span>
                            </div>
                            <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                {isProfit ? '+' : ''}{formatMoney(totalGain, asset.currency)}
                            </div>
                        </div>
                        <div className={`text-sm ${isProfit ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}% return
                        </div>
                    </div>

                    {/* Day Performance */}
                    {asset.previousClose && (
                        <div className="bg-background-muted p-4 rounded-xl">
                            <div className="flex items-center gap-2 text-foreground-muted text-sm mb-2">
                                <Calendar className="w-4 h-4" />
                                <span>Today&apos;s Change</span>
                            </div>
                            <div className={`text-xl font-bold ${dayChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {dayChange >= 0 ? '+' : ''}{formatMoney(dayChange, asset.currency)}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    {asset.metadata && (
                        <div className="border-t border-border pt-4">
                            <h3 className="text-sm font-semibold text-foreground mb-3">Asset Information</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {asset.metadata.exchange && (
                                    <div>
                                        <span className="text-foreground-muted">Exchange:</span>
                                        <span className="ml-2 text-foreground">{asset.metadata.exchange}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-foreground-muted">Type:</span>
                                    <span className="ml-2 text-foreground capitalize">{asset.type}</span>
                                </div>
                                <div>
                                    <span className="text-foreground-muted">Currency:</span>
                                    <span className="ml-2 text-foreground">{asset.currency}</span>
                                </div>
                                <div>
                                    <span className="text-foreground-muted">Last Updated:</span>
                                    <span className="ml-2 text-foreground">
                                        {formatDateTime(asset.lastUpdated)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border">
                    <button
                        onClick={onClose}
                        className="w-full btn btn-ghost"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
