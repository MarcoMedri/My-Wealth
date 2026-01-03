import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Building2,
    Wallet,
    CandlestickChart,
    Bitcoin,
    Landmark,
    Banknote,
    PiggyBank,
    Briefcase,
    PanelRightClose
} from 'lucide-react';
import { useVaultStore } from '../store/useVaultStore';
import { cn } from '../lib/utils';
import { AddBrokerModal } from './brokers/AddBrokerModal';
import { BrokerPresetSelectorModal } from './brokers/BrokerPresetSelectorModal';
import { LogoMetadata } from '@shared/types';

// Icon mapping for Broker icons
const ICON_MAP: Record<string, React.ElementType> = {
    'wallet': Wallet,
    'building-2': Building2,
    'candlestick-chart': CandlestickChart,
    'bitcoin': Bitcoin,
    'landmark': Landmark, // Bank
    'banknote': Banknote, // Cash
    'piggy-bank': PiggyBank, // Savings
    'briefcase': Briefcase, // Portfolio
};

export default function BrokersSidebar() {
    const { t } = useTranslation();
    const brokers = useVaultStore(state => state.brokers);
    const activeView = useVaultStore(state => state.activeView);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const workspace = useVaultStore(state => state.workspace);
    const vaultPath = useVaultStore(state => state.vaultPath);
    const setSidebarCollapsed = useVaultStore(state => state.setSidebarCollapsed);
    const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);
    const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
    const [logoRegistry, setLogoRegistry] = useState<LogoMetadata[]>([]);
    const [presetData, setPresetData] = useState<LogoMetadata | null>(null);

    // Load logo registry on mount
    useEffect(() => {
        window.api.getLogoRegistry().then(registry => {
            setLogoRegistry(registry.logos || []);
        });
    }, []);

    // Default to false if undefined
    const isCollapsed = workspace.layout?.rightSidebarCollapsed ?? false;

    // Sort brokers by custom sortOrder or name
    const sortedBrokers = [...brokers].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    return (
        <aside className={cn(
            "bg-background-subtle border-l border-border flex flex-col transition-all duration-300 ease-in-out",
            isCollapsed ? "w-16" : "w-64"
        )}>
            {/* Drag region for macOS */}
            <div className="h-8 app-drag-region" />

            <BrokerPresetSelectorModal
                isOpen={isPresetSelectorOpen}
                onClose={() => setIsPresetSelectorOpen(false)}
                onSelectPreset={(preset) => {
                    setPresetData(preset);
                    setIsAddBrokerOpen(true);
                }}
                onCustomBroker={() => {
                    setPresetData(null);
                    setIsAddBrokerOpen(true);
                }}
                logoRegistry={logoRegistry}
            />

            <AddBrokerModal
                isOpen={isAddBrokerOpen}
                onClose={() => {
                    setIsAddBrokerOpen(false);
                    setPresetData(null);
                }}
                initialPreset={presetData}
            />

            <div className="flex-1 overflow-y-auto px-2" data-tour="brokers-section">
                <div className={cn("flex items-center mb-2 px-2 py-2", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && (
                        <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">
                            {t('nav.brokers')}
                        </h3>
                    )}
                    <button
                        onClick={() => setIsPresetSelectorOpen(true)}
                        className="p-1.5 rounded hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors"
                        title={t('brokers.addTitle')}
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                    </button>
                </div>

                <div className="space-y-1">
                    {sortedBrokers.length === 0 && !isCollapsed ? (
                        <div className="px-3 py-4 text-center border border-dashed border-border rounded-lg">
                            <p className="text-sm text-foreground-subtle mb-2">{t('brokers.noAccounts')}</p>
                            <button
                                onClick={() => setIsAddBrokerOpen(true)}
                                className="text-xs text-primary font-medium hover:underline"
                            >
                                {t('brokers.addTitle')}
                            </button>
                        </div>
                    ) : (
                        sortedBrokers.map((broker) => {
                            const isActive = activeView === `broker:${broker.id}`;

                            return (
                                <button
                                    key={broker.id}
                                    onClick={() => setActiveView(`broker:${broker.id}`)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group border border-transparent",
                                        isCollapsed ? "justify-center px-0" : "",
                                        isActive
                                            ? "bg-background-card text-foreground font-medium shadow-sm border-border"
                                            : "hover:bg-background-muted text-foreground-muted hover:text-foreground"
                                    )}
                                    title={isCollapsed ? broker.name : undefined}
                                >
                                    <div
                                        className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 overflow-hidden",
                                            broker.logoPath ? "bg-white p-0.5" : ""
                                        )}
                                        style={{ backgroundColor: broker.logoPath ? undefined : broker.color }}
                                    >
                                        {broker.logoPath ? (
                                            <img
                                                src={broker.logoPath.startsWith('asset://')
                                                    ? broker.logoPath
                                                    : `file://${vaultPath}/${broker.logoPath}`}
                                                alt={broker.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            (() => {
                                                const IconComponent = broker.icon ? ICON_MAP[broker.icon] : Building2;
                                                return IconComponent ? (
                                                    <IconComponent
                                                        className="w-4 h-4 text-white"
                                                    />
                                                ) : (
                                                    <Building2
                                                        className="w-4 h-4 text-white"
                                                    />
                                                );
                                            })()
                                        )}
                                    </div>
                                    {!isCollapsed && (
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-sm truncate">
                                                {broker.name}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Collapse Toggle Footer */}
            <div className="p-3 border-t border-border mt-auto">
                <button
                    onClick={() => setSidebarCollapsed('right', !isCollapsed)}
                    className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-background-muted text-foreground-muted hover:text-foreground transition-colors"
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    <PanelRightClose className={cn("w-4 h-4 transition-transform", !isCollapsed && "rotate-180")} />
                </button>
            </div>
        </aside>
    );
}
