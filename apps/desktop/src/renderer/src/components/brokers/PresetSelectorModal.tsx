import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import type { LogoMetadata, LogoCategory } from '../../@my-wealth/shared/types';

interface PresetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (preset: LogoMetadata) => void;
    onNewBroker: () => void;
    presets: LogoMetadata[];
}

export const PresetSelectorModal: React.FC<PresetSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    onNewBroker,
    presets
}) => {
    const { t } = useTranslation();
    const [collapsedCategories, setCollapsedCategories] = useState<Set<LogoCategory>>(new Set());

    // Group presets by category
    const presetsByCategory = useMemo(() => {
        const grouped = presets.reduce((acc, preset) => {
            if (!acc[preset.category]) {
                acc[preset.category] = [];
            }
            acc[preset.category].push(preset);
            return acc;
        }, {} as Record<LogoCategory, LogoMetadata[]>);

        // Sort categories in desired order
        const categoryOrder: LogoCategory[] = ['bank', 'fintech', 'broker', 'crypto', 'insurance', 'other'];
        const sorted: Record<LogoCategory, LogoMetadata[]> = {} as Record<LogoCategory, LogoMetadata[]>;

        categoryOrder.forEach(cat => {
            if (grouped[cat]) {
                sorted[cat] = grouped[cat];
            }
        });

        return sorted;
    }, [presets]);

    const toggleCategory = (category: LogoCategory) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background-card rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-background-subtle">
                    <h3 className="text-lg font-bold text-foreground">
                        {t('brokers.presetSelector')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* New Broker Button */}
                <div className="p-4 border-b border-border bg-background">
                    <button
                        onClick={() => {
                            onNewBroker();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg transition-colors font-medium shadow-sm"
                    >
                        <Plus size={20} />
                        {t('brokers.newBroker')}
                    </button>
                </div>

                {/* Categories with Collapsible Sections */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {Object.entries(presetsByCategory).map(([category, categoryPresets]) => {
                        const isCollapsed = collapsedCategories.has(category as LogoCategory);

                        return (
                            <div key={category} className="border border-border rounded-lg overflow-hidden">
                                {/* Category Header - Clickable */}
                                <button
                                    onClick={() => toggleCategory(category as LogoCategory)}
                                    className="w-full flex items-center justify-between p-4 bg-background-subtle hover:bg-background-muted transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {isCollapsed ? (
                                            <ChevronRight size={18} className="text-foreground-muted" />
                                        ) : (
                                            <ChevronDown size={18} className="text-foreground-muted" />
                                        )}
                                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                                            {t(`brokers.categories.${category}`)}
                                        </h4>
                                    </div>
                                    <span className="text-xs text-foreground-muted bg-background px-2 py-1 rounded-full">
                                        {categoryPresets.length}
                                    </span>
                                </button>

                                {/* Presets Grid - Collapsible */}
                                {!isCollapsed && (
                                    <div className="p-4 bg-background">
                                        <div className="grid grid-cols-4 gap-3">
                                            {categoryPresets.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    onClick={() => onSelect(preset)}
                                                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                                >
                                                    <div className="w-14 h-14 rounded-full bg-background-subtle flex items-center justify-center overflow-hidden border border-border group-hover:border-primary transition-colors">
                                                        <img
                                                            src={`asset://${preset.icon}`}
                                                            alt={preset.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                // Fallback to Building2 icon if image fails
                                                                const parent = (e.target as HTMLElement).parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = '';
                                                                    const icon = document.createElement('div');
                                                                    icon.className = 'w-6 h-6 text-foreground-muted group-hover:text-primary';
                                                                    parent.appendChild(icon);
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-center text-foreground-muted group-hover:text-foreground transition-colors line-clamp-2 w-full">
                                                        {preset.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
