import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import { cn } from '../../lib/utils';
import type { Holding, Asset } from '../../@my-wealth/shared/schemas';

interface EditHoldingModalProps {
    isOpen: boolean;
    onClose: () => void;
    holding: Holding;
    asset: Asset;
}

export function EditHoldingModal({ isOpen, onClose, holding, asset }: EditHoldingModalProps) {
    const { t } = useTranslation();
    const { refreshInvestments } = useVaultStore();

    const [quantity, setQuantity] = useState(holding.quantity.toString());
    const [averageBuyPrice, setAverageBuyPrice] = useState((holding.averageBuyPrice / 100).toString());
    const [taxRate, setTaxRate] = useState((holding.taxRate ?? 26).toString());
    const [assetName, setAssetName] = useState(asset.name);
    const [assetSymbol, setAssetSymbol] = useState(asset.symbol);
    const [assetType, setAssetType] = useState<Asset['type']>(asset.type);
    const [autoRefresh, setAutoRefresh] = useState(asset.autoRefresh !== false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(holding.quantity.toString());
            setAverageBuyPrice((holding.averageBuyPrice / 100).toString());
            setTaxRate((holding.taxRate ?? 26).toString());
            setAssetName(asset.name);
            setAssetSymbol(asset.symbol);
            setAssetType(asset.type);
            setAutoRefresh(asset.autoRefresh !== false);
        }
    }, [isOpen, holding, asset]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Update holding
            const updatedHolding = {
                ...holding,
                quantity: parseFloat(quantity),
                averageBuyPrice: Math.round(parseFloat(averageBuyPrice) * 100),
                taxRate: parseFloat(taxRate),
                updatedAt: new Date().toISOString()
            };

            // Update asset if anything changed
            if (assetName !== asset.name || assetSymbol !== asset.symbol || assetType !== asset.type || autoRefresh !== (asset.autoRefresh !== false)) {
                const updatedAsset = {
                    ...asset,
                    name: assetName,
                    symbol: assetSymbol.toUpperCase(),
                    type: assetType,
                    autoRefresh: autoRefresh,
                    updatedAt: new Date().toISOString()
                };
                await window.api.saveAsset(updatedAsset);
            }

            await window.api.saveHolding(updatedHolding);
            await refreshInvestments();
            onClose();
        } catch (error) {
            console.error('Failed to update holding', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const ASSET_TYPES: Asset['type'][] = ['stock', 'etf', 'crypto', 'bond', 'fund', 'insurance', 'other'];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background-card rounded-2xl w-full max-w-md shadow-xl border border-border flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background-main rounded-t-2xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            {t('common.edit')} {asset.symbol}
                        </h2>
                        <p className="text-xs text-foreground-muted">{asset.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground-subtle">
                                {t('investments.symbol')}
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none uppercase"
                                value={assetSymbol}
                                onChange={e => setAssetSymbol(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground-subtle">
                                {t('common.type')}
                            </label>
                            <select
                                value={assetType}
                                onChange={e => setAssetType(e.target.value as Asset['type'])}
                                className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none appearance-none"
                            >
                                {ASSET_TYPES.map(type => (
                                    <option key={type} value={type}>
                                        {t(`investments.types.${type}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground-subtle">
                            {t('investments.name')}
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={assetName}
                            onChange={e => setAssetName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground-subtle">
                            {t('investments.quantity')}
                        </label>
                        <input
                            type="number"
                            step="any"
                            required
                            className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground-subtle">
                            {t('investments.buyPrice')} ({asset.currency})
                        </label>
                        <input
                            type="number"
                            step="any"
                            required
                            className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={averageBuyPrice}
                            onChange={e => setAverageBuyPrice(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground-subtle">
                            {t('modals.investmentModal.taxRate')}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                required
                                className="w-full p-2 bg-background-subtle border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                            />
                            <div className="absolute right-3 top-2 text-foreground-muted text-sm">%</div>
                        </div>
                    </div>

                    {/* Auto-refresh toggle */}
                    <div className="flex items-center justify-between py-2 px-3 bg-background-subtle rounded-lg border border-border">
                        <div>
                            <label className="text-sm font-medium text-foreground cursor-pointer" htmlFor="auto-refresh-toggle">
                                {t('investments.autoRefresh')}
                            </label>
                            <p className="text-xs text-foreground-muted">
                                {t('investments.autoRefreshDesc', 'Aggiorna prezzi da Yahoo Finance')}
                            </p>
                        </div>
                        <button
                            id="auto-refresh-toggle"
                            type="button"
                            aria-checked={autoRefresh}
                            role="switch"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={cn(
                                "w-10 h-6 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary border-2",
                                autoRefresh
                                    ? "bg-primary border-primary"
                                    : "bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600"
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform",
                                    autoRefresh ? "translate-x-4" : "translate-x-0"
                                )}
                            />
                        </button>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-background-subtle transition-colors font-medium"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

