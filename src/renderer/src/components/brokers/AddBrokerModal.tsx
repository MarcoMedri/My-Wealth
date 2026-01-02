
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Building2, Wallet } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';

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
}

const BROKER_TYPES = ['bank', 'broker', 'crypto_exchange', 'other'] as const;

export const AddBrokerModal: React.FC<AddBrokerModalProps> = ({ isOpen, onClose, editBrokerId }) => {
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
                    // We don't easily preview local files in this modal without converting to file:// URL which might be tricky in renderer depending on CSP
                    // But for now let's just stick to editing website = preview new logo
                    // If user is editing, we show current state.
                }
            }
        } else if (isOpen) {
            // Reset for new
            setName('');
            setWebsite('');
            setLogoUrl('');
            setLogoPreviewError(false);
            setType('broker');
            setColor('#6366f1');
            setIcon('');
        }
    }, [isOpen, editBrokerId, getBroker]);

    // Live preview when website changes
    useEffect(() => {
        if (website && website.includes('.')) {
            setLogoUrl(`https://logo.clearbit.com/${website}`);
            setLogoPreviewError(false);
        } else {
            setLogoUrl('');
        }
    }, [website]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const now = new Date().toISOString();
            const id = editBrokerId || generateId();

            // Attempt to download logo if website is provided
            let logoPath: string | null = null;
            if (website && !logoPreviewError) {
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
            onClose();
        } catch (error) {
            console.error('Failed to save broker', error);
            alert(t('errors.saveFailed'));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {editBrokerId ? <Building2 className="text-blue-500" /> : <Wallet className="text-green-500" />}
                        {editBrokerId ? t('brokers.editBroker') : t('brokers.addBroker')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Name & Website Grid */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('brokers.nameLabel')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('brokers.namePlaceholder')}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Website <span className="text-gray-400 font-normal">(Auto-fetch Logo)</span>
                                </label>
                                <input
                                    type="text"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="e.g. revolut.com"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            {/* Logo Preview */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Logo
                                </label>
                                <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
                                    {logoUrl && !logoPreviewError ? (
                                        <img
                                            src={logoUrl}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                            onError={() => setLogoPreviewError(true)}
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-400">?</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('brokers.typeLabel')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {BROKER_TYPES.map(tOption => (
                                <button
                                    key={tOption}
                                    type="button"
                                    onClick={() => setType(tOption)}
                                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${type === tOption
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {t(`brokers.types.${tOption}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('common.color')}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="h-10 w-10 p-1 rounded cursor-pointer bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                            />
                            <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">{color}</span>
                        </div>
                    </div>

                    {/* Icon (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('common.icon')} <span className="text-gray-400 font-normal">({t('common.optional')})</span>
                        </label>
                        <input
                            type="text"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder="Emoji (e.g. 🏦)"
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            maxLength={2}
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        </div>
    );
};
