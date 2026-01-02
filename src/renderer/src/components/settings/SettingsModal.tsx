import React from 'react';
import { X, Globe, Moon, Sun, DollarSign, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES, type Theme, type DateFormat, type TimeFormat } from '../../../../shared/types';
import { cn } from '../../lib/utils';
import { CategoryManager } from './CategoryManager';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { t } = useTranslation();

    const {
        currency, language, theme, decimals, dateFormat, timeFormat,
        setCurrency, setLanguage, setTheme, setDecimals, setDateFormat, setTimeFormat
    } = useSettingsStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-background-card rounded-2xl w-full max-w-lg shadow-xl border border-border flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-background-muted dark:hover:bg-background-subtle rounded-full transition-colors">
                        <X className="w-5 h-5 text-foreground-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8 overflow-y-auto">

                    {/* General Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                            {t('settings.general')}
                        </h3>

                        {/* Currency */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                {t('settings.baseCurrency')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {SUPPORTED_CURRENCIES.map((curr) => (
                                    <button
                                        key={curr.code}
                                        onClick={() => setCurrency(curr.code)}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            currency === curr.code
                                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                                : "border-border hover:bg-background-muted text-foreground"
                                        )}
                                    >
                                        <span className="font-medium">{curr.code}</span>
                                        <span className="opacity-75">{curr.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                {t('settings.language')}
                            </label>
                            <div className="flex gap-2">
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className={cn(
                                            "flex-1 px-3 py-2 rounded-lg border text-sm transition-all text-center font-medium",
                                            language === lang.code
                                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                                : "border-border hover:bg-background-muted text-foreground"
                                        )}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Decimals */}
                        <div className="space-y-2 pt-2">
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
                                                ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                                : "border-border hover:bg-background-muted text-foreground"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="border-t border-border" />

                    {/* Date & Time */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                            {t('settings.dateTime')}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Date Format */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    {t('settings.dateFormat')}
                                </label>
                                <select
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2023)</option>
                                    <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2023)</option>
                                    <option value="yyyy-MM-dd">YYYY-MM-DD (2023-12-31)</option>
                                    <option value="dd.MM.yyyy">DD.MM.YYYY (31.12.2023)</option>
                                </select>
                            </div>

                            {/* Time Format */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    {t('settings.timeFormat')}
                                </label>
                                <select
                                    value={timeFormat}
                                    onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="HH:mm">24-hour (14:30)</option>
                                    <option value="hh:mm a">12-hour (02:30 PM)</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="border-t border-border" />

                    {/* Appearance */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                            {t('settings.appearance')}
                        </h3>

                        {/* Theme */}
                        <div className="grid grid-cols-3 gap-2">
                            {(['light', 'dark', 'system'] as Theme[]).map((tVal) => (
                                <button
                                    key={tVal}
                                    onClick={() => setTheme(tVal)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 px-3 py-3 rounded-xl border text-sm transition-all",
                                        theme === tVal
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                                            : "border-border hover:bg-background-muted text-foreground"
                                    )}
                                >
                                    {tVal === 'light' && <Sun className="w-5 h-5" />}
                                    {tVal === 'dark' && <Moon className="w-5 h-5" />}
                                    {tVal === 'system' && <Monitor className="w-5 h-5" />}
                                    <span className="capitalize">{t(`settings.themes.${tVal}`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="border-t border-border" />

                    {/* Categories */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
                            {t('settings.categories')}
                        </h3>
                        {/* We use a specific height container for the manager to allow internal scrolling */}
                        <div className="h-[400px]">
                            <CategoryManager />
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
