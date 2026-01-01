import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, RefreshCw, Watch, Palette, Wine, Coins, Car, Box, Trash2, Tag } from 'lucide-react';
import { type Collectible } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { CollectibleModal } from './CollectibleModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';

const COLLECTIBLE_ICONS: Record<string, typeof Watch> = {
    watch: Watch,
    art: Palette,
    wine: Wine,
    jewelry: Box, // Fallback as no specific Jewelry icon in basic set sometimes
    vehicle: Car,
    trading_card: Box,
    coin: Coins,
    other: Tag,
};

export function CollectiblesDashboard() {
    const { collectibles, refreshData, isLoading } = useVaultStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Collectible | undefined>(undefined);

    // Use Net Worth hook for currency conversion
    const { convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    // Calculate totals
    const metrics = useMemo(() => {
        let totalValue = 0;
        let totalPurchasePrice = 0;

        collectibles.forEach(item => {
            totalValue += convert(item.currentValue, item.currency);
            if (item.purchasePrice) {
                totalPurchasePrice += convert(item.purchasePrice, item.currency);
            }
        });

        const appreciation = totalValue - totalPurchasePrice;
        const appreciationPercent = totalPurchasePrice > 0 ? (appreciation / totalPurchasePrice) * 100 : 0;

        return {
            totalValue,
            totalPurchasePrice,
            appreciation,
            appreciationPercent,
            count: collectibles.length,
        };
    }, [collectibles, convert]);

    const handleEdit = (item: Collectible) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('collectibles.confirmDelete'))) {
            try {
                await window.api.deleteCollectible(id);
                await refreshData();
            } catch (error) {
                console.error('Failed to delete collectible:', error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingItem(undefined);
    };

    const handleAdd = () => {
        setEditingItem(undefined);
        setIsModalOpen(true);
    };

    if (!collectibles.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-foreground-subtle">
                <div className="bg-background-muted p-4 rounded-full mb-4 dark:bg-background-subtle">
                    <Watch className="w-8 h-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{t('collectibles.yourCollectibles')}</h2>
                <p className="max-w-md mb-6">{t('collectibles.trackDescription')}</p>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('collectibles.addFirst')}
                </button>
                {isModalOpen && (
                    <CollectibleModal isOpen={isModalOpen} onClose={handleCloseModal} collectible={editingItem} />
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Watch className="w-6 h-6 text-indigo-500" />
                    {t('collectibles.title')}
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => refreshData()} className="btn btn-ghost" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleAdd} className="btn btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('collectibles.addItem')}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('collectibles.totalValue')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalValue, baseCurrency)}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">{metrics.count} {t('collectibles.items')}</div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('collectibles.appreciation')}</div>
                    <div className={`text-2xl font-bold ${metrics.appreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metrics.appreciation >= 0 ? '+' : ''}{formatMoney(metrics.appreciation, baseCurrency)}
                    </div>
                    <div className={`text-sm mt-1 ${metrics.appreciation >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                        {metrics.appreciationPercent >= 0 ? '+' : ''}{metrics.appreciationPercent.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('collectibles.purchaseCost')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalPurchasePrice, baseCurrency)}
                    </div>
                </div>
            </div>

            {/* Collectibles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collectibles.map(item => {
                    const Icon = COLLECTIBLE_ICONS[item.type] || Tag;
                    const appreciation = item.purchasePrice
                        ? item.currentValue - item.purchasePrice
                        : 0;

                    return (
                        <div
                            key={item.id}
                            onClick={() => handleEdit(item)}
                            className="bg-background-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow group relative cursor-pointer"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                    className="p-1.5 hover:bg-background-muted dark:hover:bg-background-muted rounded text-foreground-subtle hover:text-rose-500"
                                    title={t('collectibles.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0 pr-16">
                                    <h3 className="font-semibold text-foreground truncate">
                                        {item.name}
                                    </h3>
                                    {item.description && (
                                        <p className="text-sm text-foreground-subtle truncate">{item.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border flex justify-between items-end">
                                <div>
                                    <div className="text-xs text-foreground-muted">{t('collectibles.currentValue')}</div>
                                    <div className="text-lg font-bold text-foreground">
                                        {formatMoney(item.currentValue, item.currency)}
                                    </div>
                                </div>
                                {item.purchasePrice && (
                                    <div className={`text-sm font-medium ${appreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {appreciation >= 0 ? '+' : ''}{formatMoney(appreciation, item.currency)}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <CollectibleModal isOpen={isModalOpen} onClose={handleCloseModal} collectible={editingItem} />
            )}
        </div>
    );
}
