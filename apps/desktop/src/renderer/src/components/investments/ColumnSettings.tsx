import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Check } from 'lucide-react';
import type { HoldingsColumn } from './HoldingsTable';

export function ColumnSettings({ visibleColumns, onChange }: {
    visibleColumns?: string[],
    onChange: (cols: string[]) => void
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const AVAILABLE_COLUMNS: { key: HoldingsColumn, label: string }[] = [
        { key: 'quantity', label: 'investments.quantity' },
        { key: 'price', label: 'investments.price' },
        { key: 'avgPrice', label: 'investments.avgWithCost' },
        { key: 'taxRate', label: 'investments.taxRate' },
        { key: 'estTax', label: 'investments.estTax' },
        { key: 'dayChange', label: 'investments.dayChange' },
        { key: 'value', label: 'investments.value' },
        { key: 'gainLoss', label: 'investments.gainLoss' },
    ];

    const currentVisible = visibleColumns || AVAILABLE_COLUMNS.map(c => c.key);

    const toggleColumn = (key: string) => {
        if (currentVisible.includes(key)) {
            // Don't allow hiding all columns? Maybe just check > 1
            if (currentVisible.length <= 1) return;
            onChange(currentVisible.filter(c => c !== key));
        } else {
            onChange([...currentVisible, key]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg hover:bg-background-muted transition-colors ${isOpen ? 'bg-background-muted text-foreground' : 'text-foreground-muted'}`}
                title={t('common.settings')}
            >
                <Settings size={18} />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-background-card border border-border rounded-xl shadow-xl z-50 p-1">
                    <div className="py-2 px-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                        {t('common.columns', 'Colonne')}
                    </div>
                    <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                        {AVAILABLE_COLUMNS.map(col => {
                            const isVisible = currentVisible.includes(col.key);
                            return (
                                <button
                                    key={col.key}
                                    onClick={() => toggleColumn(col.key)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-background-muted transition-colors flex items-center justify-between group"
                                >
                                    <span className={isVisible ? 'text-foreground' : 'text-foreground-muted'}>
                                        {t(col.label)}
                                    </span>
                                    {isVisible && <Check size={14} className="text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
