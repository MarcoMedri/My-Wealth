import React, { useState } from 'react';
import {
    X, Globe, Moon, Sun, DollarSign, Monitor, Database, Camera, RefreshCw, HelpCircle, Download, Percent,
    LayoutGrid, LayoutList, Logs, Settings, Palette, Tags, Keyboard, Shield, HardDrive, Terminal, Trash2, Loader2, Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useVaultStore } from '../../store/useVaultStore';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, type Theme, type DateFormat, type TimeFormat } from '../../../../shared/types';
import { cn } from '../../lib/utils';
import { CategoryManager } from './CategoryManager';
import { BackupPanel } from './BackupPanel';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { ExportModal } from './ExportModal';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SettingsTab = 'general' | 'appearance' | 'taxation' | 'data' | 'investments' | 'categories' | 'shortcuts' | 'developer';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    const {
        currency, language, theme, decimals, dateFormat, timeFormat,
        setCurrency, setLanguage, setTheme, setDecimals, setDateFormat, setTimeFormat
    } = useSettingsStore();

    const { workspace, setWorkspaceSettings, vaultPath, refreshData } = useVaultStore();

    const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
    const [isExportOpen, setIsExportOpen] = React.useState(false);
    const [isClearDataOpen, setIsClearDataOpen] = React.useState(false);
    const [isSeeding, setIsSeeding] = useState(false);

    const handleGenerateDemoData = async () => {
        setIsSeeding(true);
        try {
            await window.api.generateDemoData();
            await refreshData();
            // toast.success(t('dev.demoDataGenerated')); // If we had toast here
        } catch (error) {
            console.error('Failed to generate demo data:', error);
        } finally {
            setIsSeeding(false);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'general', label: t('settings.general'), icon: Settings },
        { id: 'appearance', label: t('settings.appearance'), icon: Palette },
        { id: 'taxation', label: t('settings.taxation'), icon: Percent },
        { id: 'data', label: t('settings.dataBackup', 'Data & Backup'), icon: HardDrive },
        { id: 'investments', label: t('nav.investments'), icon: Activity },
        { id: 'categories', label: t('settings.categories'), icon: Tags },
        { id: 'shortcuts', label: t('settings.shortcuts', 'Shortcuts'), icon: Keyboard },
        { id: 'developer', label: t('nav.developer', 'Developer'), icon: Terminal },
    ] as const;


    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-background-card rounded-2xl w-full max-w-4xl shadow-2xl border border-border flex flex-col h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-sm">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 border-r border-border bg-background-subtle/50 overflow-y-auto p-4 space-y-2 hidden md:block">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                        activeTab === tab.id
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", activeTab === tab.id ? "text-primary" : "text-foreground-muted")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto p-6 scroll-smooth">

                        {/* GENERAL */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.general')}</h3>

                                    {/* Language & Formats */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <Globe className="w-4 h-4" />
                                                    {t('settings.language')}
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                                        <button
                                                            key={lang.code}
                                                            onClick={() => setLanguage(lang.code)}
                                                            className={cn(
                                                                "px-3 py-2 rounded-lg border text-sm transition-all text-center font-medium",
                                                                language === lang.code
                                                                    ? "bg-primary/10 border-primary text-primary"
                                                                    : "border-border hover:bg-background-muted text-foreground"
                                                            )}
                                                        >
                                                            {lang.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <DollarSign className="w-4 h-4" />
                                                    {t('settings.baseCurrency')}
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {SUPPORTED_CURRENCIES.map((curr) => (
                                                        <button
                                                            key={curr.code}
                                                            onClick={() => setCurrency(curr.code)}
                                                            className={cn(
                                                                "flex flex-col items-center justify-center px-2 py-2 rounded-lg border text-sm transition-all",
                                                                currency === curr.code
                                                                    ? "bg-primary/10 border-primary text-primary"
                                                                    : "border-border hover:bg-background-muted text-foreground"
                                                            )}
                                                        >
                                                            <span className="font-bold">{curr.code}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">
                                                    {t('settings.dateFormat')}
                                                </label>
                                                <select
                                                    value={dateFormat}
                                                    onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2023)</option>
                                                    <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2023)</option>
                                                    <option value="yyyy-MM-dd">YYYY-MM-DD (2023-12-31)</option>
                                                    <option value="dd.MM.yyyy">DD.MM.YYYY (31.12.2023)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground">
                                                    {t('settings.timeFormat')}
                                                </label>
                                                <select
                                                    value={timeFormat}
                                                    onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="HH:mm">24-hour (14:30)</option>
                                                    <option value="hh:mm a">12-hour (02:30 PM)</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    <span className="font-mono text-xs border border-foreground-muted rounded px-1">.00</span>
                                                    {t('settings.decimals')}
                                                </label>
                                                <div className="flex gap-2">
                                                    {[0, 1, 2, 3].map((d) => (
                                                        <button
                                                            key={d}
                                                            onClick={() => setDecimals(d)}
                                                            className={cn(
                                                                "flex-1 px-3 py-2 rounded-lg border text-sm transition-all text-center font-medium",
                                                                decimals === d
                                                                    ? "bg-primary/10 border-primary text-primary"
                                                                    : "border-border hover:bg-background-muted text-foreground"
                                                            )}
                                                        >
                                                            {d}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-border my-8" />

                                    {/* Vault Location */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <Database className="w-4 h-4" />
                                            {t('settings.vaultLocation', 'Vault Location')}
                                        </label>
                                        <div className="bg-background-subtle p-4 rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs text-foreground-muted uppercase font-bold tracking-wider mb-1">Current Path</div>
                                                <div className="text-sm font-mono text-foreground break-all">
                                                    {vaultPath || t('settings.noVaultSelected', 'No vault selected')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsResetConfirmOpen(true)}
                                                className="shrink-0 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-lg text-sm font-medium transition-colors"
                                            >
                                                {t('settings.switchVault', 'Switch Vault')}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* APPEARANCE */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.appearance')}</h3>

                                {/* Theme */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                        {t('settings.theme', 'Tema')}
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {(['light', 'dark', 'system'] as Theme[]).map((tVal) => (
                                            <button
                                                key={tVal}
                                                onClick={() => setTheme(tVal)}
                                                className={cn(
                                                    "flex flex-col items-center gap-3 px-4 py-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
                                                    theme === tVal
                                                        ? "bg-primary/5 border-primary text-primary"
                                                        : "border-border hover:bg-background-muted text-foreground-muted"
                                                )}
                                            >
                                                {tVal === 'light' && <Sun className="w-6 h-6" />}
                                                {tVal === 'dark' && <Moon className="w-6 h-6" />}
                                                {tVal === 'system' && <Monitor className="w-6 h-6" />}
                                                <span className="font-medium capitalize">{t(`settings.themes.${tVal}`)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* UI Density */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4" />
                                        {t('settings.density', 'Densità Interfaccia')}
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(['compact', 'normal', 'expanded'] as const).map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => setWorkspaceSettings({ uiDensity: d })}
                                                className={cn(
                                                    "flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left group",
                                                    (workspace.uiDensity || 'normal') === d
                                                        ? "bg-primary/5 border-primary text-primary"
                                                        : "border-border hover:bg-background-muted text-foreground"
                                                )}
                                            >
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    (workspace.uiDensity || 'normal') === d ? "bg-primary/20" : "bg-background-subtle group-hover:bg-background"
                                                )}>
                                                    {d === 'compact' && <LayoutList className="w-5 h-5" />}
                                                    {d === 'normal' && <LayoutGrid className="w-5 h-5" />}
                                                    {d === 'expanded' && <Logs className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <span className="block font-medium capitalize text-base">{t(`settings.densities.${d}`, d)}</span>
                                                    <span className="text-xs opacity-70">
                                                        {d === 'compact' && "More data on screen, less scrolling."}
                                                        {d === 'normal' && "Balanced spacing for general use."}
                                                        {d === 'expanded' && "Comfortable navigation, touch friendly."}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAXATION */}
                        {activeTab === 'taxation' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.taxation')}</h3>

                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex gap-4">
                                    <Shield className="w-6 h-6 text-primary shrink-0" />
                                    <div>
                                        <h4 className="font-medium text-primary mb-1">Tax Configuration</h4>
                                        <p className="text-sm text-foreground-muted">Set default tax rates for different asset classes. These defaults are applied when adding new assets but can be overridden individually.</p>
                                    </div>
                                </div>

                                <div className="bg-background-card p-4 rounded-xl border border-border flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-foreground">{t('settings.defaultViewMode')}</h4>
                                        <p className="text-xs text-foreground-muted mt-1">{t('settings.defaultViewModeDesc')}</p>
                                    </div>
                                    <div className="flex bg-background-subtle p-1 rounded-lg">
                                        <button
                                            onClick={() => setWorkspaceSettings({ defaultViewMode: 'gross' })}
                                            className={cn(
                                                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                                (workspace.defaultViewMode || 'gross') === 'gross'
                                                    ? "bg-background shadow-sm text-foreground"
                                                    : "text-foreground-muted hover:text-foreground"
                                            )}
                                        >
                                            {t('settings.gross')}
                                        </button>
                                        <button
                                            onClick={() => setWorkspaceSettings({ defaultViewMode: 'net' })}
                                            className={cn(
                                                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                                workspace.defaultViewMode === 'net'
                                                    ? "bg-background shadow-sm text-foreground"
                                                    : "text-foreground-muted hover:text-foreground"
                                            )}
                                        >
                                            {t('settings.net')}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">Asset Tax Rates</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {['stock', 'etf', 'crypto', 'bond', 'fund', 'residence', 'rental', 'collectible'].map(type => (
                                            <div key={type} className="space-y-2">
                                                <label className="text-sm font-medium text-foreground capitalize flex items-center justify-between">
                                                    <span>
                                                        {['residence', 'rental'].includes(type)
                                                            ? t(`modals.propertyModal.types.${type}`)
                                                            : type === 'collectible'
                                                                ? t('nav.collectibles')
                                                                : t(`modals.investmentModal.types.${type}`)
                                                        }
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={workspace.taxDefaults?.[type] ?? (type === 'crypto' || type === 'etf' || type === 'stock' ? 26 : 0)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val) && val >= 0 && val <= 100) {
                                                                setWorkspaceSettings({
                                                                    taxDefaults: {
                                                                        ...workspace.taxDefaults,
                                                                        [type]: val
                                                                    }
                                                                });
                                                            }
                                                        }}
                                                        className="w-full pl-3 pr-8 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                    <div className="absolute right-3 top-2 text-foreground-muted text-sm">%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DATA & BACKUP */}
                        {activeTab === 'data' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.dataBackup', 'Data & Backup')}</h3>

                                {/* Export */}
                                <div className="bg-background-subtle p-6 rounded-2xl border border-border">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                <Download className="w-5 h-5 text-emerald-500" />
                                                {t('settings.exportData', 'Export Data')}
                                            </h4>
                                            <p className="text-sm text-foreground-muted mt-2 max-w-md">
                                                Download a complete JSON backup of your vault. This file contains all your data and configurations.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsExportOpen(true)}
                                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                        >
                                            {t('settings.exportBackup', 'Export Backup')}
                                        </button>
                                    </div>
                                </div>

                                {/* Automation */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">{t('settings.automation')}</h4>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                            <Camera className="w-4 h-4" />
                                            {t('settings.snapshotBehavior')}
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setWorkspaceSettings({ autoRefreshOnSnapshot: true })}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-sm transition-all",
                                                    workspace.autoRefreshOnSnapshot === true
                                                        ? "bg-primary/10 border-primary text-primary"
                                                        : "border-border hover:bg-background-muted text-foreground"
                                                )}
                                            >
                                                <RefreshCw className="w-5 h-5" />
                                                <span className="text-center text-xs sm:text-sm">{t('settings.snapshotAutoUpdate')}</span>
                                            </button>
                                            <button
                                                onClick={() => setWorkspaceSettings({ autoRefreshOnSnapshot: false })}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-sm transition-all",
                                                    workspace.autoRefreshOnSnapshot === false
                                                        ? "bg-primary/10 border-primary text-primary"
                                                        : "border-border hover:bg-background-muted text-foreground"
                                                )}
                                            >
                                                <Camera className="w-5 h-5" />
                                                <span className="text-center text-xs sm:text-sm">{t('settings.snapshotNoUpdate')}</span>
                                            </button>
                                            <button
                                                onClick={() => setWorkspaceSettings({ autoRefreshOnSnapshot: null })}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-sm transition-all",
                                                    (workspace.autoRefreshOnSnapshot === null || workspace.autoRefreshOnSnapshot === undefined)
                                                        ? "bg-primary/10 border-primary text-primary"
                                                        : "border-border hover:bg-background-muted text-foreground"
                                                )}
                                            >
                                                <HelpCircle className="w-5 h-5" />
                                                <span className="text-center text-xs sm:text-sm">{t('settings.snapshotAsk')}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-border" />

                                {/* Backup Panel */}
                                <BackupPanel />
                            </div>
                        )}

                        {/* CATEGORIES */}
                        {activeTab === 'categories' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-1">{t('settings.categories')}</h3>
                                    <p className="text-sm text-foreground-muted mb-4">Manage custom labels for your properties and assets.</p>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <CategoryManager />
                                </div>
                            </div>
                        )}

                        {/* INVESTMENTS */}
                        {activeTab === 'investments' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('nav.investments')}</h3>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider">{t('settings.maintenance')}</h4>

                                    <div className="bg-background-subtle p-6 rounded-2xl border border-border">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h4 className="font-semibold text-foreground flex items-center gap-2">
                                                    <Database className="w-5 h-5 text-indigo-500" />
                                                    {t('settings.refreshMetadata')}
                                                </h4>
                                                <p className="text-sm text-foreground-muted mt-2 max-w-md">
                                                    {t('settings.refreshMetadataDesc')}
                                                </p>
                                            </div>
                                            <MetadataRefreshButton />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SHORTCUTS */}
                        {activeTab === 'shortcuts' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings.keyboardShortcuts', 'Keyboard Shortcuts')}</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-background-subtle rounded-xl p-4 border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-lg shadow-sm">
                                                <Settings className="w-5 h-5 text-foreground" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground">{t('shortcuts.search', 'Command Palette')}</span>
                                        </div>
                                        <kbd className="px-3 py-1.5 bg-background rounded-lg text-xs font-bold text-foreground font-mono shadow-sm border border-border">⌘K</kbd>
                                    </div>

                                    <div className="bg-background-subtle rounded-xl p-4 border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-lg shadow-sm">
                                                <Settings className="w-5 h-5 text-foreground" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground">{t('shortcuts.settings', 'Open Settings')}</span>
                                        </div>
                                        <kbd className="px-3 py-1.5 bg-background rounded-lg text-xs font-bold text-foreground font-mono shadow-sm border border-border">⌘,</kbd>
                                    </div>

                                    <div className="bg-background-subtle rounded-xl p-4 border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-lg shadow-sm">
                                                <Settings className="w-5 h-5 text-foreground" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground">{t('shortcuts.navigate', 'Navigate')}</span>
                                        </div>
                                        <kbd className="px-3 py-1.5 bg-background rounded-lg text-xs font-bold text-foreground font-mono shadow-sm border border-border">↑↓↵</kbd>
                                    </div>

                                    <div className="bg-background-subtle rounded-xl p-4 border border-border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-background rounded-lg shadow-sm">
                                                <X className="w-5 h-5 text-foreground" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground">{t('shortcuts.close', 'Close')}</span>
                                        </div>
                                        <kbd className="px-3 py-1.5 bg-background rounded-lg text-xs font-bold text-foreground font-mono shadow-sm border border-border">Esc</kbd>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* DEVELOPER */}
                        {activeTab === 'developer' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-lg font-semibold text-foreground mb-4">{t('nav.developer', 'Developer Tools')}</h3>

                                <div className="space-y-4">
                                    <div className="bg-amber-500/10 border-amber-500/20 p-4 rounded-xl border flex gap-4">
                                        <Shield className="w-6 h-6 text-amber-500 shrink-0" />
                                        <div>
                                            <h4 className="font-medium text-amber-500 mb-1">{t('common.warning', 'Warning')}</h4>
                                            <p className="text-sm text-foreground-muted">These tools are intended for development and testing purposes. Use with caution.</p>
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-semibold text-foreground-muted uppercase tracking-wider mt-6">Data Management</h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleGenerateDemoData}
                                            disabled={isSeeding}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border border-border bg-background-subtle hover:bg-background hover:border-emerald-500/50 hover:shadow-sm transition-all text-left",
                                                isSeeding && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                                {isSeeding ? <Loader2 className="w-6 h-6 animate-spin" /> : <Database className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{t('nav.generateDemoData')}</div>
                                                <div className="text-xs text-foreground-muted mt-0.5">Populate vault with sample data</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setIsClearDataOpen(true)}
                                            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background-subtle hover:bg-red-500/5 hover:border-red-500/30 hover:shadow-sm transition-all text-left group"
                                        >
                                            <div className="p-3 bg-red-500/10 text-red-500 rounded-lg group-hover:bg-red-500/20 transition-colors">
                                                <Trash2 className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-red-500">{t('nav.clearAllData')}</div>
                                                <div className="text-xs text-foreground-muted mt-0.5">Wipe all data from current vault</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            </div >

            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={async () => {
                    await window.api.resetVaultPath();
                    window.location.reload();
                }}
                title={t('settings.switchVault')}
                description={t('settings.confirmReset', 'Are you sure? This will restart the app onboarding.')}
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
                variant="danger"
            />

            <ConfirmationModal
                isOpen={isClearDataOpen}
                onClose={() => setIsClearDataOpen(false)}
                onConfirm={async () => {
                    await window.api.clearVaultData();
                    // toast.success(t('common.dataCleared'));
                    setIsClearDataOpen(false);
                    setTimeout(() => window.location.reload(), 1000);
                }}
                title={t('nav.clearAllData')}
                description={t('common.confirmClear', 'Are you sure you want to clear ALL data? This action cannot be undone.')}
                confirmText={t('common.delete')}
                variant="danger"
            />

            <ExportModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
            />
        </div >
    );
}

function MetadataRefreshButton() {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ updated: number; failed: number } | null>(null);

    const handleRefresh = async () => {
        setIsLoading(true);
        setResult(null);
        try {
            const res = await window.api.refreshAssetMetadata();
            setResult(res);
            setTimeout(() => setResult(null), 5000); // Hide result after 5s
        } catch (error) {
            console.error('Metadata refresh failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                {isLoading ? t('common.loading') : t('settings.refreshMetadataAction')}
            </button>
            {result && (
                <span className="text-xs text-emerald-500 font-medium animate-in fade-in">
                    {t('settings.refreshMetadataResult', { updated: result.updated, failed: result.failed })}
                </span>
            )}
        </div>
    );
}
