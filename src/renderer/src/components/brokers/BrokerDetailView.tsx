
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
    Banknote,
    Upload,
    Plus,
    Archive
} from 'lucide-react';
import { toast } from 'sonner';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { AddBrokerModal } from './AddBrokerModal';
import { EditBalanceModal } from '../accounts/EditBalanceModal';
import { cn } from '../../lib/utils';
import { ICON_MAP } from '../../lib/iconMap';

import AddAccountModal from '../AddAccountModal';
import ImportModal from '../ImportModal';
import { AddInvestmentModal } from '../investments/AddInvestmentModal';
import { AddDepositModal } from '../deposits/AddDepositModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { CloseDeleteAccountModal } from '../accounts/CloseDeleteAccountModal';
import type { Account, DepositAccount, AccountType } from '../../../../shared/schemas';
import AddTransactionModal from '../AddTransactionModal';
import { EditHoldingModal } from '../investments/EditHoldingModal';
import type { Holding, Asset } from '../../../../shared/schemas';

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
    const transactions = useVaultStore(state => state.transactions);
    const accountBalances = useVaultStore(state => state.accountBalances);
    const deleteBroker = useVaultStore(state => state.deleteBroker);
    const refreshData = useVaultStore(state => state.refreshData);
    const setActiveView = useVaultStore(state => state.setActiveView);
    const vaultPath = useVaultStore(state => state.vaultPath);
    const formatMoney = useFormatMoney();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Action Modals State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<Account | undefined>(undefined);
    const [selectedDeposit, setSelectedDeposit] = useState<DepositAccount | undefined>(undefined);
    const [addAccountType, setAddAccountType] = useState<AccountType | undefined>(undefined);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [editBalanceAccountId, setEditBalanceAccountId] = useState<string | null>(null);

    // Edit Holding State
    const [editingItem, setEditingItem] = useState<{ holding: Holding, asset: Asset } | null>(null);

    // Account Archive/Delete State
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    const [isCloseDeleteModalOpen, setIsCloseDeleteModalOpen] = useState(false);
    const [depositToDelete, setDepositToDelete] = useState<DepositAccount | null>(null);
    const [isDepositDeleteConfirmOpen, setIsDepositDeleteConfirmOpen] = useState(false);
    const [isArchiveDeleteConfirmOpen, setIsArchiveDeleteConfirmOpen] = useState(false);

    const deleteAccount = useVaultStore(state => state.deleteAccount);
    const deleteDeposit = useVaultStore(state => state.deleteDeposit);

    const broker = getBroker(brokerId);

    if (!broker) {
        return (
            <div className="flex items-center justify-center h-full text-foreground-muted">
                {t('brokers.notFound', 'Broker not found')}
            </div>
        );
    }

    // Filter accounts, holdings, and deposits for this broker
    // Filter accounts, holdings, and deposits for this broker
    const allBrokerAccounts = Array.from(accounts.values()).filter(a => a.brokerId === brokerId);

    const securitiesAccounts = allBrokerAccounts.filter(a => !a.isArchived && a.type === 'investment');
    const cashAccounts = allBrokerAccounts.filter(a => !a.isArchived && a.type !== 'investment');
    const archivedAccounts = allBrokerAccounts.filter(a => a.isArchived);

    const brokerDeposits = deposits.filter(d => d.brokerId === brokerId);

    // Holdings can be linked directly to broker OR via account linked to broker
    // Logic: 
    // 1. Get holdings where holding.brokerId === brokerId
    // 2. OR holdings where holding.accountId belongs to this broker
    const brokerAccountIds = new Set(allBrokerAccounts.map(a => a.id));
    const brokerHoldings = holdings.filter(h =>
        h.brokerId === brokerId || (h.accountId && brokerAccountIds.has(h.accountId))
    );

    // Calculate totals
    const cashTotal = cashAccounts.reduce((sum, account) => {
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
                            {broker.logoPath ? (
                                <img
                                    src={broker.logoPath.startsWith('asset://')
                                        ? broker.logoPath
                                        : `file://${vaultPath}/${broker.logoPath}`}
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
                        onClick={() => setIsTransactionModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm font-medium hover:bg-background-muted transition-colors shadow-sm"
                    >
                        <Plus size={16} className="text-emerald-500" />
                        {t('transactions.addTransaction')}
                    </button>
                    <button
                        onClick={() => setIsInvestmentModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-background text-foreground border border-border rounded-lg text-sm font-medium hover:bg-background-muted transition-colors shadow-sm"
                    >
                        <TrendingUp size={16} className="text-purple-500" />
                        {t('investments.addInvestment')}
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

                {/* Securities Accounts (Conto Titoli) */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <TrendingUp size={20} className="text-foreground-muted" />
                        {t('brokers.securitiesAccounts', 'Conti Titoli')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {securitiesAccounts.map(account => (
                            <div
                                key={account.id}
                                className="cursor-pointer bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
                                onClick={() => { setSelectedAccount(account); setIsAccountModalOpen(true); }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                                            <TrendingUp size={16} />
                                        </div>
                                        <span className="font-medium text-foreground">{account.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAccountToDelete(account);
                                                setIsCloseDeleteModalOpen(true);
                                            }}
                                            className="p-1 text-foreground-muted hover:text-red-500 hover:bg-background-muted rounded transition-colors"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={14} />
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
                        ))}
                        <AddCard
                            onClick={() => { setSelectedAccount(undefined); setAddAccountType('investment'); setIsAccountModalOpen(true); }}
                            title={t('accounts.addSecuritiesAccount', 'Aggiungi Conto Titoli')}
                            description={t('accounts.addSecuritiesAccountDesc', 'Per investimenti (ETF, Azioni, ecc)')}
                            icon={Plus}
                        />
                    </div>
                </div>

                {/* Cash & Other Accounts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Wallet size={20} className="text-foreground-muted" />
                        {t('brokers.cashAccounts', 'Conti Cash')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cashAccounts.map(account => {
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
                                <div
                                    key={account.id}
                                    className="cursor-pointer bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
                                    onClick={() => { setSelectedAccount(account); setIsAccountModalOpen(true); }}
                                >
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAccountToDelete(account);
                                                    setIsCloseDeleteModalOpen(true);
                                                }}
                                                className="p-1 text-foreground-muted hover:text-red-500 hover:bg-background-muted rounded transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={14} />
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
                        <AddCard
                            onClick={() => { setSelectedAccount(undefined); setAddAccountType('checking'); setIsAccountModalOpen(true); }}
                            title={t('accounts.addAccount')}
                            description={t('accounts.addAccountDesc', 'Crea un nuovo conto')}
                            icon={Plus}
                        />
                    </div>
                </div>



                {/* Deposit Accounts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <PiggyBank size={20} className="text-foreground-muted" />
                        {t('deposits.title')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {brokerDeposits.map(deposit => (
                            <div
                                key={deposit.id}
                                className="group/card relative cursor-pointer bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
                                onClick={() => { setSelectedDeposit(deposit); setIsDepositModalOpen(true); }}
                            >
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
                                <div className="absolute top-4 right-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDepositToDelete(deposit);
                                            setIsDepositDeleteConfirmOpen(true);
                                        }}
                                        className="p-1 text-foreground-muted hover:text-red-500 hover:bg-background-muted rounded transition-colors"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-2xl font-bold text-foreground">
                                    {formatMoney(deposit.principal, deposit.currency)}
                                </p>
                                <p className="text-xs text-foreground-muted mt-1">
                                    {t('deposits.maturityDate')}: {new Date(deposit.maturityDate).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                        <AddCard
                            onClick={() => { setSelectedDeposit(undefined); setIsDepositModalOpen(true); }}
                            title={t('deposits.addDeposit')}
                            description={t('deposits.addDepositDesc', 'Crea un conto deposito')}
                            icon={Plus}
                        />
                    </div>
                </div>

                {/* Portfolio / Holdings */}
                {brokerHoldings.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <PieChart size={20} className="text-foreground-muted" />
                            {t('brokers.portfolio')}
                        </h2>

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
                                            <tr
                                                key={holding.id}
                                                className="hover:bg-background-subtle transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setEditingItem({ holding, asset });
                                                }}
                                            >
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
                    </div>
                )}

                {/* Archived Accounts */}
                {archivedAccounts.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <h2 className="text-lg font-semibold text-foreground-muted flex items-center gap-2 grayscale opacity-70">
                            <Archive size={20} />
                            {t('brokers.archivedAccounts', 'Conti Chiusi')}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 grayscale opacity-70">
                            {archivedAccounts.map(account => (
                                <div
                                    key={account.id}
                                    className="cursor-pointer bg-background-card p-4 rounded-xl shadow-sm border border-border hover:shadow-md transition-shadow"
                                    onClick={() => { setSelectedAccount(account); setIsAccountModalOpen(true); }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-background-subtle text-foreground-muted">
                                                <Archive size={16} />
                                            </div>
                                            <span className="font-medium text-foreground">{account.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAccountToDelete(account);
                                                    setIsArchiveDeleteConfirmOpen(true);
                                                }}
                                                className="p-1 text-foreground-muted hover:text-red-500 hover:bg-background-muted rounded transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {formatMoney(accountBalances[account.id] || 0, account.currency)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddBrokerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                editBrokerId={brokerId}
            />

            {editBalanceAccountId && (
                <EditBalanceModal
                    isOpen={true}
                    onClose={() => setEditBalanceAccountId(null)}
                    accountId={editBalanceAccountId}
                    accountName={accounts.find(a => a.id === editBalanceAccountId)?.name || ''}
                    currentBalance={accountBalances[editBalanceAccountId] || 0}
                    currency={accounts.find(a => a.id === editBalanceAccountId)?.currency || 'EUR'}
                    hasManualBalance={accounts.find(a => a.id === editBalanceAccountId)?.manualBalance !== undefined}
                    onBalanceUpdated={() => {
                        refreshData();
                        setEditBalanceAccountId(null);
                    }}
                />
            )}

            {/* Context-Aware Action Modals */}
            {
                isImportModalOpen && (
                    <ImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        preselectedBrokerId={brokerId}
                    />
                )
            }

            {
                isInvestmentModalOpen && (
                    <AddInvestmentModal
                        isOpen={isInvestmentModalOpen}
                        onClose={() => setIsInvestmentModalOpen(false)}
                        preselectedBrokerId={brokerId}
                    />
                )
            }

            {
                isDepositModalOpen && (
                    <AddDepositModal
                        isOpen={isDepositModalOpen}
                        onClose={() => { setIsDepositModalOpen(false); setTimeout(() => setSelectedDeposit(undefined), 300); }}
                        preselectedBrokerId={broker.id}
                        initialData={selectedDeposit}
                    />
                )
            }

            {
                isTransactionModalOpen && (
                    <AddTransactionModal
                        isOpen={isTransactionModalOpen}
                        onClose={() => setIsTransactionModalOpen(false)}
                        limitToBrokerId={brokerId}
                    />
                )
            }

            {
                isAccountModalOpen && (
                    <AddAccountModal
                        isOpen={isAccountModalOpen}
                        onClose={() => { setIsAccountModalOpen(false); setTimeout(() => setSelectedAccount(undefined), 300); }}
                        preselectedBrokerId={brokerId}
                        initialData={selectedAccount}
                        defaultType={addAccountType}
                    />
                )
            }

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

            {/* Account Close/Delete Modal */}
            <CloseDeleteAccountModal
                isOpen={isCloseDeleteModalOpen}
                onClose={() => {
                    setIsCloseDeleteModalOpen(false);
                    setAccountToDelete(null);
                }}
                onCloseAccount={async () => {
                    if (accountToDelete) {
                        try {
                            // Archive the account using window.api directly as store doesn't expose generic update
                            await window.api.saveAccount({ ...accountToDelete, isArchived: true });
                            toast.success(t('accounts.archivedSuccess', 'Account archived'));
                            await refreshData();
                        } catch (err) {
                            toast.error(t('accounts.archiveError', 'Failed to archive account'));
                            console.error(err);
                        }
                    }
                    setIsCloseDeleteModalOpen(false);
                }}
                onDeleteAccount={async () => {
                    if (accountToDelete) {
                        await deleteAccount(accountToDelete.id);
                        refreshData();
                    }
                    setIsCloseDeleteModalOpen(false);
                }}
                accountName={accountToDelete?.name || ''}
                hasTransactions={accountToDelete ? Array.from(transactions.values()).some(t => t.accountId === accountToDelete.id) : false}
            />

            {/* Archive Delete Confirmation */}
            <ConfirmationModal
                isOpen={isArchiveDeleteConfirmOpen}
                onClose={() => setIsArchiveDeleteConfirmOpen(false)}
                onConfirm={async () => {
                    if (accountToDelete) {
                        await deleteAccount(accountToDelete.id);
                        await refreshData();
                        toast.success(t('accounts.accountDeleted', 'Account deleted'));
                    }
                    setIsArchiveDeleteConfirmOpen(false);
                }}
                title={t('accounts.deleteAccount', 'Delete Account')}
                description={t('accounts.deleteAccountWarning', 'WARNING: All associated transactions will be permanently deleted.')}
                confirmText={t('common.delete')}
                variant="danger"
            />

            {/* Deposit Delete Confirmation */}
            <ConfirmationModal
                isOpen={isDepositDeleteConfirmOpen}
                onClose={() => setIsDepositDeleteConfirmOpen(false)}
                onConfirm={async () => {
                    if (depositToDelete) {
                        await deleteDeposit(depositToDelete.id);
                        await refreshData();
                        toast.success(t('deposits.deleted', 'Deposit deleted'));
                    }
                    setIsDepositDeleteConfirmOpen(false);
                }}
                title={t('deposits.deleteTitle', 'Delete Deposit Account')}
                description={t('common.confirmDelete', 'Are you sure?')}
                confirmText={t('common.delete')}
                variant="danger"
            />
            {/* Edit Holding Modal */}
            {editingItem && (
                <EditHoldingModal
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    holding={editingItem.holding}
                    asset={editingItem.asset}
                />
            )}
        </div >
    );
};

interface AddCardProps {
    onClick: () => void;
    title: string;
    description: string;
    icon: React.ElementType;
    className?: string;
}

function AddCard({ onClick, title, description, icon: Icon, className }: AddCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex items-center gap-4 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-left",
                className
            )}
        >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                <Icon size={24} />
            </div>
            <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-foreground-muted">
                    {description}
                </p>
            </div>
        </button>
    );
}


