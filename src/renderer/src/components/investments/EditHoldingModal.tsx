import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../../store/useVaultStore';
import type { Holding, Asset } from '../../../../shared/schemas';

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(holding.quantity.toString());
            setAverageBuyPrice((holding.averageBuyPrice / 100).toString());
            setTaxRate((holding.taxRate ?? 26).toString());
        }
    }, [isOpen, holding]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const updatedHolding = {
                ...holding,
                quantity: parseFloat(quantity),
                averageBuyPrice: Math.round(parseFloat(averageBuyPrice) * 100),
                taxRate: parseFloat(taxRate),
                updatedAt: new Date().toISOString()
            };

            await window.api.saveHolding(updatedHolding);
            await refreshInvestments();
            onClose();
        } catch (error) {
            console.error('Failed to update holding', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-background-card rounded-2xl w-full max-w-md shadow-xl border border-border flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background-main rounded-t-2xl">
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
