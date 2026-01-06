/**
 * Add Account Modal
 * Form to create a new account
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../store/useVaultStore';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { Loader2, Trash } from 'lucide-react';
import { CloseDeleteAccountModal } from './accounts/CloseDeleteAccountModal';
import type { Account, AccountType } from '../../../shared/schemas';
import { ACCOUNT_COLORS } from '../lib/constants';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedBrokerId?: string;
    initialData?: Account;
    defaultType?: AccountType;
}

const ACCOUNT_TYPE_KEYS: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'cash', 'loan', 'deposit', 'other'];

export default function AddAccountModal({ isOpen, onClose, preselectedBrokerId, initialData, defaultType }: AddAccountModalProps) {
    const { t } = useTranslation();
    const { refreshData, deleteAccount } = useVaultStore();
    const transactions = useVaultStore(state => state.transactions);
    const accountBalances = useVaultStore(state => state.accountBalances);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCloseDeleteOpen, setIsCloseDeleteOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: 'checking' as AccountType,
        currency: 'EUR',
        initialBalance: '0.00',
        currentBalance: '',
        useManualBalance: false,
        color: ACCOUNT_COLORS[0],
        brokerId: preselectedBrokerId || '',
    });

    // Load initial data for editing
    useEffect(() => {
        if (initialData) {
            const calculatedBalance = accountBalances[initialData.id] || 0;
            const hasManualBalance = initialData.manualBalance !== undefined;
            setFormData({
                name: initialData.name,
                type: initialData.type,
                currency: initialData.currency,
                initialBalance: (initialData.initialBalance / 100).toFixed(2),
                currentBalance: hasManualBalance
                    ? (initialData.manualBalance! / 100).toFixed(2)
                    : (calculatedBalance / 100).toFixed(2),
                useManualBalance: hasManualBalance,
                color: initialData.color,
                brokerId: initialData.brokerId || '',
            });
        } else {
            // Reset form when modal opens in create mode
            setFormData({
                name: '',
                type: defaultType || 'checking',
                currency: 'EUR',
                initialBalance: '0.00',
                currentBalance: '',
                useManualBalance: false,
                color: ACCOUNT_COLORS[0],
                brokerId: preselectedBrokerId || '',
            });
        }
    }, [initialData, isOpen, preselectedBrokerId, defaultType, accountBalances]);

    const brokers = useVaultStore(state => state.brokers);

    const handleDeleteClick = () => {
        setIsCloseDeleteOpen(true);
    };

    const handleCloseAccount = async () => {
        if (!initialData) return;
        setIsLoading(true);
        try {
            await window.api.saveAccount({ ...initialData, isArchived: true });
            await refreshData();
            setIsCloseDeleteOpen(false);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : t('accounts.archiveError'));
            setIsLoading(false);
            setIsCloseDeleteOpen(false);
        }
    };

    const handleDeleteForever = async () => {
        if (!initialData) return;
        setIsLoading(true);
        try {
            await deleteAccount(initialData.id);
            setIsCloseDeleteOpen(false);
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : t('errors.deleteFailed') || 'Delete failed');
            setIsLoading(false);
            setIsCloseDeleteOpen(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Parse amount to cents
            const amount = parseFloat(formData.initialBalance);
            if (isNaN(amount)) throw new Error('Invalid balance amount');
            const initialBalanceCents = Math.round(amount * 100);

            // Parse manual balance if enabled
            let manualBalance: number | undefined = undefined;
            if (formData.useManualBalance && formData.currentBalance) {
                const currentAmount = parseFloat(formData.currentBalance);
                if (!isNaN(currentAmount)) {
                    manualBalance = Math.round(currentAmount * 100);
                }
            }

            await window.api.saveAccount({
                id: initialData?.id, // Pass ID for update
                name: formData.name,
                type: formData.type,
                currency: formData.currency,
                initialBalance: initialBalanceCents,
                manualBalance: manualBalance,
                color: formData.color,
                brokerId: formData.brokerId || undefined,
                isArchived: initialData?.isArchived ?? false,
                sortOrder: initialData?.sortOrder ?? 0,
            });

            await refreshData();
            onClose();
            // Reset form
            setFormData({
                name: '',
                type: 'checking',
                currency: 'EUR',
                initialBalance: '0.00',
                currentBalance: '',
                useManualBalance: false,
                color: ACCOUNT_COLORS[0],
                brokerId: preselectedBrokerId || '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? t('accounts.editAccount') : t('accounts.addAccount')}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('accounts.accountName')}
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder={t('accounts.accountNamePlaceholder')}
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('accounts.accountType')}
                    </label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        {ACCOUNT_TYPE_KEYS.map(type => (
                            <option key={type} value={type}>
                                {t(`accounts.types.${type}`)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Broker (Optional) */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('accounts.linkedBroker')}
                    </label>
                    <select
                        value={formData.brokerId}
                        onChange={e => setFormData({ ...formData, brokerId: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="">{t('accounts.noBroker')}</option>
                        {brokers.map(broker => (
                            <option key={broker.id} value={broker.id}>
                                {broker.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Currency & Initial Balance */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('accounts.currency')}
                        </label>
                        <select
                            value={formData.currency}
                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('accounts.initialBalance')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.initialBalance}
                            onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                {/* Current Balance (Edit Mode Only) */}
                {initialData && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-foreground-muted">
                                {t('accounts.currentBalance', 'Saldo Attuale')}
                            </label>
                            <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.useManualBalance}
                                    onChange={e => setFormData({ ...formData, useManualBalance: e.target.checked })}
                                    className="rounded border-border"
                                />
                                {t('accounts.useManualBalance', 'Usa Saldo Manuale')}
                            </label>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.currentBalance}
                            onChange={e => setFormData({ ...formData, currentBalance: e.target.value })}
                            disabled={!formData.useManualBalance}
                            className={cn(
                                "w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none",
                                !formData.useManualBalance && "opacity-50 cursor-not-allowed"
                            )}
                        />
                        {formData.useManualBalance && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                {t('accounts.manualBalanceWarning', 'Questo sovrascriverà il saldo calcolato dalle transazioni')}
                            </p>
                        )}
                    </div>
                )}

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                        {t('accounts.color')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ACCOUNT_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setFormData({ ...formData, color })}
                                className={cn(
                                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                    formData.color === color ? "border-white" : "border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={cn(
                            "px-4 py-2 rounded-lg bg-emerald-500 text-foreground font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2",
                            isLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {initialData ? t('common.save') : t('accounts.createAccount')}
                    </button>
                </div>
            </form>

            {/* Delete Button */}
            {initialData && (
                <div className="absolute bottom-5 left-6">
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title={t('common.delete')}
                    >
                        <Trash size={18} />
                    </button>
                </div>
            )}

            {initialData && (
                <CloseDeleteAccountModal
                    isOpen={isCloseDeleteOpen}
                    onClose={() => setIsCloseDeleteOpen(false)}
                    onCloseAccount={handleCloseAccount}
                    onDeleteAccount={handleDeleteForever}
                    accountName={initialData.name}
                    hasTransactions={transactions.some(t => t.accountId === initialData.id)}
                />
            )}
        </Modal>
    );
}
