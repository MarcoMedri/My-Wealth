/**
 * Sidebar Component
 * Shows accounts list and navigation
 */

import { useState } from 'react';
import {
    Wallet,
    TrendingUp,
    Building,
    LayoutDashboard,
    Plus,
    Home,
    Settings,
    Database,
    Trash2,
    Loader2,
    Building2,
    CandlestickChart,
    Bitcoin,
    Landmark,
    Banknote,
    PiggyBank,
    Briefcase,
    Watch
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { formatMoney } from '../../../shared/schemas';
import { cn } from '../lib/utils';
import { useNetWorth } from '../hooks/useNetWorth';
// import AddAccountModal from './AddAccountModal'; // Removed in favor of Brokers
import { AddBrokerModal } from './brokers/AddBrokerModal';
import { useTranslation } from 'react-i18next';

import { SettingsModal } from './settings/SettingsModal';
import { ExchangeRateIndicator } from './ExchangeRateIndicator';

// Account icons mapping removed as we now show Brokers in sidebar
// import { SettingsModal } from './settings/SettingsModal'; 
// Icon mapping for Broker/Account icons
const ICON_MAP: Record<string, any> = {
    'wallet': Wallet,
    'building-2': Building2,
    'candlestick-chart': CandlestickChart,
    'bitcoin': Bitcoin,
    'landmark': Landmark, // Bank
    'banknote': Banknote, // Cash
    'piggy-bank': PiggyBank, // Savings
    'briefcase': Briefcase, // Portfolio
    // Add more as necessary matches lucide-react names
};

export default function Sidebar() {
    const { t } = useTranslation();
    const brokers = useVaultStore(state => state.brokers);
    const refreshData = useVaultStore(state => state.refreshData);
    const activeView = useVaultStore(state => state.activeView);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const { netWorth, baseCurrency } = useNetWorth();

    const [showDevMenu, setShowDevMenu] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Group active brokers
    // Sort brokers by custom sortOrder or name
    const sortedBrokers = [...brokers].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));


    const handleGenerateDemoData = async () => {
        setIsSeeding(true);
        try {
            const result = await window.api.generateDemoData();
            console.log('Generated demo data:', result);
            await refreshData();
        } catch (error) {
            console.error('Failed to generate demo data:', error);
        } finally {
            setIsSeeding(false);
            setShowDevMenu(false);
        }
    };

    const handleClearData = async () => {
        if (!confirm('Are you sure you want to clear ALL data?')) return;

        setIsClearing(true);
        try {
            await window.api.clearVaultData();
            await refreshData();
        } catch (error) {
            console.error('Failed to clear data:', error);
        } finally {
            setIsClearing(false);
            setShowDevMenu(false);
        }
    };

    return (
        <aside className="w-64 bg-background-subtle border-r border-border flex flex-col">
            {/* Drag region for macOS */}
            <div className="h-8 app-drag-region" />

            <AddBrokerModal
                isOpen={isAddBrokerOpen}
                onClose={() => setIsAddBrokerOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Logo */}
            <div className="px-4 pb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                        <Wallet className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="font-semibold text-foreground">MyWealth</span>
                </div>
            </div>

            {/* Net Worth */}
            <div className="px-4 py-3 mx-3 mb-4 rounded-xl bg-background-muted border border-border">
                <p className="text-xs text-foreground-muted uppercase tracking-wide">{t('dashboard.netWorth')}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                    {formatMoney(netWorth, baseCurrency)}
                </p>
                <div className="mt-2">
                    <ExchangeRateIndicator showLabel={false} />
                </div>
            </div>

            {/* Navigation */}
            <nav className="px-3 mb-4 space-y-1">
                <button
                    onClick={() => setActiveView('dashboard')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        activeView === 'dashboard'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                >
                    <Home className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.dashboard')}</span>
                </button>

                <button
                    onClick={() => setActiveView('accounts')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        activeView === 'accounts'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.accounts')}</span>
                </button>

                <button
                    onClick={() => setActiveView('investments')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        activeView === 'investments'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.investments')}</span>
                </button>

                <button
                    onClick={() => setActiveView('properties')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        activeView === 'properties'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                >
                    <Building className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.properties')}</span>
                </button>

                <button
                    onClick={() => setActiveView('collectibles')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        activeView === 'collectibles'
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "text-foreground-muted hover:bg-background-muted hover:text-foreground border-transparent"
                    )}
                >
                    <Watch className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('nav.collectibles')}</span>
                </button>
            </nav>

            {/* Brokers List */}
            <div className="flex-1 overflow-y-auto px-3">
                <div className="flex items-center justify-between px-3 py-2">
                    <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                        {t('nav.brokers')}
                    </h3>
                    <button
                        onClick={() => setIsAddBrokerOpen(true)}
                        className="p-1 rounded hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-1">
                    {sortedBrokers.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-foreground-subtle">{t('brokers.noAccounts')}</p>
                        /* Reusing noAccounts string or add a new one "No Brokers" */
                    ) : (
                        sortedBrokers.map((broker) => {
                            // const balance = getBrokerBalance(broker.id);
                            // Determine currency from first account or default to system base? 
                            // For sidebar summary we might just show base currency or mixed.
                            // Let's assume EUR or USD for now, or just not show balance if complex.
                            // OR: Broker usually belongs to a country/currency.
                            // For now, let's just show the name.

                            const isActive = activeView === `broker:${broker.id}`;

                            return (
                                <button
                                    key={broker.id}
                                    onClick={() => setActiveView(`broker:${broker.id}`)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
                                        isActive
                                            ? "bg-background-muted text-foreground font-medium"
                                            : "hover:bg-background-muted text-foreground-muted hover:text-foreground"
                                    )}
                                >
                                    <div
                                        className="p-1.5 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${broker.color}20` }}
                                    >
                                        {(() => {
                                            const IconComponent = broker.icon ? ICON_MAP[broker.icon] : Building2;
                                            return IconComponent ? (
                                                <IconComponent
                                                    className="w-4 h-4"
                                                    style={{ color: broker.color }}
                                                />
                                            ) : (
                                                <Building2
                                                    className="w-4 h-4"
                                                    style={{ color: broker.color }}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm truncate">
                                            {broker.name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer with Settings & Dev */}
            <div className="p-3 border-t border-border space-y-2">

                {/* Settings Toggle */}
                <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">{t('nav.settings')}</span>
                </button>

                {/* Dev Menu Toggle */}
                <button
                    onClick={() => setShowDevMenu(!showDevMenu)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors",
                        showDevMenu && "bg-background-muted text-foreground"
                    )}
                >
                    <Database className="w-4 h-4" />
                    <span className="text-sm">{t('nav.developer')}</span>
                </button>

                {/* Dev Menu */}
                {showDevMenu && (
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
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Database className="w-4 h-4" />
                            )}
                            <span>Generate Demo Data</span>
                        </button>

                        <button
                            onClick={handleClearData}
                            disabled={isClearing}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left",
                                "bg-red-500/10 text-red-400 hover:bg-red-500/20",
                                "transition-colors text-sm",
                                isClearing && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isClearing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            <span>Clear All Data</span>
                        </button>
                    </div>
                )}

                <p className="text-xs text-foreground-subtle text-center pt-2">
                    MyWealth Desktop v0.1.0
                </p>
            </div>
        </aside>
    );
}
