/**
 * Add Transaction Modal
 * Form to create a new transaction
 */

import { useState, useEffect, useMemo, useRef } from 'react';
// Force HMR update - Tab selection bug fixed
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../store/useVaultStore';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { Loader2, ArrowRight, Check, ChevronDown, Tag } from 'lucide-react';
import type { Transaction, TransactionType, Category, Account } from '../../../shared/schemas';
import { ICON_MAP } from './settings/IconPicker';
import { DEFAULT_CATEGORY_COLOR } from '../lib/constants';
import { useCategoryName } from '../hooks/useCategoryName';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction | null; // Optional transaction to edit
    isDuplicate?: boolean; // If true, treats the transaction as a template for a new one
    preselectedAccountId?: string;
    limitToBrokerId?: string; // If set, only allow selecting accounts from this broker
}

export default function AddTransactionModal({ isOpen, onClose, transaction, isDuplicate = false, preselectedAccountId, limitToBrokerId }: AddTransactionModalProps) {
    const { t } = useTranslation();
    const { accounts, categories, addTransaction, updateTransaction } = useVaultStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize active accounts to prevent effect loops
    const activeAccounts = useMemo(() => {
        let filtered = accounts.filter((a: Account) => !a.isArchived);
        if (limitToBrokerId) {
            filtered = filtered.filter(a => a.brokerId === limitToBrokerId);
        }
        return filtered;
    }, [accounts, limitToBrokerId]);

    // Group categories by type
    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const [formData, setFormData] = useState({
        type: 'expense' as TransactionType,
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payee: '',
        accountId: preselectedAccountId || activeAccounts[0]?.id || '',
        categoryId: '',
        toAccountId: '',
        notes: '',
    });

    // Track previous open state to detect opening transition
    // Initialize to false so that if mounted open, it triggers the opening logic
    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        // Only run logic if we are transitioning from closed to open
        const isOpening = isOpen && !prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        if (!isOpen) return;

        if (isOpening) {
            if (transaction) {
                setFormData({
                    type: transaction.type,
                    date: transaction.date.split('T')[0],
                    amount: (transaction.amount / 100).toFixed(2),
                    payee: transaction.payee,
                    accountId: transaction.accountId,
                    categoryId: transaction.categoryId || '',
                    toAccountId: transaction.toAccountId || '',
                    notes: transaction.notes || '',
                });
            } else {
                // Reset to defaults
                setFormData(prev => ({
                    ...prev, // Keep existing values if any, or strictly reset? Better to strict reset.
                    type: 'expense',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    payee: '',
                    // Use preselected, or fallback to first available active account (which is already filtered by broker if limitToBrokerId set)
                    accountId: preselectedAccountId || activeAccounts[0]?.id || '',
                    categoryId: '',
                    toAccountId: '',
                    notes: '',
                }));
            }
        } else if (preselectedAccountId && formData.accountId !== preselectedAccountId && formData.accountId === '') {
            // Edge case: if preselectedAccountId arrives late or changes while open AND nothing is selected
            setFormData(prev => ({ ...prev, accountId: preselectedAccountId }));
        } else if (limitToBrokerId && !activeAccounts.find(a => a.id === formData.accountId) && activeAccounts.length > 0 && !transaction) {
            // Auto-select first available account for the broker if current selection is invalid
            setFormData(prev => ({ ...prev, accountId: activeAccounts[0].id }));
        }

    }, [transaction, isOpen, activeAccounts, preselectedAccountId, limitToBrokerId, formData.accountId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId) return;

        if (formData.type === 'transfer') {
            if (!formData.toAccountId) {
                setError(t('transactions.errorSelectDestAccount') || 'Please select a destination account');
                return;
            }
            if (formData.accountId === formData.toAccountId) {
                setError(t('transactions.errorSameAccount') || 'Source and destination accounts must be different');
                return;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const amount = parseFloat(formData.amount);
            if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');
            const amountCents = Math.round(amount * 100);

            const account = accounts.find(a => a.id === formData.accountId);
            if (!account) throw new Error('Account not found');

            // Date Handling:
            // Create a date object at NOON local time for the selected date string (YYYY-MM-DD)
            // This prevents timezone shifts when converting to UTC (e.g. 00:00 local map drop to prev day in UTC)
            const [year, month, day] = formData.date.split('-').map(Number);
            // Month is 0-indexed in Date constructor
            const dateObj = new Date(year, month - 1, day, 12, 0, 0);

            // Create transaction object
            const tx = await window.api.saveTransaction({
                type: formData.type,
                date: dateObj.toISOString(),
                payee: formData.payee,
                amount: amountCents,
                currency: account.currency,
                accountId: formData.accountId,
                brokerId: account.brokerId, // Link transaction to broker
                categoryId: formData.categoryId || null,
                toAccountId: formData.type === 'transfer' ? formData.toAccountId : null,
                splits: [],
                status: 'cleared',
                notes: formData.notes,
                tags: [],
                isReconciled: false,
            });

            // Update UI optimistically (or full refresh)
            if (isEditing) {
                const saved = await window.api.saveTransaction({
                    ...tx,
                    id: transaction.id,
                });
                updateTransaction(saved);
            } else {
                addTransaction(tx);
            }

            onClose();
            // Reset form but keep convenience fields
            setFormData(prev => ({
                ...prev,
                amount: '',
                payee: '',
                notes: '',
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save transaction');
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic category list based on transaction type
    const activeCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

    const isEditing = !!transaction && !isDuplicate;

    const getModalTitle = () => {
        if (isEditing) return t('transactions.editTransaction');
        if (isDuplicate) return t('transactions.duplicateTransaction');
        return t('transactions.addTransaction');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="flex p-1 bg-background-subtle rounded-lg border border-border">
                    {(['expense', 'income', 'transfer'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type, categoryId: '', toAccountId: '' })}
                            className={cn(
                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                                formData.type === type
                                    ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                    : "text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {t(`transactions.${type}`)}
                        </button>
                    ))}
                </div>

                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('transactions.amount')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none text-right font-mono"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {t('transactions.date')}
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </div>

                {/* Accounts / Category */}
                <div className="space-y-4">
                    {/* From Account */}
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            {formData.type === 'income' ? t('transactions.depositTo') : t('transactions.paymentFrom')}
                        </label>
                        <select
                            required
                            value={formData.accountId}
                            onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="" disabled>{t('transactions.selectAccount')}</option>
                            {activeAccounts.map(account => (
                                <option key={account.id} value={account.id}>
                                    {account.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Transfer To Account Or Category */}
                    {formData.type === 'transfer' ? (
                        <div className="flex items-center gap-4">
                            <div className="pt-6">
                                <ArrowRight className="w-5 h-5 text-foreground-subtle" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-foreground-muted mb-1">
                                    {t('transactions.transferTo')}
                                </label>
                                <select
                                    required
                                    value={formData.toAccountId}
                                    onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                                    className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="" disabled>{t('transactions.selectAccount')}</option>
                                    {activeAccounts
                                        .filter(a => a.id !== formData.accountId) // Prevent transfer to same account
                                        .map(account => (
                                            <option key={account.id} value={account.id}>
                                                {account.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('transactions.category')}
                            </label>

                            <CategorySelect
                                value={formData.categoryId}
                                onChange={(id) => setFormData({ ...formData, categoryId: id })}
                                categories={activeCategories}
                                placeholder={t('transactions.selectCategory')}
                            />
                        </div>
                    )}
                </div>

                {/* Payee / Description - MOVED INSIDE */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {formData.type === 'income' ? t('transactions.payer') : t('transactions.payeeDescription')}
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.payee}
                        onChange={e => setFormData({ ...formData, payee: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder={formData.type === 'income' ? t('transactions.payeePlaceholderIncome') : t('transactions.payeePlaceholderExpense')}
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('transactions.notesOptional')}
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        rows={3}
                        placeholder={t('transactions.notesPlaceholder')}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
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
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium shadow-sm hover:shadow"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEditing ? t('common.save') : t('transactions.addTransactionShort')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// Custom Select Component for Categories with Icons
function CategorySelect({
    value,
    onChange,
    categories,
    placeholder
}: {
    value: string;
    onChange: (id: string) => void;
    categories: Category[];
    placeholder: string;
}) {
    const { t } = useTranslation();
    const { getCategoryName } = useCategoryName();
    const [isOpen, setIsOpen] = useState(false);
    const selectedCategory = categories.find(c => c.id === value);

    // Close on click outside (simulated by backdrop)
    return (
        <div className="relative">
            {isOpen && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none text-left"
            >
                {selectedCategory ? (
                    <div className="flex items-center gap-2">
                        {(() => {
                            const IconComp = ICON_MAP[selectedCategory.icon as keyof typeof ICON_MAP] || Tag;
                            return (
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                    style={{ backgroundColor: selectedCategory.color || DEFAULT_CATEGORY_COLOR }}
                                >
                                    <IconComp className="w-3.5 h-3.5" />
                                </div>
                            );
                        })()}
                        <span>{getCategoryName(selectedCategory.name)}</span>
                    </div>
                ) : (
                    <span className="text-foreground-muted">{placeholder}</span>
                )}
                <ChevronDown className="w-4 h-4 text-foreground-muted" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-background-card border border-border rounded-lg shadow-lg z-20">
                    {categories.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-foreground-muted text-center">
                            {t('common.noCategoriesFound')}
                        </div>
                    ) : (
                        categories.map(category => {
                            const IconComp = ICON_MAP[category.icon as keyof typeof ICON_MAP] || Tag;
                            const isSelected = category.id === value;

                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(category.id);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-background-subtle",
                                        isSelected && "bg-background-subtle text-primary"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                            style={{ backgroundColor: category.color || DEFAULT_CATEGORY_COLOR }}
                                        >
                                            <IconComp className="w-3.5 h-3.5" />
                                        </div>
                                        <span>{getCategoryName(category.name)}</span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
