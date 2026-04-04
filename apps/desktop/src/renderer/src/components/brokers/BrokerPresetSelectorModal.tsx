import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Plus, Building2 } from 'lucide-react';
import { LogoMetadata } from '@shared/types';

interface BrokerPresetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPreset: (preset: LogoMetadata) => void;
    onCustomBroker: () => void;
    logoRegistry: LogoMetadata[];
}

export const BrokerPresetSelectorModal: React.FC<BrokerPresetSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelectPreset,
    onCustomBroker,
    logoRegistry
}) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter logos based on search
    const filteredLogos = useMemo(() => {
        if (!searchQuery.trim()) return logoRegistry;

        const query = searchQuery.toLowerCase();
        return logoRegistry.filter(logo =>
            logo.name.toLowerCase().includes(query) ||
            logo.category.toLowerCase().includes(query) ||
            logo.type.toLowerCase().includes(query)
        );
    }, [searchQuery, logoRegistry]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            {t('brokers.selectBroker', 'Select Broker')}
                        </h2>
                        <p className="text-sm text-foreground-muted mt-1">
                            {t('brokers.selectPresetOrCustom', 'Choose a preset or create a custom broker')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-background-muted rounded-lg transition-colors text-foreground-muted hover:text-foreground"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Custom Broker Button */}
                    <button
                        onClick={() => {
                            onCustomBroker();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-primary/50 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Plus size={24} className="text-primary" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-foreground">
                                {t('brokers.customBroker', 'Custom Broker')}
                            </div>
                            <div className="text-sm text-foreground-muted">
                                {t('brokers.createCustomBroker', 'Create a broker with custom details')}
                            </div>
                        </div>
                    </button>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('brokers.searchPresets', 'Search presets...')}
                            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>

                    {/* Preset Grid */}
                    <div>
                        <h3 className="text-sm font-medium text-foreground-muted mb-3 flex items-center gap-2">
                            <Building2 size={16} />
                            {t('brokers.presetBrokers', 'Preset Brokers')} ({filteredLogos.length})
                        </h3>

                        {filteredLogos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {filteredLogos.map((preset) => (
                                    <button
                                        key={preset.name}
                                        onClick={() => {
                                            onSelectPreset(preset);
                                            onClose();
                                        }}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white p-2 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform">
                                            <img
                                                src={`asset://${encodeURIComponent(preset.icon)}`}
                                                alt={preset.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <span className="text-sm text-center text-foreground font-medium line-clamp-2">
                                            {preset.name}
                                        </span>
                                        <span className="text-xs text-foreground-muted">
                                            {t(`brokers.types.${preset.type}`, preset.type)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-foreground-muted">
                                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>{t('brokers.noPresetsFound', 'No presets found')}</p>
                                <p className="text-sm mt-1">{t('brokers.tryDifferentSearch', 'Try a different search term')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
