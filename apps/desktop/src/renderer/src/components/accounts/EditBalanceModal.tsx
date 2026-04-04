import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface EditBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    accountName: string;
    currentBalance: number;
    currency: string;
    hasManualBalance: boolean;
    onBalanceUpdated: () => void;
}

export const EditBalanceModal = ({
    isOpen,
    onClose,
    accountId,
    accountName,
    currentBalance,
    currency,
    hasManualBalance,
    onBalanceUpdated
}: EditBalanceModalProps) => {
    const { t } = useTranslation();
    const [balance, setBalance] = useState((currentBalance / 100).toFixed(2));
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const balanceInCents = Math.round(parseFloat(balance) * 100);
            await window.api.setAccountManualBalance(accountId, balanceInCents, date);
            toast.success(t('accounts.balanceUpdated'));
            onBalanceUpdated();
            onClose();
        } catch (error) {
            console.error('Failed to update balance:', error);
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = async () => {
        setIsLoading(true);
        try {
            await window.api.setAccountManualBalance(accountId, null, date);
            toast.success(t('accounts.balanceUpdated'));
            onBalanceUpdated();
            onClose();
        } catch (error) {
            console.error('Failed to clear manual balance:', error);
            toast.error(t('common.error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background-card rounded-xl shadow-2xl w-full max-w-md mx-4 border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                        {t('accounts.editBalance')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-background-muted rounded-lg transition-colors"
                    >
                        <X size={20} className="text-foreground-muted" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm text-foreground-muted mb-1">{t('common.account')}</p>
                        <p className="font-medium text-foreground">{accountName}</p>
                    </div>

                    {hasManualBalance && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                {t('accounts.manualBalanceWarning')}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('accounts.manualBalance')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0.00"
                        />
                        <p className="text-xs text-foreground-muted mt-1">
                            {t('accounts.calculatedBalance')}: {(currentBalance / 100).toFixed(2)} {currency}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            {t('common.date')}
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    {hasManualBalance && (
                        <button
                            onClick={handleClear}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-muted rounded-lg transition-colors disabled:opacity-50"
                        >
                            {t('accounts.clearManualBalance')}
                        </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-background-muted rounded-lg transition-colors disabled:opacity-50"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
