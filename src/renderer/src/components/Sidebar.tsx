/**
 * Sidebar Component
 * Shows main navigation and app status
 */

import { useState } from 'react';
import {
    Wallet,
    TrendingUp,
    Building,
    LayoutDashboard,
    Home,
    Settings,
    Database,
    Trash2,
    Loader2,
    Shield,
    PiggyBank,
    Watch,
    PanelLeftClose,
    HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useVaultStore } from '../store/useVaultStore';
import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../hooks/useTutorial';
import { SettingsModal } from './settings/SettingsModal';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { useFormatMoney } from '../hooks/useFormatMoney'; // Assuming this hook exists

export default function Sidebar() {
    const { t } = useTranslation();
    const activeView = useVaultStore(state => state.activeView);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const { netWorth, baseCurrency } = useNetWorth();
    const formatMoney = useFormatMoney();
    const { startTutorial } = useTutorial();
    const refreshData = useVaultStore(state => state.refreshData);
    const workspace = useVaultStore(state => state.workspace);
    const setSidebarCollapsed = useVaultStore(state => state.setSidebarCollapsed);

    // Default to false if undefined
    const isCollapsed = workspace.layout?.leftSidebarCollapsed ?? false;

    const [showDevMenu, setShowDevMenu] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isClearDataOpen, setIsClearDataOpen] = useState(false);

    const handleGenerateDemoData = async () => {
        setIsSeeding(true);
        try {
            await window.api.generateDemoData();
            await refreshData();
        } catch (error) {
            console.error('Failed to generate demo data:', error);
        } finally {
            setIsSeeding(false);
            setShowDevMenu(false);
        }
    };

    return (
        <aside className={cn(
            "bg-background-subtle border-r border-border flex flex-col transition-all duration-300 ease-in-out",
            isCollapsed ? "w-16" : "w-64"
        )}
            data-tour="sidebar"
        >
            {/* Drag region for macOS */}
            <div className="h-12 app-drag-region" />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Logo */}
            <div className={cn("px-4 pb-4", isCollapsed ? "flex justify-center px-2" : "")}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
                        <Wallet className="w-5 h-5 text-foreground" />
                    </div>
                    {!isCollapsed && <span className="font-semibold text-foreground whitespace-nowrap">MyWealth</span>}
                </div>
            </div>

            {/* Net Worth */}
            {!isCollapsed ? (
                <div className="px-4 py-3 mx-3 mb-4 rounded-xl bg-background-muted border border-border">
                    <p className="text-xs text-foreground-muted uppercase tracking-wide">{t('dashboard.netWorth')}</p>
                    <p className="text-2xl font-bold text-foreground mt-1 truncate">
                        {formatMoney(netWorth, baseCurrency)}
                    </p>
                    <div className="mt-2">
                        <ExchangeRateIndicator showLabel={false} />
                    </div>
                </div>
            ) : (
                <div className="px-2 mb-4 flex flex-col items-center gap-1 group relative">
                    {/* Placeholder for collapsed state if needed */}
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
                <button
                    onClick={() => setActiveView('dashboard')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'dashboard'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.dashboard') : undefined}
                >
                    <Home className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.dashboard')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('accounts')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'accounts'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.accounts') : undefined}
                >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.accounts')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('investments')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'investments'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.investments') : undefined}
                >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.investments')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('properties')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'properties'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.properties') : undefined}
                >
                    <Building className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.properties')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('collectibles')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'collectibles'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.collectibles') : undefined}
                >
                    <Watch className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.collectibles')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('insurance')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'insurance'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('insurance.title') : undefined}
                >
                    <Shield className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('insurance.title')}</span>}
                </button>

                <button
                    onClick={() => setActiveView('deposits')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'deposits'
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('deposits.title') : undefined}
                >
                    <PiggyBank className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('deposits.title')}</span>}
                </button>
            </nav>

            {/* Help & Settings */}
            <div className="mt-auto border-t border-border pt-4">
                <button
                    onClick={() => startTutorial()}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-foreground-muted hover:bg-background-muted hover:text-foreground",
                        isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? t('help.showTutorial') : undefined}
                >
                    <HelpCircle className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('help.showTutorial')}</span>}
                </button>

                {/* Settings Toggle */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors"
                    title={isCollapsed ? t('nav.settings') : undefined}
                >
                    <Settings className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm">{t('nav.settings')}</span>}
                </button>

                {/* Dev Menu Toggle */}
                <button
                    onClick={() => setShowDevMenu(!showDevMenu)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors",
                        showDevMenu && "bg-background-muted text-foreground"
                    )}
                    title={isCollapsed ? t('nav.developer') : undefined}
                >
                    <Database className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm">{t('nav.developer')}</span>}
                </button>

                {/* Dev Menu */}
                {showDevMenu && !isCollapsed && (
                    <div className="space-y-1 px-2 pt-1 border-t border-border/50 mt-2">
                        <button
                            onClick={handleGenerateDemoData}
                            disabled={isSeeding}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left",
                                "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                                "transition-colors text-sm",
                                isSeeding && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSeeding ? (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            ) : (
                                <Database className="w-4 h-4 shrink-0" />
                            )}
                            <span className="truncate">{t('nav.generateDemoData')}</span>
                        </button>

                        <button
                            onClick={() => setIsClearDataOpen(true)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 text-sm font-medium transition-colors"
                        >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span className="truncate">{t('nav.clearAllData')}</span>
                        </button>
                    </div>
                )}

                {/* Version */}
                {!isCollapsed && (
                    <div className="mt-auto pt-4 border-t border-border text-center">
                        <p className="text-xs text-foreground-subtle">
                            v1.2.3
                        </p>
                    </div>
                )}

                {/* Collapse Toggle */}
                <button
                    onClick={() => setSidebarCollapsed('left', !isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors mt-2"
                    title={isCollapsed ? t('nav.expand') : t('nav.collapse')}
                >
                    <PanelLeftClose className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
                </button>

                {!isCollapsed && (
                    <p className="text-xs text-foreground-subtle text-center pt-2">
                        MyWealth Desktop v1.2.2
                    </p>
                )}
            </div>

            <ConfirmationModal
                isOpen={isClearDataOpen}
                onClose={() => setIsClearDataOpen(false)}
                onConfirm={async () => {
                    await window.api.clearVaultData();
                    toast.success(t('common.dataCleared', 'Data cleared successfully'));
                    setIsClearDataOpen(false);
                    setTimeout(() => window.location.reload(), 1000);
                }}
                title={t('nav.clearAllData')}
                description={t('common.confirmClear', 'Are you sure you want to clear ALL data? This action cannot be undone.')}
                confirmText={t('common.delete')}
                variant="danger"
            />
        </aside>
    );
}
