/**
 * Sidebar Component
 * Shows main navigation and app status
 */

import { useState, useEffect } from 'react';
import {
    Wallet,
    TrendingUp,
    Building,
    LayoutDashboard,
    Home,
    Settings,
    Shield,
    PanelLeftClose,
    Watch,
    PiggyBank,
    HelpCircle,
    PieChart
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../hooks/useTutorial';
import { SettingsModal } from './settings/SettingsModal';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';
import { useFormatMoney } from '../hooks/useFormatMoney'; // Assuming this hook exists

export default function Sidebar() {
    const { t } = useTranslation();
    const activeView = useVaultStore(state => state.activeView);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const { netWorth, baseCurrency } = useNetWorth();
    const formatMoney = useFormatMoney();
    const { startTutorial } = useTutorial();
    const workspace = useVaultStore(state => state.workspace);
    const setSidebarCollapsed = useVaultStore(state => state.setSidebarCollapsed);
    const width = workspace.layout?.leftSidebarWidth ?? 256;
    const isCollapsed = workspace.layout?.leftSidebarCollapsed ?? false;

    // Local state for smooth resizing
    const [localWidth, setLocalWidth] = useState(width);
    const [isResizing, setIsResizing] = useState(false);

    // Sync local width when store width changes (unless resizing)
    useEffect(() => {
        if (!isResizing) {
            setLocalWidth(width);
        }
    }, [width, isResizing]);

    // Handle Resize
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(200, Math.min(600, e.clientX));
            setLocalWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            useVaultStore.getState().setWorkspaceSettings({
                layout: {
                    leftSidebarCollapsed: workspace.layout?.leftSidebarCollapsed ?? false,
                    rightSidebarCollapsed: workspace.layout?.rightSidebarCollapsed ?? false,
                    ...workspace.layout,
                    leftSidebarWidth: localWidth
                }
            });
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
        // Add workspace.layout to dependency array if you want to react to other layout changes, 
        // but for resizing logic 'isResizing' and 'localWidth' are primary.
        // However, the lint warning suggested 'workspace.layout'. 
        // We use 'workspace.layout' in setWorkspaceSettings closure.
    }, [isResizing, localWidth, workspace.layout]);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <aside
            className="group/sidebar relative bg-background-subtle border-r border-border flex flex-col transition-all duration-75 ease-out"
            style={{ width: isCollapsed ? 64 : localWidth }}
            data-tour="sidebar"
        >
            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50 group-hover/sidebar:bg-border"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                />
            )}
            {/* Drag region for macOS */}
            <div className="h-12 w-full app-drag-region" />

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

                <button
                    onClick={() => setActiveView('portfolio-xray')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        isCollapsed ? "justify-center px-2" : "",
                        activeView === 'portfolio-xray'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                    title={isCollapsed ? t('nav.portfolioXRay') : undefined}
                >
                    <PieChart className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span className="text-sm font-medium">{t('nav.portfolioXRay')}</span>}
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



                {/* Collapse Toggle */}
                <button
                    onClick={() => setSidebarCollapsed('left', !isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors mt-2"
                    title={isCollapsed ? t('nav.expand') : t('nav.collapse')}
                >
                    <PanelLeftClose className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
                </button>

                {/* Version */}
                {!isCollapsed && (
                    <p className="text-xs text-foreground-subtle text-center pt-2">
                        MyWealth Desktop v1.3.0
                    </p>
                )}
            </div>

        </aside>
    );
}
