/**
 * Add Account Modal
 * Form to create a new account
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../store/useVaultStore';
import Modal from './Modal';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';
import type { AccountType } from '../../../shared/schemas';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ACCOUNT_TYPE_KEYS: AccountType[] = ['checking', 'savings', 'credit', 'investment', 'cash', 'loan', 'deposit', 'other'];

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
    const { t } = useTranslation();
    const { refreshData } = useVaultStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: 'checking' as AccountType,
        currency: 'EUR',
        initialBalance: '0.00',
        color: COLORS[0],
        brokerId: '',
    });

    const brokers = useVaultStore(state => state.brokers);

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
                brokerId: formData.brokerId || undefined,
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
                brokerId: '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('accounts.addAccount')}>
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

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-2">
                        {t('accounts.color')}
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
                        {t('accounts.createAccount')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
