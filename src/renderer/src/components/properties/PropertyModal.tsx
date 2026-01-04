import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import type { Property } from '../../../../shared/schemas';
import { useTranslation } from 'react-i18next';

interface PropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    property?: Property;
}

const PROPERTY_TYPES = [
    { value: 'residence', labelKey: 'modals.propertyModal.types.residence' },
    { value: 'rental', labelKey: 'modals.propertyModal.types.rental' },
    { value: 'vacation', labelKey: 'modals.propertyModal.types.vacation' },
    { value: 'land', labelKey: 'modals.propertyModal.types.land' },
    { value: 'commercial', labelKey: 'modals.propertyModal.types.commercial' },
    { value: 'other', labelKey: 'modals.propertyModal.types.other' },
];

export function PropertyModal({ isOpen, onClose, property }: PropertyModalProps) {
    const { refreshData } = useVaultStore();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [type, setType] = useState<string>('residence');
    const [address, setAddress] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [squareMeters, setSquareMeters] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (property) {
                // Edit mode
                setName(property.name);
                setType(property.type);
                setAddress(property.address || '');
                setCurrentValue((property.currentValue / 100).toFixed(2));
                setPurchasePrice(property.purchasePrice ? (property.purchasePrice / 100).toFixed(2) : '');
                setPurchaseDate(property.purchaseDate ? property.purchaseDate.substring(0, 10) : '');
                setSquareMeters(property.squareMeters ? property.squareMeters.toString() : '');
                setNotes(property.notes || '');
            } else {
                // Add mode
                setName('');
                setType('residence');
                setAddress('');
                setCurrentValue('');
                setPurchasePrice('');
                setPurchaseDate('');
                setSquareMeters('');
                setNotes('');
            }
        }
    }, [isOpen, property]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !currentValue) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const payload = {
                id: property ? property.id : crypto.randomUUID(),
                name,
                type: type as Property['type'],
                address: address || undefined,
                currentValue: Math.round(parseFloat(currentValue) * 100), // to cents
                purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
                purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
                squareMeters: squareMeters ? parseFloat(squareMeters) : undefined,
                notes: notes || undefined,
                lastValuationDate: property ? property.lastValuationDate : now, // Preserve original valuation date unless explicitly updated logic added later
                currency: property ? property.currency : 'EUR',
                createdAt: property ? property.createdAt : now,
                taxRate: property ? property.taxRate : 0,
                updatedAt: now,
            };

            await window.api.saveProperty(payload);
            await refreshData();
            onClose();
        } catch (e) {
            console.error('Failed to save property:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const isEdit = !!property;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isEdit ? t('modals.propertyModal.editTitle') : t('modals.propertyModal.addTitle')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.name')} *</label>
                        <input
                            type="text"
                            required
                            placeholder={t('modals.propertyModal.namePlaceholder')}
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.type')}</label>
                        <select
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={type}
                            onChange={e => setType(e.target.value)}
                        >
                            {PROPERTY_TYPES.map(pt => (
                                <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.address')}</label>
                        <input
                            type="text"
                            placeholder={t('modals.propertyModal.addressPlaceholder')}
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.currentValue')} *</label>
                            <input
                                type="number"
                                step="any"
                                required
                                placeholder="250000"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.purchasePrice')}</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="200000"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={purchasePrice}
                                onChange={e => setPurchasePrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.purchaseDate')}</label>
                            <input
                                type="date"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.size')}</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="85"
                                className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                value={squareMeters}
                                onChange={e => setSquareMeters(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">{t('modals.propertyModal.notes')}</label>
                        <textarea
                            placeholder={t('modals.propertyModal.notesPlaceholder')}
                            className="w-full p-2 bg-background-card border border-input-border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
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
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEdit ? t('modals.saveChanges') : t('modals.propertyModal.addTitle'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
