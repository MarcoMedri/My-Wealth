import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Plus, Home, Building2, RefreshCw, MapPin, Trash2 } from 'lucide-react';
import { type Property } from '../../../../shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { PropertyModal } from './PropertyModal';
import { useNetWorth } from '../../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';

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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-foreground-subtle">
                <div className="bg-background-muted p-4 rounded-full mb-4 dark:bg-background-subtle">
                    <Home className="w-8 h-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">{t('properties.yourProperties')}</h2>
                <p className="max-w-md mb-6">{t('properties.trackDescription')}</p>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('properties.addFirst')}
                </button>
                {isModalOpen && (
                    <PropertyModal isOpen={isModalOpen} onClose={handleCloseModal} property={editingProperty} />
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-y-auto h-full">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-indigo-500" />
                    {t('properties.title')}
                </h1>
                <div className="flex gap-2">
                    <button onClick={() => refreshData()} className="btn btn-ghost" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleAdd} className="btn btn-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('properties.addProperty')}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('properties.totalValue')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalValue, baseCurrency)}
                    </div>
                    <div className="text-xs text-foreground-muted mt-1">{metrics.count} {t('properties.properties')}</div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('properties.appreciation')}</div>
                    <div className={`text-2xl font-bold ${metrics.appreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metrics.appreciation >= 0 ? '+' : ''}{formatMoney(metrics.appreciation, baseCurrency)}
                    </div>
                    <div className={`text-sm mt-1 ${metrics.appreciation >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                        {metrics.appreciationPercent >= 0 ? '+' : ''}{metrics.appreciationPercent.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border">
                    <div className="text-sm text-foreground-muted mb-1">{t('properties.purchaseCost')}</div>
                    <div className="text-2xl font-bold text-foreground">
                        {formatMoney(metrics.totalPurchasePrice, baseCurrency)}
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map(property => {
                    const Icon = PROPERTY_ICONS[property.type] || Building2;
                    const appreciation = property.purchasePrice
                        ? property.currentValue - property.purchasePrice
                        : 0;

                    return (
                        <div
                            key={property.id}
                            onClick={() => handleEdit(property)} // Click to edit
                            className="bg-background-card rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition-shadow group relative cursor-pointer"
                        >
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(property.id); }}
                                    className="p-1.5 hover:bg-background-muted dark:hover:bg-background-muted rounded text-foreground-subtle hover:text-rose-500"
                                    title={t('properties.delete')}
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
                                        {property.name}
                                    </h3>
                                    {property.address && (
                                        <p className="text-sm text-foreground-subtle truncate">{property.address}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border">
                                <div className="text-xs text-foreground-muted">{t('properties.currentValue')}</div>
                                <div className="text-lg font-bold text-foreground">
                                    {formatMoney(property.currentValue, property.currency)}
                                </div>
                                {property.purchasePrice && (
                                    <div className={`text-sm font-medium mt-1 ${appreciation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {appreciation >= 0 ? '+' : ''}{formatMoney(appreciation, property.currency)}
                                    </div>
                                )}
                            </div>

                            {property.squareMeters && (
                                <div className="mt-2 text-xs text-foreground-muted">
                                    {property.squareMeters} m² · {formatMoney(Math.round(property.currentValue / property.squareMeters), property.currency)}/m²
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <PropertyModal isOpen={isModalOpen} onClose={handleCloseModal} property={editingProperty} />
            )}
        </div>
    );
}
