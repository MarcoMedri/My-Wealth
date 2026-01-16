import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { PiggyBank, Plus, Building, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useFormatDate } from '../../hooks/useFormatDate';
import { AddDepositModal } from './AddDepositModal';
import { DepositAccount } from '../../../../shared/schemas';

export function DepositDashboard() {
    const { deposits, brokers } = useVaultStore();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDeposit, setEditingDeposit] = useState<DepositAccount | null>(null);

    // Calculations
    const totalPrincipal = useMemo(() => {
        return deposits.reduce((sum, d) => sum + d.principal, 0);
    }, [deposits]);

    const averageNetRate = useMemo(() => {
        if (deposits.length === 0) return 0;
        const weightedSum = deposits.reduce((sum, d) => sum + (d.netRate * d.principal), 0);
        return weightedSum / totalPrincipal;
    }, [deposits, totalPrincipal]);

    const getBrokerName = (brokerId?: string) => {
        if (!brokerId) return t('deposits.noBroker');
        const broker = brokers.find(b => b.id === brokerId);
        return broker ? broker.name : t('deposits.noBroker');
    };

    const handleEdit = (deposit: DepositAccount) => {
        setEditingDeposit(deposit);
        setIsAddModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingDeposit(null);
    };

    if (!deposits.length) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-foreground-subtle animate-in fade-in zoom-in duration-300">
                <div className="bg-primary/10 p-6 rounded-full mb-6">
                    <PiggyBank className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t('deposits.startTracking')}</h2>
                <p className="max-w-md text-foreground-muted mb-8 leading-relaxed">{t('deposits.trackDescription')}</p>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 py-3 rounded-xl flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    {t('deposits.addDeposit')}
                </button>
                <AddDepositModal isOpen={isAddModalOpen} onClose={handleCloseModal} />
            </div>
        );
    }

    return (
        <div className="p-card-p space-y-card-gap overflow-y-auto h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <PiggyBank className="w-8 h-8 text-primary" />
                        {t('deposits.title')}
                    </h1>
                    <p className="text-foreground-muted mt-2 text-lg">{t('deposits.subtitle')}</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    {t('deposits.addDeposit')}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                <div className="bg-background-card p-card-p rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm">
                    <div className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                        <PiggyBank className="w-4 h-4" />
                        {t('deposits.totalValue')}
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                        {formatMoney(totalPrincipal, 'EUR')}
                    </div>
                </div>
                <div className="bg-background-card p-card-p rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm">
                    <div className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        {t('deposits.netRate')} ({t('deposits.weightedAvg')})
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                        {averageNetRate.toFixed(2)}%
                    </div>
                </div>
                <div className="bg-background-card p-card-p rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm">
                    <div className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {t('deposits.depositsCount')}
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                        {deposits.length}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="font-semibold text-foreground-muted uppercase text-xs tracking-wider ml-1">
                    {t('deposits.yourDeposits')}
                </h3>

                <div className="grid grid-cols-1 gap-card-gap">
                    {deposits.map(deposit => (
                        <div
                            key={deposit.id}
                            onClick={() => handleEdit(deposit)}
                            className="group bg-background-card p-card-p rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                        <PiggyBank className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground text-lg">{deposit.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-foreground-muted mt-1">
                                            <span className="flex items-center gap-1 bg-background-subtle px-2 py-0.5 rounded-md">
                                                <Building className="w-3 h-3" />
                                                {getBrokerName(deposit.brokerId)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(deposit.maturityDate)}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${deposit.constraintType === 'free' ? 'bg-success/10 text-success' :
                                                deposit.constraintType === 'locked' ? 'bg-error/10 text-error' :
                                                    'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                {t(`deposits.constraintTypes.${deposit.constraintType}`)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-xl text-foreground">
                                        {formatMoney(deposit.principal, deposit.currency)}
                                    </div>
                                    <div className="text-sm font-semibold text-success">
                                        {deposit.netRate.toFixed(2)}% {t('deposits.net')}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Info Row */}
                            <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-foreground-muted block text-xs mb-0.5">{t('deposits.grossRate')}</span>
                                    <span className="font-medium text-foreground">{deposit.grossRate.toFixed(2)}%</span>
                                </div>
                                <div>
                                    <span className="text-foreground-muted block text-xs mb-0.5">{t('deposits.interestPeriodicity')}</span>
                                    <span className="font-medium text-foreground">{t(`deposits.interestPeriodicityTypes.${deposit.interestPeriodicity}`)}</span>
                                </div>
                                <div>
                                    <span className="text-foreground-muted block text-xs mb-0.5">{t('deposits.activationDate')}</span>
                                    <span className="font-medium text-foreground">{formatDate(deposit.activationDate)}</span>
                                </div>
                                <div>
                                    <span className="text-foreground-muted block text-xs mb-0.5">{t('deposits.duration')}</span>
                                    <span className="font-medium text-foreground">{deposit.durationMonths} {t('common.months')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AddDepositModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                initialData={editingDeposit}
            />
        </div>
    );
}
