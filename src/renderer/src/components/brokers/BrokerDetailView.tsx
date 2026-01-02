
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Trash2,
    PieChart,
    TrendingUp,
    Wallet,
    Pencil,
    PiggyBank,
    CreditCard,
    Banknote
} from 'lucide-react';
import { toast } from 'sonner';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { AddBrokerModal } from './AddBrokerModal';
import { EditBalanceModal } from '../accounts/EditBalanceModal';
import { cn } from '../../lib/utils';
import { ICON_MAP } from '../../lib/iconMap';

// Imports for Modals
import ImportModal from '../ImportModal';
import { AddInvestmentModal } from '../investments/AddInvestmentModal';
import { AddDepositModal } from '../deposits/AddDepositModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Upload } from 'lucide-react';

interface BrokerDetailViewProps {
    brokerId: string;
}

export const BrokerDetailView = ({ brokerId }: BrokerDetailViewProps) => {
    const { t } = useTranslation();
    const getBroker = useVaultStore(state => state.getBroker);
    const accounts = useVaultStore(state => state.accounts);
    const holdings = useVaultStore(state => state.holdings);
    const assets = useVaultStore(state => state.assets);
    const deposits = useVaultStore(state => state.deposits);
    const accountBalances = useVaultStore(state => state.accountBalances);
    const deleteBroker = useVaultStore(state => state.deleteBroker);
    const refreshData = useVaultStore(state => state.refreshData);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const vaultPath = useVaultStore(state => state.vaultPath);
    const formatMoney = useFormatMoney();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Action Modals State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editBalanceAccountId, setEditBalanceAccountId] = useState<string | null>(null);

    const broker = getBroker(brokerId);

    if (!broker) {
        return (
            <div className="flex items-center justify-center h-full text-foreground-muted">
                {t('brokers.notFound', 'Broker not found')}
            </div>
        );
    }

    // Filter accounts, holdings, and deposits for this broker
    const brokerAccounts = Array.from(accounts.values()).filter(a => a.brokerId === brokerId);
    const brokerDeposits = deposits.filter(d => d.brokerId === brokerId);

    // Holdings can be linked directly to broker OR via account linked to broker
    // Logic: 
    // 1. Get holdings where holding.brokerId === brokerId
    // 2. OR holdings where holding.accountId belongs to this broker
    const brokerAccountIds = new Set(brokerAccounts.map(a => a.id));
    const brokerHoldings = holdings.filter(h =>
        h.brokerId === brokerId || (h.accountId && brokerAccountIds.has(h.accountId))
    );

    // Calculate totals
    const cashTotal = brokerAccounts.reduce((sum, account) => {
        return sum + (accountBalances[account.id] || 0);
    }, 0);

    const investmentsTotal = brokerHoldings.reduce((sum, holding) => {
        const asset = assets.find(a => a.id === holding.assetId);
        if (!asset?.currentPrice) return sum;
        return sum + (holding.quantity * asset.currentPrice);
    }, 0);

    const depositsTotal = brokerDeposits.reduce((sum, deposit) => {
        return sum + deposit.principal;
    }, 0);

    const totalValue = cashTotal + investmentsTotal + depositsTotal;

    // Removed handleDelete function, logic moved to ConfirmationModal

    return (
        <div className="h-full flex flex-col bg-background-subtle transition-colors">
            {/* Header */}
            <div className="bg-background-card border-b border-border p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={cn(
                                "w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg overflow-hidden",
                                broker.logoPath ? "bg-white p-2" : ""
                            )}
                            style={{ backgroundColor: broker.logoPath ? undefined : broker.color }}
                        >
                            {broker.logoPath && vaultPath ? (
                                <img
                                    src={`file://${vaultPath}/${broker.logoPath}`}
                                    alt={broker.name}
                                    className="w-full h-full object-contain"
                                />
                            ) : (() => {
                                const IconComponent = broker.icon ? ICON_MAP[broker.icon] || Building2 : Building2;
                                return <IconComponent className="w-8 h-8" />;
                            })()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                {broker.name}
                                <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-background-muted text-foreground-muted">
                                    {t(`brokers.types.${broker.type}`, broker.type)}
                                </span>
                            </h1>
                            <p className="text-foreground-muted mt-1">
                                {t('brokers.totalValue')}: <span className="font-semibold text-foreground">{formatMoney(totalValue, 'EUR')}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="p-2 text-foreground-muted hover:text-primary hover:bg-background-muted rounded-lg transition-colors"
                            title={t('common.edit')}
                        >
                            <Pencil size={20} />
                        </button>
                        <button
                            onClick={() => setIsDeleteConfirmOpen(true)} // Modified onClick
                            className="p-2 text-foreground-muted hover:text-red-500 hover:bg-background-muted rounded-lg transition-colors" // Modified hover color
                            title={t('common.delete')}
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Quick Actions Bar */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm font-medium hover:bg-background-muted transition-colors shadow-sm"
                    >
                        <Upload size={16} className="text-blue-500" />
                        {t('import.title')}
                    </button>
                    <button
                        onClick={() => setIsInvestmentModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm font-medium hover:bg-background-muted transition-colors shadow-sm"
                    >
                        <TrendingUp size={16} className="text-purple-500" />
                        {t('investments.addInvestment')}
                    </button>
                    <button
                        onClick={() => setIsDepositModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm font-medium hover:bg-background-muted transition-colors shadow-sm"
                    >
                        <PiggyBank size={16} className="text-emerald-500" />
                        {t('deposits.addDeposit')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-foreground-muted">{t('brokers.cashBalance')}</h3>
                            <p className="text-xl font-bold text-foreground">{formatMoney(cashTotal, 'EUR')}</p>
                        </div>
                    </div>

                    <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-foreground-muted">{t('brokers.investmentsValue')}</h3>
                            <p className="text-xl font-bold text-foreground">{formatMoney(investmentsTotal, 'EUR')}</p>
                        </div>
                    </div>

                    <div className="bg-background-card p-4 rounded-xl shadow-sm border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <PiggyBank size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-foreground-muted">{t('deposits.title')}</h3>
                            <p className="text-xl font-bold text-foreground">{formatMoney(depositsTotal, 'EUR')}</p>
                        </div>
                    </div>
                </div>

                {/* Linked Accounts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Wallet size={20} className="text-foreground-muted" />
                        {t('brokers.linkedAccounts')}
                    </h2>

                    {brokerAccounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {brokerAccounts.map(account => {
                                const AccountIcon = {
                                    'checking': Wallet,
                                    'savings': PiggyBank,
                                    'deposit': PiggyBank,
                                    'credit': CreditCard,
                                    'investment': TrendingUp,
                                    'cash': Banknote,
                                    'loan': Building2,
                                    'other': Wallet
                                }[account.type] || Wallet;

                                return (
                                    <div key={account.id} className="bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-background-subtle text-foreground-muted">
                                                    <AccountIcon size={16} />
                                                </div>
                                                <span className="font-medium text-foreground">{account.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-background-subtle text-foreground-muted">
                                                    {t(`accountTypes.${account.type}`)}
                                                </span>
                                                <button
                                                    onClick={() => setEditBalanceAccountId(account.id)}
                                                    className="p-1 text-foreground-muted hover:text-primary hover:bg-background-muted rounded transition-colors"
                                                    title={t('accounts.editBalance')}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-foreground">
                                            {formatMoney(accountBalances[account.id] || 0, account.currency)}
                                        </p>
                                        {account.manualBalance !== undefined && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                {t('accounts.manualBalance')}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-background-subtle/50">
                            <Wallet className="w-8 h-8 text-foreground-muted mb-2 opacity-50" />
                            <p className="text-foreground-muted italic text-sm text-center">
                                {t('brokers.noAccounts')}<br />
                                <span className="text-xs">
                                    {t('brokers.importHint')}
                                </span>
                            </p>
                        </div>
                    )}
                </div>

                {/* Deposit Accounts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <PiggyBank size={20} className="text-foreground-muted" />
                        {t('deposits.title')}
                    </h2>

                    {brokerDeposits.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {brokerDeposits.map(deposit => (
                                <div key={deposit.id} className="bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                                                <PiggyBank size={16} />
                                            </div>
                                            <span className="font-medium text-foreground">{deposit.name}</span>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                                            {(deposit.grossRate).toFixed(2)}%
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {formatMoney(deposit.principal, deposit.currency)}
                                    </p>
                                    <p className="text-xs text-foreground-muted mt-1">
                                        {t('deposits.maturityDate')}: {new Date(deposit.maturityDate).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-foreground-muted italic text-sm">{t('deposits.noDeposits')}</p>
                    )}
                </div>

                {/* Portfolio / Holdings */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <PieChart size={20} className="text-foreground-muted" />
                        {t('brokers.portfolio')}
                    </h2>

                    {brokerHoldings.length > 0 ? (
                        <div className="bg-background-card rounded-xl shadow-sm border border-border overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-background-subtle text-xs uppercase text-foreground-muted font-medium">
                                    <tr>
                                        <th className="px-6 py-3">{t('investments.symbol')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.quantity')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.price')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.value')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {brokerHoldings.map(holding => {
                                        const asset = assets.find(a => a.id === holding.assetId);
                                        if (!asset) return null;
                                        // TODO: Use real-time price if available, otherwise fallback to something reasonable
                                        const price = asset.currentPrice;
                                        const value = holding.quantity * price;

                                        return (
                                            <tr key={holding.id} className="hover:bg-background-subtle transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{asset.symbol}</div>
                                                    <div className="text-xs text-foreground-muted">{asset.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-foreground font-mono">
                                                    {holding.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-right text-foreground font-mono">
                                                    {formatMoney(price, asset.currency)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-foreground font-mono">
                                                    {formatMoney(value, asset.currency)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-background-subtle/50">
                            <PieChart className="w-8 h-8 text-foreground-muted mb-2 opacity-50" />
                            <p className="text-foreground-muted italic text-sm text-center">
                                {t('brokers.noHoldings')}<br />
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddBrokerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                editBrokerId={brokerId}
            />

            {editBalanceAccountId && (() => {
                const account = accounts.find(a => a.id === editBalanceAccountId);
                if (!account) return null;
                return (
                    <EditBalanceModal
                        isOpen={true}
                        onClose={() => setEditBalanceAccountId(null)}
                        accountId={account.id}
                        accountName={account.name}
                        currentBalance={accountBalances[account.id] || 0}
                        currency={account.currency}
                        hasManualBalance={account.manualBalance !== undefined}
                        onBalanceUpdated={() => {
                            refreshData();
                            setEditBalanceAccountId(null);
                        }}
                    />
                );
            })()}

            {/* Context-Aware Action Modals */}
            {isImportModalOpen && (
                <ImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    preselectedBrokerId={brokerId}
                />
            )}

            {isInvestmentModalOpen && (
                <AddInvestmentModal
                    isOpen={isInvestmentModalOpen}
                    onClose={() => setIsInvestmentModalOpen(false)}
                    preselectedBrokerId={brokerId}
                />
            )}

            {isDepositModalOpen && (
                <AddDepositModal
                    isOpen={isDepositModalOpen}
                    onClose={() => setIsDepositModalOpen(false)}
                    preselectedBrokerId={broker.id} // Modified preselectedBrokerId
                />
            )}

            <ConfirmationModal // Added ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={async () => {
                    await deleteBroker(broker.id); // Changed to deleteBroker from useVaultStore
                    await refreshData();
                    toast.success(t('brokers.deleted', 'Broker deleted successfully'));
                    setActiveView('dashboard');
                }}
                title={t('brokers.deleteTitle', 'Delete Broker')}
                description={t('brokers.confirmDelete', 'Delete this broker and all associated data? This action cannot be undone.')}
                confirmText={t('common.delete')}
                variant="danger"
            />
        </div>
    );
};
