/**
 * ThemeProvider Component
 * Syncs the theme state from useSettingsStore with the DOM (adds/removes .dark class on <html>)
 * Handles 'system' preference using matchMedia
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSettingsStore(state => state.theme);

    useEffect(() => {
        const root = document.documentElement;

        const applyTheme = (isDark: boolean) => {
            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        if (theme === 'system') {
            // Use system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            applyTheme(mediaQuery.matches);

            // Listen for system preference changes
            const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
            mediaQuery.addEventListener('change', handler);

            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            applyTheme(theme === 'dark');
        }
    }, [theme]);

    return <>{children}</>;
}
