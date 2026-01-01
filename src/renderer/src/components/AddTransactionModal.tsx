/**
 * Add Transaction Modal
 * Form to create a new transaction
 */

import { useState, useEffect } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { Loader2, ArrowRight } from 'lucide-react';
import type { Transaction, TransactionType } from '../../../shared/schemas';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction?: Transaction | null; // Optional transaction to edit
    isDuplicate?: boolean; // If true, treats the transaction as a template for a new one
}

export default function AddTransactionModal({ isOpen, onClose, transaction, isDuplicate = false }: AddTransactionModalProps) {
    const { accounts, categories, addTransaction, updateTransaction } = useVaultStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter out archived accounts
    const activeAccounts = accounts.filter(a => !a.isArchived);

    // Group categories by type
    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const [formData, setFormData] = useState({
        type: 'expense' as TransactionType,
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payee: '',
        accountId: activeAccounts[0]?.id || '',
        categoryId: '',
        toAccountId: '',
        notes: '',
    });

    useEffect(() => {
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
            setFormData({
                type: 'expense',
                date: new Date().toISOString().split('T')[0],
                amount: '',
                payee: '',
                accountId: activeAccounts[0]?.id || '',
                categoryId: '',
                toAccountId: '',
                notes: '',
            });
        }
    }, [transaction, isOpen, activeAccounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.accountId) return;

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
                // Update existing
                // We need an update API or just re-save with same ID? 
                // The main process saveTransaction handles upsert if ID provided?
                // Let's check main process. The ipc 'TRANSACTION_SAVE' takes Omit<Transaction, 'id' ...> & { id?: string }.
                // So if we pass ID, it should update.

                // However, window.api.saveTransaction returns the saved object.
                const saved = await window.api.saveTransaction({
                    ...tx,
                    id: transaction.id,
                });
                updateTransaction(saved);
            } else {
                // Create new
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Transaction" : isDuplicate ? "Duplicate Transaction" : "Add Transaction"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Transaction Type Tabs */}
                <div className="flex p-1 bg-background-subtle rounded-lg border border-border">
                    {(['expense', 'income', 'transfer'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setFormData({ ...formData, type, categoryId: '', toAccountId: '' })}
                            className={cn(
                                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
                                formData.type === type
                                    ? "bg-background-muted text-foreground shadow"
                                    : "text-foreground-muted hover:text-foreground"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                {/* Amount & Date */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            Amount
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
                            Date
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
                            {formData.type === 'income' ? 'Deposit To' : 'Payment From'}
                        </label>
                        <select
                            required
                            value={formData.accountId}
                            onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                            className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        >
                            <option value="" disabled>Select Account</option>
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
                                    Transfer To
                                </label>
                                <select
                                    required
                                    value={formData.toAccountId}
                                    onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                                    className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="" disabled>Select Account</option>
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
                                Category
                            </label>
                            <select
                                required
                                value={formData.categoryId}
                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="" disabled>Select Category</option>
                                {activeCategories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Payee / Description */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        Payee / Description
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.payee}
                        onChange={e => setFormData({ ...formData, payee: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder={formData.type === 'income' ? 'e.g. Employer' : 'e.g. Supermarket'}
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                        placeholder="Add a note..."
                    />
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
                    >
                        Cancel
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
                        {isEditing ? 'Update Transaction' : 'Save Transaction'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
