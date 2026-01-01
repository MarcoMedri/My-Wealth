import React, { useState, useEffect } from 'react';
import { X, Loader2, Watch, Palette, Wine, Box, Car, Coins, Tag } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import type { Collectible } from '../../../../shared/schemas';
import { useTranslation } from 'react-i18next';

interface CollectibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    collectible?: Collectible;
}

const COLLECTIBLE_TYPES = [
    { value: 'watch', labelKey: 'modals.collectibleModal.types.watch', icon: Watch },
    { value: 'art', labelKey: 'modals.collectibleModal.types.art', icon: Palette },
    { value: 'wine', labelKey: 'modals.collectibleModal.types.wine', icon: Wine },
    { value: 'jewelry', labelKey: 'modals.collectibleModal.types.jewelry', icon: Box },
    { value: 'vehicle', labelKey: 'modals.collectibleModal.types.vehicle', icon: Car },
    { value: 'trading_card', labelKey: 'modals.collectibleModal.types.trading_card', icon: Box },
    { value: 'coin', labelKey: 'modals.collectibleModal.types.coin', icon: Coins },
    { value: 'other', labelKey: 'modals.collectibleModal.types.other', icon: Tag },
];

export function CollectibleModal({ isOpen, onClose, collectible }: CollectibleModalProps) {
    const { refreshData } = useVaultStore();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [type, setType] = useState<string>('watch');
    const [description, setDescription] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (collectible) {
                // Edit mode
                setName(collectible.name);
                setType(collectible.type);
                setDescription(collectible.description || '');
                setCurrentValue((collectible.currentValue / 100).toFixed(2));
                setPurchasePrice(collectible.purchasePrice ? (collectible.purchasePrice / 100).toFixed(2) : '');
                setPurchaseDate(collectible.purchaseDate ? collectible.purchaseDate.substring(0, 10) : '');
                setImageUrl(collectible.imageUrl || '');
            } else {
                // Add mode
                setName('');
                setType('watch');
                setDescription('');
                setCurrentValue('');
                setPurchasePrice('');
                setPurchaseDate('');
                setImageUrl('');
            }
        }
    }, [isOpen, collectible]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !currentValue) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const payload = {
                id: collectible ? collectible.id : crypto.randomUUID(),
                name,
                type,
                description: description || undefined,
                currentValue: Math.round(parseFloat(currentValue) * 100), // to cents
                purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
                purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
                imageUrl: imageUrl || undefined,
                currency: collectible ? collectible.currency : 'EUR',
                createdAt: collectible ? collectible.createdAt : now,
                updatedAt: now,
            };

            await window.api.saveCollectible(payload);
            await refreshData();
            onClose();
        } catch (e) {
            console.error('Failed to save collectible:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEdit = !!collectible;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isEdit ? t('modals.collectibleModal.editTitle') : t('modals.collectibleModal.addTitle')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.name')} *</label>
                        <input
                            type="text"
                            required
                            placeholder={t('modals.collectibleModal.namePlaceholder')}
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.type')}</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {COLLECTIBLE_TYPES.map(ct => {
                                // Dynamic icon logic if simple mapping isn't enough, 
                                // but for now we can infer or pass icons if we refactor COLLECTIBLE_TYPES.
                                // Let's keep it simple and just use text labels with a nice style.
                                return (
                                    <button
                                        key={ct.value}
                                        type="button"
                                        onClick={() => setType(ct.value)}
                                        className={`
                                            flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                                            ${type === ct.value
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-400 dark:text-indigo-300 ring-1 ring-indigo-500'
                                                : 'bg-background-card border-border text-foreground-muted hover:border-border hover:bg-background-muted/50'}
                                        `}
                                    >
                                        <span className="text-xs font-medium">{t(ct.labelKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.currentValue')} *</label>
                            <input
                                type="number"
                                step="any"
                                required
                                placeholder="15000"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.purchasePrice')}</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="12000"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={purchasePrice}
                                onChange={e => setPurchasePrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.purchaseDate')}</label>
                        <input
                            type="date"
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={purchaseDate}
                            onChange={e => setPurchaseDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.collectibleModal.description')}</label>
                        <textarea
                            placeholder={t('modals.collectibleModal.notesPlaceholder')}
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={2}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Image URL</label>
                        <input
                            type="text"
                            placeholder="http://..."
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            className="flex-1 btn btn-ghost"
                            onClick={onClose}
                        >
                            {t('modals.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? t('modals.save') : t('modals.add'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
