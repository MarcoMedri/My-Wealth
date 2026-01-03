import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2 } from 'lucide-react';

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
    const [logoUrls, setLogoUrls] = React.useState<Record<string, string | null>>({});

    // Load logo URLs when modal opens
    React.useEffect(() => {
        if (!isOpen) return;

        const loadLogos = async () => {
            const urls: Record<string, string | null> = {};
            for (const preset of presets) {
                const url = await window.api.getPresetLogoPath(preset);
                urls[preset] = url;
            }
            setLogoUrls(urls);
        };

        loadLogos();
    }, [isOpen, presets]);

    if (!isOpen) return null;

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
                            const logoUrl = logoUrls[preset];

                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => onSelect(preset)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-background-subtle flex items-center justify-center overflow-hidden">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
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
