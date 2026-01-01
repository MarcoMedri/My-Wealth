/**
 * Add Account Modal
 * Form to create a new account
 */

import { useState } from 'react';
import { useVaultStore } from '../store/useVaultStore';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import type { AccountType } from '../../../shared/schemas';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit', label: 'Credit Card' },
    { value: 'investment', label: 'Investment Portfolio' },
    { value: 'cash', label: 'Cash Wallet' },
    { value: 'loan', label: 'Loan / Mortgage' },
    { value: 'other', label: 'Other' },
];

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
];

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
    const { refreshData } = useVaultStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'checking' as AccountType,
        currency: 'EUR',
        initialBalance: '0.00',
        color: COLORS[0],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Parse amount to cents
            const amount = parseFloat(formData.initialBalance);
            if (isNaN(amount)) throw new Error('Invalid balance amount');
            const initialBalanceCents = Math.round(amount * 100);

            await window.api.saveAccount({
                name: formData.name,
                type: formData.type,
                currency: formData.currency,
                initialBalance: initialBalanceCents,
                color: formData.color,
                isArchived: false,
                sortOrder: 0,
            });

            await refreshData();
            onClose();
            // Reset form
            setFormData({
                name: '',
                type: 'checking',
                currency: 'EUR',
                initialBalance: '0.00',
                color: COLORS[0],
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Account">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        Account Name
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        placeholder="e.g. Main Bank Account"
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        Account Type
                    </label>
                    <select
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        {ACCOUNT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Currency & Initial Balance */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground-muted mb-1">
                            Currency
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
                            Initial Balance
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

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                        Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(color => (
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
                        Create Account
                    </button>
                </div>
            </form>
        </Modal>
    );
}
