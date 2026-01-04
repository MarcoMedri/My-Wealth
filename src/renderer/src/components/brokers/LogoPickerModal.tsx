import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Globe } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import type { LogoMetadata } from '../../../../shared/types';

// Finance & Building icons from lucide-react
import {
    Wallet,
    CreditCard,
    Landmark,
    TrendingUp,
    PiggyBank,
    Coins,
    Banknote,
    Building,
    Building2,
    Home,
    Store,
    Factory
} from 'lucide-react';

interface LogoPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLogo: (logoUrl: string, source: 'brand' | 'icon' | 'emoji' | 'upload', metadata?: LogoMetadata) => void;
    logoRegistry: LogoMetadata[];
}

type TabType = 'brand' | 'icon' | 'emoji' | 'upload';

const FINANCE_ICONS = [
    { name: 'Wallet', Icon: Wallet },
    { name: 'CreditCard', Icon: CreditCard },
    { name: 'Landmark', Icon: Landmark },
    { name: 'TrendingUp', Icon: TrendingUp },
    { name: 'PiggyBank', Icon: PiggyBank },
    { name: 'Coins', Icon: Coins },
    { name: 'Banknote', Icon: Banknote },
];

const BUILDING_ICONS = [
    { name: 'Building', Icon: Building },
    { name: 'Building2', Icon: Building2 },
    { name: 'Home', Icon: Home },
    { name: 'Store', Icon: Store },
    { name: 'Factory', Icon: Factory },
];

export const LogoPickerModal: React.FC<LogoPickerModalProps> = ({
    isOpen,
    onClose,
    onSelectLogo,
    logoRegistry
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('brand');
    const [searchQuery, setSearchQuery] = useState('');
    const [webResults, setWebResults] = useState<Array<{ name: string; url: string; source: string }>>([]);
    const [localResults, setLocalResults] = useState<LogoMetadata[]>([]);

    // Brand search handler
    const handleBrandSearch = (query: string) => {
        setSearchQuery(query);

        if (!query.trim()) {
            setWebResults([]);
            setLocalResults([]);
            return;
        }

        // Auto-append .com if no domain extension
        const domain = query.includes('.') ? query : `${query}.com`;

        // Web results
        const clearbitUrl = `https://logo.clearbit.com/${domain}`;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

        setWebResults([
            { name: query, url: clearbitUrl, source: 'Logo HD' },
            { name: `${query} (alternativo)`, url: faviconUrl, source: 'Google Favicon' }
        ]);

        // Local results - filter logo registry
        const matches = logoRegistry.filter(preset =>
            preset.name.toLowerCase().includes(query.toLowerCase())
        );
        setLocalResults(matches);
    };

    // Icon selection handler
    const handleIconSelect = (iconName: string) => {
        // Create SVG data URL from icon
        // For now, we'll store the icon name and render it dynamically
        onSelectLogo(`icon:${iconName}`, 'icon');
        onClose();
    };

    // Emoji selection handler
    const handleEmojiSelect = (emojiData: EmojiClickData) => {
        // Convert emoji to data URL or store as text
        onSelectLogo(emojiData.emoji, 'emoji');
        onClose();
    };

    // File upload handler
    const handleFileUpload = async () => {
        const filePath = await window.api.selectBrokerLogo();
        if (filePath) {
            onSelectLogo(`file://${filePath}`, 'upload');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-background-subtle">
                    <h3 className="text-lg font-bold text-foreground">
                        {t('brokers.logoPicker.title')}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border bg-background-subtle">
                    {(['brand', 'icon', 'emoji', 'upload'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab
                                ? 'text-primary border-b-2 border-primary bg-background'
                                : 'text-foreground-muted hover:text-foreground'
                                }`}
                        >
                            {t(`brokers.logoPicker.tabs.${tab}`)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Brand Tab */}
                    {activeTab === 'brand' && (
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleBrandSearch(e.target.value)}
                                    placeholder={t('brokers.logoPicker.searchPlaceholder')}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            {/* Web Results - Only show when searching */}
                            {webResults.length > 0 && (
                                <div>
                                    <h4 className="flex items-center gap-2 text-sm font-medium text-foreground-muted mb-3">
                                        <Globe size={16} />
                                        {t('brokers.logoPicker.webResults')}
                                    </h4>
                                    <div className="space-y-2">
                                        {webResults.map((result, idx) => {
                                            // Validate URL protocol prevents XSS
                                            const isValid = (url: string) => {
                                                try {
                                                    const p = new URL(url).protocol;
                                                    return p === 'http:' || p === 'https:';
                                                } catch { return false; }
                                            };

                                            if (!isValid(result.url)) return null;

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        onSelectLogo(result.url, 'brand');
                                                        onClose();
                                                    }}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                                                >
                                                    <div className="w-12 h-12 rounded-full bg-background-subtle flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={result.url}
                                                            alt={result.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium text-foreground">{result.name}</p>
                                                        <p className="text-xs text-foreground-muted">{result.source}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* All Logos - Show all when no search, filtered when searching */}
                            <div>
                                <h4 className="flex items-center gap-2 text-sm font-medium text-foreground-muted mb-3">
                                    📦 {searchQuery ? t('brokers.logoPicker.localResults') : 'Tutti i loghi'}
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {(searchQuery ? localResults : logoRegistry).map((preset) => (
                                        <button
                                            key={preset.name}
                                            onClick={() => {
                                                onSelectLogo(`asset://${encodeURIComponent(preset.icon)}`, 'brand', preset);
                                                onClose();
                                            }}
                                            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-background-subtle flex items-center justify-center overflow-hidden">
                                                <img
                                                    src={`asset://${encodeURIComponent(preset.icon)}`}
                                                    alt={preset.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="text-xs text-center text-foreground-muted line-clamp-2">
                                                {preset.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Icon Tab */}
                    {activeTab === 'icon' && (
                        <div className="space-y-6">
                            {/* Finance Icons */}
                            <div>
                                <h4 className="text-sm font-medium text-foreground-muted mb-3">Finance</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {FINANCE_ICONS.map(({ name, Icon }) => (
                                        <button
                                            key={name}
                                            onClick={() => handleIconSelect(name)}
                                            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                        >
                                            <Icon size={32} className="text-foreground-muted group-hover:text-primary transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Building Icons */}
                            <div>
                                <h4 className="text-sm font-medium text-foreground-muted mb-3">Building</h4>
                                <div className="grid grid-cols-5 gap-3">
                                    {BUILDING_ICONS.map(({ name, Icon }) => (
                                        <button
                                            key={name}
                                            onClick={() => handleIconSelect(name)}
                                            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all group"
                                        >
                                            <Icon size={32} className="text-foreground-muted group-hover:text-primary transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Emoji Tab */}
                    {activeTab === 'emoji' && (
                        <div className="flex justify-center">
                            <EmojiPicker
                                onEmojiClick={handleEmojiSelect}
                                width="100%"
                                height={400}
                            />
                        </div>
                    )}

                    {/* Upload Tab */}
                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <button
                                onClick={handleFileUpload}
                                className="flex flex-col items-center gap-4 p-8 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
                            >
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-foreground">{t('brokers.uploadLogo')}</p>
                                    <p className="text-sm text-foreground-muted mt-1">PNG, JPG, SVG</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
