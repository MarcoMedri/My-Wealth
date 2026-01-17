/**
 * QuickActionFAB - Floating Action Button
 * 
 * Provides quick access to common actions from anywhere in the app
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, TrendingUp, Wallet, PieChart, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { useVaultStore } from '../store/useVaultStore';

interface QuickAction {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    color: string;
}

export function QuickActionFAB() {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);
    const { setActiveView } = useVaultStore();

    const actions: QuickAction[] = [
        {
            icon: TrendingUp,
            label: t('quickActions.addInvestment', 'Add Investment'),
            onClick: () => {
                setActiveView('investments');
                setIsExpanded(false);
            },
            color: 'bg-blue-500 hover:bg-blue-600',
        },
        {
            icon: Wallet,
            label: t('quickActions.addAccount', 'Add Account'),
            onClick: () => {
                setActiveView('accounts');
                setIsExpanded(false);
            },
            color: 'bg-emerald-500 hover:bg-emerald-600',
        },
        {
            icon: PieChart,
            label: t('quickActions.viewAnalytics', 'View Analytics'),
            onClick: () => {
                setActiveView('analytics');
                setIsExpanded(false);
            },
            color: 'bg-purple-500 hover:bg-purple-600',
        },
        {
            icon: Camera,
            label: t('quickActions.snapshot', 'Take Snapshot'),
            onClick: async () => {
                setIsExpanded(false);
                try {
                    await window.api.createSnapshot();
                    await useVaultStore.getState().refreshData();
                } catch (error) {
                    console.error('Snapshot failed:', error);
                }
            },
            color: 'bg-amber-500 hover:bg-amber-600',
        },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Sub-actions */}
            {isExpanded && (
                <div className="absolute bottom-20 right-0 space-y-3 mb-2">
                    {actions.map((action, index) => (
                        <div
                            key={action.label}
                            className={cn(
                                "flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in",
                                "opacity-0"
                            )}
                            style={{
                                animationDelay: `${index * 50}ms`,
                                animationFillMode: 'forwards',
                            }}
                        >
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-md whitespace-nowrap">
                                {action.label}
                            </span>
                            <button
                                onClick={action.onClick}
                                className={cn(
                                    "w-12 h-12 rounded-full text-white shadow-lg",
                                    "flex items-center justify-center",
                                    "transform transition-all duration-200",
                                    "hover:scale-110 active:scale-95",
                                    action.color
                                )}
                                title={action.label}
                            >
                                <action.icon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Main FAB */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "w-14 h-14 rounded-full shadow-2xl",
                    "flex items-center justify-center",
                    "transform transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    "focus:outline-none focus:ring-4 focus:ring-blue-300",
                    isExpanded
                        ? "bg-gray-700 hover:bg-gray-800 rotate-45"
                        : "bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                )}
                aria-label={isExpanded ? t('quickActions.close') : t('quickActions.open')}
            >
                {isExpanded ? (
                    <X className="w-6 h-6 text-white" />
                ) : (
                    <Plus className="w-6 h-6 text-white" />
                )}
            </button>

            {/* Backdrop */}
            {isExpanded && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    onClick={() => setIsExpanded(false)}
                />
            )}
        </div>
    );
}
