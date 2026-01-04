import React, { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import { formatMoney } from '../../../../shared/schemas';
import type { Holding, Asset } from '../../../../shared/schemas';

interface SellInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: Holding;
    asset: Asset;
}

export function SellInvestmentModal({ isOpen, onClose, holding, asset }: SellInvestmentModalProps) {
    const { t } = useTranslation();
    const { sellInvestment, deleteHolding } = useVaultStore();

    // Form state
    const [quantity, setQuantity] = useState(holding.quantity.toString());
    const [price, setPrice] = useState((asset.currentPrice / 100).toString());
    const [buyPrice, setBuyPrice] = useState((holding.averageBuyPrice / 100).toString());
    const [taxRate, setTaxRate] = useState('26'); // Default to 26%
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fees, setFees] = useState('0');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState<'sell' | 'delete'>('sell');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(holding.quantity.toString());
            setPrice((asset.currentPrice / 100).toString());
            setBuyPrice((holding.averageBuyPrice / 100).toString());
            setDate(new Date().toISOString().split('T')[0]);
            setFees('0');
            // TODO: Get default tax rate from settings if available
            setTaxRate('26');
            setMode('sell');
            setErrorMessage(null);
        }
    }, [isOpen, holding, asset]);

    // Calculate realized gain preview
    const quantityNum = parseFloat(quantity) || 0;
    const priceNum = parseFloat(price) || 0;
    const buyPriceNum = parseFloat(buyPrice) || 0;
    const feesNum = parseFloat(fees) || 0;
    const taxRateNum = parseFloat(taxRate) || 0;

    const proceeds = quantityNum * priceNum;
    const costBasis = quantityNum * buyPriceNum;
    const grossGain = proceeds - costBasis - feesNum;

    // Tax calc
    const taxAmount = grossGain > 0 ? grossGain * (taxRateNum / 100) : 0;
    const netResult = grossGain - taxAmount;
    const isProfit = netResult >= 0;

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quantityNum <= 0 || quantityNum > holding.quantity) return;

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await sellInvestment(
                holding.id,
                quantityNum,
                Math.round(priceNum * 100), // to cents
                Math.round(feesNum * 100),  // to cents
                date,
                taxRateNum,
                Math.round(buyPriceNum * 100)
            );
            onClose();
        } catch (error) {
            console.error("Sell failed:", error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to sell investment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await deleteHolding(holding.id);
            onClose();
        } catch (error) {
            console.error("Delete failed:", error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to delete holding');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                        {mode === 'sell'
                            ? t('modals.sellModal.titleSell', { symbol: asset.symbol })
                            : t('modals.sellModal.titleRemove', { symbol: asset.symbol })
                        }
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 mb-6">
                        <button
                            type="button"
                            onClick={() => setMode('sell')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${mode === 'sell'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                : 'bg-background-muted dark:bg-background-subtle text-foreground-muted'
                                }`}
                        >
                            {t('modals.sellModal.modeSell')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('delete')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${mode === 'delete'
                                ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                : 'bg-background-muted dark:bg-background-subtle text-foreground-muted'
                                }`}
                        >
                            {t('modals.sellModal.modeRemove')}
                        </button>
                    </div>

                    {/* Current Position Info */}
                    <div className="bg-background-muted p-4 rounded-xl mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-foreground-subtle">{t('modals.investmentModal.quantity')}</div>
                                <div className="font-semibold text-foreground">{holding.quantity}</div>
                            </div>
                            <div>
                                <div className="text-foreground-subtle">{t('investments.buyPrice')}</div>
                                <div className="font-semibold text-foreground">
                                    {formatMoney(holding.averageBuyPrice, asset.currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-foreground-subtle">{t('investments.currentPrice')}</div>
                                <div className="font-semibold text-foreground">
                                    {formatMoney(asset.currentPrice, asset.currency)}
                                </div>
                            </div>
                            <div>
                                <div className="text-foreground-subtle">{t('investments.currentValue')}</div>
                                <div className="font-semibold text-foreground">
                                    {formatMoney(holding.quantity * asset.currentPrice, asset.currency)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {mode === 'sell' ? (
                        <form onSubmit={handleSell} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.quantityToSell')}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.00001"
                                        max={holding.quantity}
                                        required
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="text-xs text-indigo-500 hover:text-indigo-600"
                                        onClick={() => setQuantity(holding.quantity.toString())}
                                    >
                                        {t('modals.sellModal.sellAll')}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.salePrice')}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.buyPrice')}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={buyPrice}
                                        onChange={e => setBuyPrice(e.target.value)}
                                    />
                                    <div className="text-xs text-foreground-muted">
                                        {t('modals.sellModal.avgCost')}: {formatMoney(holding.averageBuyPrice, asset.currency)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.taxRate')} (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={taxRate}
                                        onChange={e => setTaxRate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.saleDate')}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-foreground">
                                        {t('modals.sellModal.fees')}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        value={fees}
                                        onChange={e => setFees(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Gain/Loss Preview */}
                            {quantityNum > 0 && priceNum > 0 && (
                                <div className={`p-4 rounded-xl space-y-2 ${isProfit
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : 'bg-rose-50 dark:bg-rose-900/20'
                                    }`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-foreground-muted">{t('modals.sellModal.grossResult')}</span>
                                        <span className={`font-medium ${grossGain >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {formatMoney(Math.round(grossGain * 100), asset.currency)}
                                        </span>
                                    </div>
                                    {taxAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground-muted">{t('modals.sellModal.estimatedTax')} ({taxRateNum}%)</span>
                                            <span className="text-rose-600">
                                                -{formatMoney(Math.round(taxAmount * 100), asset.currency)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            {isProfit ? (
                                                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                                            )}
                                            <span className={`font-bold ${isProfit
                                                ? 'text-emerald-900 dark:text-emerald-200'
                                                : 'text-rose-900 dark:text-rose-200'
                                                }`}>
                                                {t('modals.sellModal.netResult')}
                                            </span>
                                        </div>
                                        <span className={`font-bold text-lg ${isProfit
                                            ? 'text-emerald-700 dark:text-emerald-300'
                                            : 'text-rose-700 dark:text-rose-300'
                                            }`}>
                                            {isProfit ? '+' : ''}{formatMoney(Math.round(netResult * 100), asset.currency)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Validation warning */}
                            {quantityNum > holding.quantity && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{t('modals.sellModal.errorInsufficient', { quantity: holding.quantity })}</span>
                                </div>
                            )}

                            {/* Error message */}
                            {errorMessage && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 btn btn-ghost"
                                    onClick={onClose}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn btn-primary bg-emerald-600 hover:bg-emerald-700"
                                    disabled={isSubmitting || quantityNum <= 0 || quantityNum > holding.quantity}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('modals.sellModal.confirmSale')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5" />
                                    <div className="text-sm text-rose-900 dark:text-rose-200">
                                        <p className="font-medium mb-1">{t('modals.sellModal.snapshotModeTitle')}</p>
                                        <p className="text-rose-700 dark:text-rose-300">
                                            {t('modals.sellModal.snapshotModeDesc')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 btn btn-ghost"
                                    onClick={onClose}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 btn btn-primary bg-rose-600 hover:bg-rose-700"
                                    disabled={isSubmitting}
                                    onClick={handleDelete}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('modals.sellModal.confirmRemove')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
