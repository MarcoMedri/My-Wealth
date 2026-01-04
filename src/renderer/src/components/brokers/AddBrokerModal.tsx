import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Building2, Wallet, ImagePlus } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { PresetSelectorModal } from './PresetSelectorModal';
import { LogoPickerModal } from './LogoPickerModal';
import { isValidUrl, sanitizeDomain } from '../../lib/security';
import type { LogoMetadata } from '../../../../shared/types';
import { toast } from 'sonner';

// We need a UUID generator since crypto might not be available directly in renderer the same way
// But usually we can use crypto.randomUUID() in modern browsers/Electron
// If that fails, we can use a simple helper
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

interface AddBrokerModalProps {
    isOpen: boolean;
    onClose: () => void;
    editBrokerId?: string;
    initialPreset?: LogoMetadata | null;
}

const BROKER_TYPES = ['bank', 'broker', 'crypto_exchange', 'insurance', 'other'] as const;

export const AddBrokerModal: React.FC<AddBrokerModalProps> = ({ isOpen, onClose, editBrokerId, initialPreset }) => {
    const { t } = useTranslation();
    const saveBroker = useVaultStore(state => state.saveBroker);
    const getBroker = useVaultStore(state => state.getBroker);

    const [website, setWebsite] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoPreviewError, setLogoPreviewError] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState<typeof BROKER_TYPES[number]>('broker');
    const [color, setColor] = useState('#6366f1');
    const [icon, setIcon] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [customLogoPath, setCustomLogoPath] = useState<string | null>(null);
    const [useCustomLogo, setUseCustomLogo] = useState(false);
    const [showPresetSelector, setShowPresetSelector] = useState(false);
    const [showLogoPicker, setShowLogoPicker] = useState(false);
    const [logoRegistry, setLogoRegistry] = useState<LogoMetadata[]>([]);

    // Load logo registry on mount
    useEffect(() => {
        const loadRegistry = async () => {
            try {
                const registry = await window.api.getLogoRegistry();
                setLogoRegistry(registry.logos);
            } catch (error) {
                console.error('Failed to load logo registry:', error);
            }
        };
        loadRegistry();
    }, []);

    useEffect(() => {
        if (isOpen && editBrokerId) {
            const broker = getBroker(editBrokerId);
            if (broker) {
                setName(broker.name);
                setWebsite(broker.website || '');
                setType(broker.type);
                setColor(broker.color);
                setIcon(broker.icon || '');
                // If we have a website but no local logo path, try to preview from clearbit
                if (broker.website && !broker.logoPath) {
                    setLogoUrl(`https://logo.clearbit.com/${broker.website}`);
                } else if (broker.logoPath) {
                    setLogoUrl(broker.logoPath);
                }
            }
        } else if (isOpen && initialPreset) {
            // Pre-fill from preset
            setName(initialPreset.name);
            setType(initialPreset.type);
            setLogoUrl(`asset://${initialPreset.icon}`);
            setWebsite('');
            setColor('#6366f1');
            setIcon('');
            setCustomLogoPath(null);
            setUseCustomLogo(false);
        } else if (isOpen) {
            // Reset for new
            setName('');
            setWebsite('');
            setLogoUrl('');
            setLogoPreviewError(false);
            setType('broker');
            setColor('#6366f1');
            setIcon('');
            setCustomLogoPath(null);
            setUseCustomLogo(false);
        }
    }, [isOpen, editBrokerId, initialPreset, getBroker]);

    // Live preview when website changes
    useEffect(() => {
        if (website && website.includes('.')) {
            // Security: Sanitize domain to prevent XSS in generated URL
            const safeDomain = sanitizeDomain(website);
            if (safeDomain) {
                setLogoUrl(`https://logo.clearbit.com/${safeDomain}`);
                setLogoPreviewError(false);
                setUseCustomLogo(false);
            }
        } else {
            setLogoUrl('');
        }
    }, [website]);

    const handlePresetSelect = (preset: LogoMetadata) => {
        setName(preset.name);
        setWebsite(preset.website || `${preset.name.toLowerCase().replace(/\s+/g, '')}.com`);
        setType(preset.type); // Auto-fill type from preset
        setUseCustomLogo(false);
        setShowPresetSelector(false);
    };

    // Logo picker handler
    const handleLogoSelect = (logoUrl: string, source: 'brand' | 'icon' | 'emoji' | 'upload', metadata?: LogoMetadata) => {
        setLogoUrl(logoUrl);
        setLogoPreviewError(false);
        setUseCustomLogo(source === 'upload');
        if (source === 'upload') {
            setCustomLogoPath(logoUrl.replace('file://', ''));
        }

        // Auto-fill name and type from metadata if available (preset selection)
        if (metadata) {
            setName(metadata.name);
            setType(metadata.type);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const now = new Date().toISOString();
            const id = editBrokerId || generateId();

            // Determine logo path based on source
            let logoPath: string | null = null;

            if (useCustomLogo && customLogoPath) {
                // Save custom uploaded logo
                try {
                    logoPath = await window.api.saveBrokerLogo(customLogoPath, id);
                } catch (err) {
                    console.error('Failed to save custom logo', err);
                }
            } else if (logoUrl && logoUrl.startsWith('asset://')) {
                // Preset logo from registry - save the asset:// URL directly
                logoPath = logoUrl;
            } else if (website && !logoPreviewError) {
                // Auto-fetch from Clearbit (legacy, if website field is re-added)
                try {
                    logoPath = await window.api.downloadBrokerLogo(website, id);
                } catch (err) {
                    console.error('Failed to download logo during save', err);
                }
            }

            const broker = {
                id,
                name,
                website: website || undefined,
                logoPath: logoPath || (editBrokerId ? getBroker(editBrokerId)?.logoPath : undefined),
                type,
                color,
                icon: icon || undefined,
                sortOrder: 0,
                createdAt: editBrokerId ? (getBroker(editBrokerId)?.createdAt || now) : now,
                updatedAt: now,
            };

            // Zod validation would happen here or in main process, but for now we trust the form
            await saveBroker(broker);

            // Show success toast
            if (editBrokerId) {
                toast.success(t('brokers.updated', 'Broker updated successfully'));
            } else {
                toast.success(t('brokers.created', 'Broker created successfully'));
            }

            onClose();
        } catch (error) {
            console.error('Failed to save broker', error);
            toast.error(t('brokers.saveFailed', 'Failed to save broker'));
        } finally {
            setIsLoading(false);
        }
    };

    // Security: Derive safe URL for rendering
    // This explicit separation helps static analysis tools verify safety
    const safeLogoUrl = React.useMemo(() => {
        if (logoUrl && !logoPreviewError && isValidUrl(logoUrl)) {
            return logoUrl;
        }
        return null;
    }, [logoUrl, logoPreviewError]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background-card rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-border">
                <div className="p-6 border-b border-border flex items-center justify-between bg-background-subtle">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {editBrokerId ? <Building2 className="text-primary" /> : <Wallet className="text-success" />}
                        {editBrokerId ? t('brokers.editBroker') : t('brokers.addBroker')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Logo Circle (clickable) + Nome Input */}
                    <div className="flex items-center gap-4">
                        {/* Logo Circle */}
                        <button
                            type="button"
                            onClick={() => setShowLogoPicker(true)}
                            className="w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary flex items-center justify-center transition-colors bg-background-subtle overflow-hidden flex-shrink-0"
                        >
                            {safeLogoUrl ? (
                                <img
                                    src={safeLogoUrl}
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                    onError={() => setLogoPreviewError(true)}
                                />
                            ) : (
                                <ImagePlus className="w-8 h-8 text-foreground-muted" />
                            )}
                        </button>

                        {/* Nome Input */}
                        <div className="flex-1">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
                                    <Building2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('brokers.namePlaceholder')}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('brokers.typeLabel')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {BROKER_TYPES.map(tOption => (
                                <button
                                    key={tOption}
                                    type="button"
                                    onClick={() => setType(tOption)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${type === tOption
                                        ? 'border-primary bg-primary/10 text-primary font-medium'
                                        : 'border-border hover:bg-background-muted text-foreground-muted hover:text-foreground'
                                        }`}
                                >
                                    {t(`brokers.types.${tOption}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('common.color')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-10 p-1 rounded cursor-pointer bg-background border border-border"
                            />
                            <span className="text-foreground-muted font-mono text-sm">{color}</span>
                        </div>
                    </div>

                    {/* Icon (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('common.icon')} <span className="text-foreground-subtle font-normal">({t('common.optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder="Emoji (e.g. 🏦)"
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            maxLength={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-foreground-muted hover:bg-background-muted rounded-lg transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name}
                            className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check size={18} />
                                    {editBrokerId ? t('common.save') : t('common.create')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Preset Selector Modal */}
            <PresetSelectorModal
                isOpen={showPresetSelector}
                onClose={() => setShowPresetSelector(false)}
                onSelect={handlePresetSelect}
                onNewBroker={() => {
                    setShowPresetSelector(false);
                    // User skipped preset selection, form is already open
                }}
                presets={logoRegistry}
            />

            {/* Logo Picker Modal */}
            <LogoPickerModal
                isOpen={showLogoPicker}
                onClose={() => setShowLogoPicker(false)}
                onSelectLogo={handleLogoSelect}
                logoRegistry={logoRegistry}
            />
        </div>
    );
};
