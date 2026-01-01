
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Trash2,
    PieChart,
    TrendingUp,
    Wallet,
    Pencil
} from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { AddBrokerModal } from './AddBrokerModal';

interface BrokerDetailViewProps {
    brokerId: string;
}

export const BrokerDetailView: React.FC<BrokerDetailViewProps> = ({ brokerId }) => {
    const { t } = useTranslation();
    const getBroker = useVaultStore(state => state.getBroker);
    const accounts = useVaultStore(state => state.accounts);
    const holdings = useVaultStore(state => state.holdings);
    const assets = useVaultStore(state => state.assets);
    const accountBalances = useVaultStore(state => state.accountBalances);
    const deleteBroker = useVaultStore(state => state.deleteBroker);
    const formatMoney = useFormatMoney();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const broker = getBroker(brokerId);

    if (!broker) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                {t('brokers.notFound', 'Broker not found')}
            </div>
        );
    }

    // Filter accounts and holdings for this broker
    const brokerAccounts = accounts.filter(a => a.brokerId === brokerId);

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

    const totalValue = cashTotal + investmentsTotal;

    const handleDelete = async () => {
        if (confirm(t('brokers.deleteConfirm', 'Are you sure you want to delete this broker? Accounts and holdings will be unlinked (not deleted).'))) {
            await deleteBroker(broker.id);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl shadow-lg"
                        style={{ backgroundColor: broker.color }}
                    >
                        {broker.icon ? <span>{broker.icon}</span> : <Building2 />}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {broker.name}
                            <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {t(`brokers.types.${broker.type}`, broker.type)}
                            </span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {t('brokers.totalValue')}: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(totalValue, 'EUR')}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg transition-colors"
                        title={t('common.edit')}
                    >
                        <Pencil size={20} />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-gray-400 dark:hover:text-red-400 rounded-lg transition-colors"
                        title={t('common.delete')}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('brokers.cashBalance')}</h3>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(cashTotal, 'EUR')}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('brokers.investmentsValue')}</h3>
                            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatMoney(investmentsTotal, 'EUR')}</p>
                        </div>
                    </div>
                </div>

                {/* Linked Accounts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Wallet size={20} className="text-gray-500" />
                        {t('brokers.linkedAccounts')}
                    </h2>

                    {brokerAccounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {brokerAccounts.map(account => (
                                <div key={account.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{account.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                                            {t(`accountTypes.${account.type}`)}
                                        </span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        {formatMoney(accountBalances[account.id] || 0, account.currency)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic text-sm">{t('brokers.noAccounts')}</p>
                    )}
                </div>

                {/* Portfolio / Holdings */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <PieChart size={20} className="text-gray-500" />
                        {t('brokers.portfolio')}
                    </h2>

                    {brokerHoldings.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-3">{t('investments.symbol')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.quantity')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.price')}</th>
                                        <th className="px-6 py-3 text-right">{t('investments.value')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {brokerHoldings.map(holding => {
                                        const asset = assets.find(a => a.id === holding.assetId);
                                        if (!asset) return null;
                                        const value = holding.quantity * asset.currentPrice;

                                        return (
                                            <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{asset.symbol}</div>
                                                    <div className="text-xs text-gray-500">{asset.name}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-mono">
                                                    {holding.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300 font-mono">
                                                    {formatMoney(asset.currentPrice, asset.currency)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-gray-100 font-mono">
                                                    {formatMoney(value, asset.currency)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic text-sm">{t('brokers.noHoldings')}</p>
                    )}
                </div>
            </div>

            {/* Edit Modal (Reuse AddBrokerModal) */}
            {isEditModalOpen && (
                <AddBrokerModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    editBrokerId={brokerId}
                />
            )}
        </div>
    );
};
