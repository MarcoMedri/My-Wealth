
import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, Home, Building2, RefreshCw, MapPin, Trash2, TrendingUp } from 'lucide-react';
import { type Property } from '../../@my-wealth/shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { PropertyModal } from './PropertyModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState } from '../ui';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/utils';

const PROPERTY_ICONS: Record<string, typeof Building2> = {
    residence: Home,
    rental: Building2,
    vacation: Home,
    land: MapPin,
    commercial: Building2,
    other: Building2,
};

export function PropertiesDashboard() {
    const { properties, refreshData, isLoading } = useVaultStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined);

    // Use Net Worth hook for currency conversion
    const { convert, baseCurrency } = useNetWorth();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();

    // Calculate totals
    const metrics = useMemo(() => {
        let totalValue = 0;
        let totalPurchasePrice = 0;

        properties.forEach(property => {
            totalValue += convert(property.currentValue, property.currency);
            if (property.purchasePrice) {
                totalPurchasePrice += convert(property.purchasePrice, property.currency);
            }
        });

        const appreciation = totalValue - totalPurchasePrice;
        const appreciationPercent = totalPurchasePrice > 0 ? (appreciation / totalPurchasePrice) * 100 : 0;

        return {
            totalValue,
            totalPurchasePrice,
            appreciation,
            appreciationPercent,
            count: properties.length,
        };
    }, [properties, convert]);

    const handleEdit = (property: Property) => {
        setEditingProperty(property);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('properties.confirmDelete'))) {
            try {
                await window.api.deleteProperty(id);
                await refreshData();
            } catch (error) {
                console.error('Failed to delete property:', error);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProperty(undefined);
    };

    const handleAdd = () => {
        setEditingProperty(undefined);
        setIsModalOpen(true);
    };

    if (!properties.length) {
        return (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
                <EmptyState
                    icon={Home}
                    title={t('properties.yourProperties')}
                    description={t('properties.trackDescription')}
                    action={{
                        label: t('properties.addFirst'),
                        onClick: handleAdd
                    }}
                />
                {isModalOpen && (
                    <PropertyModal isOpen={isModalOpen} onClose={handleCloseModal} property={editingProperty} />
                )}
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-card-gap overflow-y-auto">
            <div className="px-card-p">
                {/* Header */}
                <PageHeader
                    title={t('properties.title')}
                    description={t('properties.subtitle')}
                    icon={Building2}
                    iconClassName="text-indigo-500"
                    actions={
                        <>
                            <button
                                onClick={() => refreshData()}
                                className="btn btn-ghost flex items-center gap-1"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleAdd}
                                className="btn btn-primary"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('properties.addProperty')}
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
                                <Building2 className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('properties.totalValue')}</p>
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
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('properties.appreciation')}</p>
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
                                <Home className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('properties.count')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate">
                            {properties.length}
                        </p>
                    </Card>
                </div>

                {/* Properties Grid */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    {properties.map(property => {
                        const Icon = PROPERTY_ICONS[property.type] || Building2;
                        const currentValue = property.currentValue || property.purchasePrice || 0;
                        const appreciation = property.purchasePrice
                            ? currentValue - property.purchasePrice
                            : 0;

                        return (
                            <div
                                key={property.id}
                                onClick={() => handleEdit(property)}
                                className="card p-card-p cursor-pointer hover:shadow-md transition-all group relative"
                            >
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(property.id); }}
                                        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded text-foreground-subtle hover:text-rose-600 transition-colors"
                                        title={t('properties.delete')}
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
                                            {property.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 rounded-md bg-background-subtle text-xs font-medium text-foreground-muted uppercase tracking-wider">
                                                {t(`properties.types.${property.type} `)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border space-y-1">
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-xs font-medium text-foreground-muted uppercase tracking-wider">{t('properties.currentValue')}</span>
                                        <span className="text-xl font-bold text-foreground">
                                            {formatMoney(currentValue, property.currency)}
                                        </span>
                                    </div>

                                    {property.purchasePrice && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-foreground-subtle">{t('properties.appreciation')}</span>
                                            <span className={cn(
                                                "font-medium",
                                                appreciation >= 0 ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {appreciation >= 0 ? '+' : ''}{formatMoney(appreciation, property.currency)}
                                            </span>
                                        </div>
                                    )}

                                    {property.squareMeters && (
                                        <div className="flex justify-between items-center text-sm pt-2">
                                            <span className="text-foreground-subtle">{property.squareMeters} m²</span>
                                            <span className="text-foreground-muted">
                                                {formatMoney(Math.round(currentValue / property.squareMeters), property.currency)}/m²
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isModalOpen && (
                    <PropertyModal isOpen={isModalOpen} onClose={handleCloseModal} property={editingProperty} />
                )}
            </div>
        </div>
    );
}
