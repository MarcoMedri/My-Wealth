import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, RefreshCw, Watch, Palette, Wine, Coins, Car, Box, Trash2, Tag, TrendingUp } from 'lucide-react';
import { type Collectible } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { CollectibleModal } from './CollectibleModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '../ui';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/utils';

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
            <Card className="h-full flex items-center justify-center min-h-[400px]">
                <EmptyState
                    icon={Watch}
                    title={t('collectibles.yourCollectibles')}
                    description={t('collectibles.trackDescription')}
                    action={{
                        label: t('collectibles.addFirst'),
                        onClick: handleAdd
                    }}
                />
                {isModalOpen && (
                    <CollectibleModal isOpen={isModalOpen} onClose={handleCloseModal} collectible={editingItem} />
                )}
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-card-gap overflow-y-auto">
            <div className="px-card-p">
                {/* Header */}
                <PageHeader
                    title={t('collectibles.title')}
                    description={t('collectibles.subtitle')}
                    icon={Watch}
                    iconClassName="text-indigo-500"
                    actions={
                        <>
                            <button
                                onClick={() => refreshData()}
                                className="p-2 text-foreground-muted hover:text-foreground hover:bg-background-subtle rounded-lg transition-colors"
                                disabled={isLoading}
                            >
                                <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                            </button>
                            <button
                                onClick={handleAdd}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                {t('collectibles.addItem')}
                            </button>
                        </>
                    }
                />
            </div>

            <div className="p-card-p">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-card-gap">
                    <Card className="p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Watch className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('collectibles.totalValue')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate" title={formatMoney(metrics.totalValue, baseCurrency)}>
                            {formatMoney(metrics.totalValue, baseCurrency)}
                        </p>
                    </Card>

                    <Card className="p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('collectibles.totalGain')}</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className={cn("text-2xl font-bold tracking-tight truncate", metrics.appreciation >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {metrics.appreciation >= 0 ? '+' : ''}{formatMoney(metrics.appreciation, baseCurrency)}
                            </p>
                            <p className={cn("text-sm font-medium", metrics.appreciation >= 0 ? "text-emerald-500/80" : "text-rose-500/80")}>
                                ({metrics.appreciationPercent.toFixed(2)}%)
                            </p>
                        </div>
                    </Card>

                    <Card className="p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Coins className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('collectibles.items')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate">
                            {collectibles.length}
                        </p>
                    </Card>
                </div>

                {/* Items Grid */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    {collectibles.map(item => {
                        const Icon = COLLECTIBLE_ICONS[item.type] || Tag;
                        const appreciation = item.purchasePrice
                            ? item.currentValue - item.purchasePrice
                            : 0;

                        return (
                            <Card
                                key={item.id}
                                onClick={() => handleEdit(item)}
                                className="p-card-p cursor-pointer hover:shadow-md transition-all group relative"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-foreground-subtle hover:text-rose-600 transition-colors"
                                        title={t('collectibles.delete')}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                        <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8">
                                        <h3 className="font-semibold text-lg text-foreground truncate">
                                            {item.name}
                                        </h3>
                                        {item.description && (
                                            <p className="text-sm text-foreground-subtle truncate">{item.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border space-y-1">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">{t('collectibles.currentValue')}</span>
                                        <span className="text-xl font-bold text-foreground">
                                            {formatMoney(item.currentValue, item.currency)}
                                        </span>
                                    </div>

                                    {item.purchasePrice && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground-subtle">{t('collectibles.appreciation')}</span>
                                            <span className={cn(
                                                "font-medium",
                                                appreciation >= 0 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {appreciation >= 0 ? '+' : ''}{formatMoney(appreciation, item.currency)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <CollectibleModal isOpen={isModalOpen} onClose={handleCloseModal} collectible={editingItem} />
            )}
        </div>
    );
}
