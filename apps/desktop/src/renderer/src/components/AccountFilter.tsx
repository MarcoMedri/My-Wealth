import { useState, useMemo } from 'react';
import { ChevronDown, Search, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../store/useVaultStore';

interface AccountFilterProps {
    selectedAccountIds: string[];
    onChange: (accountIds: string[]) => void;
    className?: string;
}

export function AccountFilter({ selectedAccountIds, onChange, className }: AccountFilterProps) {
    const { t } = useTranslation();
    const accounts = useVaultStore(state => state.accounts);
    const brokers = useVaultStore(state => state.brokers);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Group accounts by broker
    const accountsByBroker = useMemo(() => {
        const grouped = new Map<string, typeof accounts>();

        accounts.forEach(account => {
            const brokerId = account.brokerId || 'no-broker';
            if (!grouped.has(brokerId)) {
                grouped.set(brokerId, []);
            }
            grouped.get(brokerId)!.push(account);
        });

        return grouped;
    }, [accounts]);

    // Filter accounts by search
    const filteredAccounts = useMemo(() => {
        if (!searchQuery.trim()) return accounts;

        const query = searchQuery.toLowerCase();
        return accounts.filter(account =>
            account.name.toLowerCase().includes(query) ||
            brokers.find(b => b.id === account.brokerId)?.name.toLowerCase().includes(query)
        );
    }, [accounts, brokers, searchQuery]);

    const allSelected = selectedAccountIds.length === 0;

    const handleToggleAll = () => {
        onChange([]);
    };

    const handleToggleAccount = (accountId: string) => {
        if (selectedAccountIds.includes(accountId)) {
            onChange(selectedAccountIds.filter(id => id !== accountId));
        } else {
            onChange([...selectedAccountIds, accountId]);
        }
    };

    const getButtonLabel = () => {
        if (allSelected) {
            return t('accounts.allAccounts', 'All Accounts');
        }

        if (selectedAccountIds.length === 1) {
            const account = accounts.find(a => a.id === selectedAccountIds[0]);
            return account?.name || t('accounts.allAccounts', 'All Accounts');
        }

        if (selectedAccountIds.length === 2) {
            const names = selectedAccountIds
                .map(id => accounts.find(a => a.id === id)?.name)
                .filter(Boolean);
            return names.join(', ');
        }

        return t('accounts.accountsSelected', `${selectedAccountIds.length} Accounts Selected`);
    };

    return (
        <div className={`relative ${className || ''}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-background-muted rounded-xl text-foreground-muted hover:bg-background-subtle transition-colors border border-border"
            >
                <span className="text-sm font-medium">{getButtonLabel()}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 bg-background-card rounded-xl shadow-lg border border-border z-20 overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('accounts.searchAccounts', 'Search account...')}
                                    className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {/* All Accounts Option */}
                        <div className="border-b border-border">
                            <button
                                onClick={handleToggleAll}
                                className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-background-muted transition-colors"
                            >
                                {allSelected ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                ) : (
                                    <Square className="w-4 h-4 text-foreground-muted" />
                                )}
                                <span className={`text-sm font-medium ${allSelected ? 'text-primary' : 'text-foreground'}`}>
                                    {t('accounts.allAccounts', 'All Accounts')}
                                </span>
                            </button>
                        </div>

                        {/* Account List */}
                        <div className="max-h-80 overflow-y-auto">
                            {Array.from(accountsByBroker.entries()).map(([brokerId, brokerAccounts]) => {
                                const broker = brokers.find(b => b.id === brokerId);
                                const visibleAccounts = brokerAccounts.filter(account =>
                                    filteredAccounts.some(fa => fa.id === account.id)
                                );

                                if (visibleAccounts.length === 0) return null;

                                return (
                                    <div key={brokerId} className="py-2">
                                        {broker && (
                                            <div className="px-4 py-1 text-xs font-medium text-foreground-muted uppercase tracking-wider">
                                                {broker.name}
                                            </div>
                                        )}
                                        {visibleAccounts.map(account => {
                                            const isSelected = allSelected || selectedAccountIds.includes(account.id);

                                            return (
                                                <button
                                                    key={account.id}
                                                    onClick={() => handleToggleAccount(account.id)}
                                                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-background-muted transition-colors"
                                                    disabled={allSelected}
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-foreground-muted" />
                                                    )}
                                                    <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-foreground-muted'}`}>
                                                        {account.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}

                            {filteredAccounts.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-foreground-muted">
                                    {t('accounts.noAccountsFound', 'No accounts found')}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
