import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2 } from 'lucide-react';

// Mapping of preset names to their file extensions
const LOGO_EXTENSIONS: Record<string, string> = {
    'AIA': '.jpeg',
    'Allianz': '.jpeg',
    'AXA': '.jpeg',
    'BCC': '.jpeg',
    'Binance': '.jpeg',
    'BPER': '.jpeg',
    'BPM': '.png',
    'BPPB': '.jpeg',
    'BPSO': '.jpeg',
    'Banca AideXa': '.png',
    'Banca Generali': '.jpeg',
    'Banca Ifis': '.jpeg',
    'Banco Desio': '.jpeg',
    'Chase': '.jpeg',
    'Coinbase': '.png',
    'Credem': '.jpeg',
    'Crédit Agricole': '.jpeg',
    'Crédit Mutuel': '.jpeg',
    'Degiro': '.jpeg',
    'Deutsche Bank': '.jpeg',
    'Directa Sim': '.jpeg',
    'Etica Sgr': '.png',
    'Fineco': '.jpeg',
    'Generali': '.jpeg',
    'HSBC': '.png',
    'Hype': '.jpeg',
    'Illimity': '.jpeg',
    'Interactive Brokers': '.jpeg',
    'Lloyds Bank': '.jpeg',
    'Mediolanum': '.png',
    'MPS': '.jpeg',
    'N26': '.jpeg',
    'Revolut': '.png',
    'Robinhood': '.png',
    'Santander': '.png',
    'Sella': '.jpeg',
    'Trade Republic': '.jpeg'
};

interface PresetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (presetName: string) => void;
    presets: string[];
}

export const PresetSelectorModal: React.FC<PresetSelectorModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    presets
}) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    // Helper to get logo path from preset name
    const getLogoPath = (presetName: string) => {
        const extension = LOGO_EXTENSIONS[presetName];
        if (!extension) return null;

        // In Electron, we need to use a custom protocol or copy files to public
        // For now, we'll use a relative path that assumes logos are in public/logos
        return `/logos/${presetName}${extension}`;
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border"
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

                {/* Grid */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="grid grid-cols-4 gap-3">
                        {presets.map((preset) => {
                            const logoPath = getLogoPath(preset);

                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onSelect(preset)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-background-subtle flex items-center justify-center overflow-hidden">
                                        {logoPath ? (
                                            <img
                                                src={logoPath}
                                                alt={preset}
                                                className="w-full h-full object-contain p-1"
                                            />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-foreground-muted group-hover:text-primary transition-colors" />
                                        )}
                                    </div>
                                    <span className="text-xs text-center text-foreground-muted group-hover:text-foreground transition-colors line-clamp-2">
                                        {preset}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
