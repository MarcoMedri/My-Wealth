import { Toaster as Sonner } from 'sonner';
import { useSettingsStore } from '../../store/useSettingsStore';

export function Toaster() {
    const theme = useSettingsStore(state => state.theme);

    // Resolving 'system' theme to actual theme might be needed if sonner doesn't auto-detect, 
    // but usually 'system' works or we pass 'dark'/'light'. 
    // For simplicity, we can let sonner handle it or pass specific theme prop.
    // Sonner 'theme' prop accepts 'light' | 'dark' | 'system'.

    return (
        <Sonner
            theme={theme as 'light' | 'dark' | 'system'}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-background-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-foreground-muted",
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
        />
    );
}
