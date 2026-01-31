import { useEffect, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface KeyboardShortcut {
    /** Key combination (e.g., 'ctrl+k', 'cmd+shift+p') */
    keys: string;
    /** Handler function */
    handler: () => void;
    /** Description for help display */
    description?: string;
    /** Whether to prevent default browser behavior */
    preventDefault?: boolean;
    /** Whether to allow in input fields */
    allowInInputs?: boolean;
}

interface ParsedKey {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean; // Cmd on Mac
}

// ============================================================================
// HELPERS
// ============================================================================

function parseKeyCombo(combo: string): ParsedKey {
    const parts = combo.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    
    return {
        key,
        ctrl: parts.includes('ctrl'),
        alt: parts.includes('alt'),
        shift: parts.includes('shift'),
        meta: parts.includes('cmd') || parts.includes('meta'),
    };
}

function matchesEvent(event: KeyboardEvent, parsed: ParsedKey): boolean {
    const eventKey = event.key.toLowerCase();
    
    // Handle special keys
    const keyMatches = 
        eventKey === parsed.key ||
        event.code.toLowerCase() === `key${parsed.key}` ||
        event.code.toLowerCase() === parsed.key;
    
    return (
        keyMatches &&
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        event.metaKey === parsed.meta
    );
}

function isInputElement(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    
    const tagName = target.tagName.toLowerCase();
    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target.isContentEditable
    );
}

// ============================================================================
// HOOK: useKeyboardShortcuts
// ============================================================================

/**
 * Register multiple keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { keys: 'cmd+k', handler: openSearch, description: 'Open search' },
 *   { keys: 'cmd+n', handler: createNew, description: 'Create new' },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            for (const shortcut of shortcutsRef.current) {
                const parsed = parseKeyCombo(shortcut.keys);
                
                if (matchesEvent(event, parsed)) {
                    // Check if we should ignore input fields
                    if (!shortcut.allowInInputs && isInputElement(event.target)) {
                        continue;
                    }
                    
                    if (shortcut.preventDefault !== false) {
                        event.preventDefault();
                    }
                    
                    shortcut.handler();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

// ============================================================================
// HOOK: useKeyboardShortcut (single shortcut)
// ============================================================================

/**
 * Register a single keyboard shortcut
 * 
 * @example
 * useKeyboardShortcut('cmd+s', handleSave, { preventDefault: true });
 */
export function useKeyboardShortcut(
    keys: string,
    handler: () => void,
    options: Partial<Omit<KeyboardShortcut, 'keys' | 'handler'>> = {}
): void {
    useKeyboardShortcuts([{
        keys,
        handler,
        ...options,
    }]);
}

// ============================================================================
// HOOK: useEscapeKey
// ============================================================================

/**
 * Handle Escape key press (common pattern for modals/dialogs)
 */
export function useEscapeKey(handler: () => void, enabled: boolean = true): void {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                handler();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handler, enabled]);
}

// ============================================================================
// COMMON SHORTCUTS
// ============================================================================

export const COMMON_SHORTCUTS = {
    SEARCH: 'cmd+k',
    NEW: 'cmd+n',
    SAVE: 'cmd+s',
    UNDO: 'cmd+z',
    REDO: 'cmd+shift+z',
    CLOSE: 'escape',
    REFRESH: 'cmd+r',
    SETTINGS: 'cmd+,',
} as const;

// ============================================================================
// FORMAT SHORTCUT FOR DISPLAY
// ============================================================================

/**
 * Format a shortcut for display (e.g., 'cmd+k' -> '⌘K')
 */
export function formatShortcut(keys: string): string {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    
    return keys
        .split('+')
        .map(part => {
            switch (part.toLowerCase()) {
                case 'cmd':
                case 'meta':
                    return isMac ? '⌘' : 'Ctrl';
                case 'ctrl':
                    return isMac ? '⌃' : 'Ctrl';
                case 'alt':
                    return isMac ? '⌥' : 'Alt';
                case 'shift':
                    return isMac ? '⇧' : 'Shift';
                default:
                    return part.toUpperCase();
            }
        })
        .join(isMac ? '' : '+');
}
