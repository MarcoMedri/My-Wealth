// App entry point
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// HMR trigger: 2026-01-02 14:48:51
import {
    Wallet,
    FolderOpen,
    Plus
} from 'lucide-react';
import type { VaultStatus } from '../../shared/types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AccountsDashboard from './components/AccountsDashboard';
import { InvestmentDashboard } from './components/investments/InvestmentDashboard';
import { PropertiesDashboard } from './components/properties/PropertiesDashboard';
import { CollectiblesDashboard } from './components/collectibles/CollectiblesDashboard';
import { InsuranceDashboard } from './components/insurance/InsuranceDashboard';
import { DepositDashboard } from './components/deposits/DepositDashboard';
import { BrokerDetailView } from './components/brokers/BrokerDetailView';
import { cn } from './lib/utils';
import { useSettingsStore } from './store/useSettingsStore';
import { useVaultStore } from './store/useVaultStore';
import { useExchangeRates } from './store/useExchangeRates';

function App(): React.ReactElement {
    const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitializing, setIsInitializing] = useState(false);

    // Store
    const refreshData = useVaultStore(state => state.refreshData);
    const activeView = useVaultStore(state => state.activeView);
    const theme = useSettingsStore(state => state.theme);

    // Theme Effect
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const applySystemTheme = () => {
                root.classList.remove('light', 'dark');
                root.classList.add(mediaQuery.matches ? 'dark' : 'light');
            };

            applySystemTheme();
            mediaQuery.addEventListener('change', applySystemTheme);
            return () => mediaQuery.removeEventListener('change', applySystemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [theme]);

    // Exchange Rates Effect
    const fetchRates = useExchangeRates(state => state.fetchRates);
    const currency = useSettingsStore(state => state.currency);

    useEffect(() => {
        fetchRates();
    }, [fetchRates, currency]);

    // Language Effect
    const { i18n } = useTranslation();
    const language = useSettingsStore(state => state.language);

    useEffect(() => {
        i18n.changeLanguage(language);
    }, [language, i18n]);

    useEffect(() => {
        const checkVaultStatus = async () => {
            try {
                const status = await window.api.getVaultStatus();
                setVaultStatus(status);
                if (status.isInitialized) {
                    await refreshData();
                }
            } catch (error) {
                console.error('Failed to get vault status:', error);
            } finally {
                setIsLoading(false);
            }
        };
        checkVaultStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshData is stable
    }, []);

    const handleSelectVault = async () => {
        const path = await window.api.selectVaultLocation();
        if (path) {
            setIsInitializing(true);
            try {
                const status = await window.api.initializeVault(path);
                setVaultStatus(status);
                if (status.isInitialized) {
                    await refreshData();
                }
            } catch (error) {
                console.error('Failed to initialize vault:', error);
            } finally {
                setIsInitializing(false);
            }
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <Wallet className="mx-auto h-16 w-16 animate-pulse text-emerald-500" />
                    <p className="mt-4 text-lg text-foreground-muted">Loading...</p>
                </div>
            </div>
        );
    }

    // Onboarding: No vault configured
    if (!vaultStatus?.isInitialized) {
        return (
            <div className="flex h-screen flex-col bg-background">
                <div className="h-8 w-full app-drag-region" />

                <main className="flex flex-1 items-center justify-center p-8">
                    <div className="max-w-md text-center">
                        <div className="mb-8 flex justify-center">
                            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-2xl shadow-emerald-500/20">
                                <Wallet className="h-16 w-16 text-white" />
                            </div>
                        </div>

                        <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
                            Welcome to MyWealth
                        </h1>

                        <p className="mb-8 text-foreground-muted">
                            Your local-first personal finance companion.
                            All your data stays on your device.
                        </p>

                        <div className="space-y-4">
                            <button
                                onClick={handleSelectVault}
                                disabled={isInitializing}
                                className={cn(
                                    "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
                                    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold",
                                    "hover:from-emerald-600 hover:to-teal-600 transition-all",
                                    "shadow-lg shadow-emerald-500/25",
                                    isInitializing && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create New Vault</span>
                            </button>

                            <button
                                onClick={handleSelectVault}
                                disabled={isInitializing}
                                className={cn(
                                    "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
                                    "bg-background-muted text-foreground-muted font-medium border border-border",
                                    "hover:bg-background-subtle transition-colors",
                                    isInitializing && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <FolderOpen className="w-5 h-5" />
                                <span>Open Existing Vault</span>
                            </button>
                        </div>

                        <p className="mt-8 text-xs text-foreground-subtle">
                            Your vault is a folder containing JSON files.
                            Store it anywhere — local drive, Dropbox, iCloud, etc.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    // Main app with vault loaded
    return (
        <Layout>
            {activeView === 'dashboard' && <Dashboard />}
            {activeView === 'accounts' && <AccountsDashboard />}
            {activeView === 'investments' && <InvestmentDashboard />}
            {activeView === 'properties' && <PropertiesDashboard />}
            {activeView === 'collectibles' && <CollectiblesDashboard />}
            {activeView === 'insurance' && <InsuranceDashboard />}
            {activeView === 'deposits' && <DepositDashboard />}
            {activeView.startsWith('broker:') && <BrokerDetailView brokerId={activeView.split(':')[1]} />}
        </Layout>
    );
}

export default App;
