import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, ArrowRight, LayoutDashboard, CreditCard, TrendingUp, Building, Watch, Shield, PiggyBank, Settings, Keyboard } from 'lucide-react';
import { useKeyboardShortcut, formatShortcut, COMMON_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

// ============================================================================
// TYPES
// ============================================================================

export interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    shortcut?: string;
    category: string;
    action: () => void;
    keywords?: string[];
}

export interface CommandPaletteProps {
    commands: CommandItem[];
}

// ============================================================================
// DEFAULT COMMANDS
// ============================================================================

export function createNavigationCommands(navigate: (view: string) => void): CommandItem[] {
    return [
        {
            id: 'nav-dashboard',
            label: 'Go to Dashboard',
            description: 'View your financial overview',
            icon: <LayoutDashboard className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('dashboard'),
            keywords: ['home', 'overview'],
        },
        {
            id: 'nav-accounts',
            label: 'Go to Accounts',
            description: 'Manage bank accounts',
            icon: <CreditCard className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('accounts'),
            keywords: ['bank', 'cash'],
        },
        {
            id: 'nav-investments',
            label: 'Go to Investments',
            description: 'View your portfolio',
            icon: <TrendingUp className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('investments'),
            keywords: ['stocks', 'etf', 'portfolio'],
        },
        {
            id: 'nav-properties',
            label: 'Go to Real Estate',
            description: 'Manage properties',
            icon: <Building className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('properties'),
            keywords: ['house', 'real estate'],
        },
        {
            id: 'nav-collectibles',
            label: 'Go to Collectibles',
            description: 'Track valuable items',
            icon: <Watch className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('collectibles'),
            keywords: ['art', 'luxury'],
        },
        {
            id: 'nav-insurance',
            label: 'Go to Insurance',
            description: 'View insurance policies',
            icon: <Shield className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('insurance'),
            keywords: ['policy'],
        },
        {
            id: 'nav-deposits',
            label: 'Go to Deposits',
            description: 'Manage deposit accounts',
            icon: <PiggyBank className="w-4 h-4" />,
            category: 'Navigation',
            action: () => navigate('deposits'),
            keywords: ['savings', 'conto deposito'],
        },
        {
            id: 'nav-settings',
            label: 'Go to Settings',
            description: 'Configure application',
            icon: <Settings className="w-4 h-4" />,
            category: 'Navigation',
            shortcut: COMMON_SHORTCUTS.SETTINGS,
            action: () => navigate('settings'),
            keywords: ['preferences', 'config'],
        },
    ];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({ commands }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Open with Cmd+K
    useKeyboardShortcut(COMMON_SHORTCUTS.SEARCH, () => setIsOpen(true));

    // Focus input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query) return commands;

        const lower = query.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(lower) ||
            cmd.description?.toLowerCase().includes(lower) ||
            cmd.keywords?.some(k => k.toLowerCase().includes(lower))
        );
    }, [commands, query]);

    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        for (const cmd of filteredCommands) {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        }
        return groups;
    }, [filteredCommands]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                break;
        }
    }, [filteredCommands, selectedIndex]);

    // Execute command and close
    const executeCommand = (command: CommandItem) => {
        command.action();
        setIsOpen(false);
    };

    if (!isOpen) return null;

    let itemIndex = -1;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Dialog */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg">
                <div className="bg-background-card rounded-xl shadow-2xl border border-border overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                        <Search className="w-5 h-5 text-foreground-muted" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search commands..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-foreground outline-none placeholder:text-foreground-muted"
                        />
                        <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-background-muted rounded text-xs text-foreground-muted">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-80 overflow-y-auto p-2">
                        {filteredCommands.length === 0 ? (
                            <div className="py-8 text-center text-foreground-muted">
                                No results found
                            </div>
                        ) : (
                            Object.entries(groupedCommands).map(([category, items]) => (
                                <div key={category} className="mb-2 last:mb-0">
                                    <div className="px-2 py-1 text-xs font-medium text-foreground-muted">
                                        {category}
                                    </div>
                                    {items.map(cmd => {
                                        itemIndex++;
                                        const isSelected = itemIndex === selectedIndex;

                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={() => executeCommand(cmd)}
                                                className={`
                                                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                                                    transition-colors
                                                    ${isSelected ? 'bg-primary text-white' : 'hover:bg-background-muted'}
                                                `}
                                            >
                                                <span className={isSelected ? 'text-white' : 'text-foreground-muted'}>
                                                    {cmd.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{cmd.label}</div>
                                                    {cmd.description && (
                                                        <div className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-foreground-muted'}`}>
                                                            {cmd.description}
                                                        </div>
                                                    )}
                                                </div>
                                                {cmd.shortcut && (
                                                    <kbd className={`
                                                        px-2 py-0.5 rounded text-xs
                                                        ${isSelected ? 'bg-white/20 text-white' : 'bg-background-muted text-foreground-muted'}
                                                    `}>
                                                        {formatShortcut(cmd.shortcut)}
                                                    </kbd>
                                                )}
                                                <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-foreground-muted'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-foreground-muted">
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-background-muted rounded">↑↓</kbd>
                            <span>Navigate</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-background-muted rounded">↵</kbd>
                            <span>Select</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Keyboard className="w-3 h-3" />
                            <span>{formatShortcut(COMMON_SHORTCUTS.SEARCH)}</span>
                            <span>Open</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
