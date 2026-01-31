import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { PiggyBank, Plus, Building, Calendar, RefreshCw, TrendingUp, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { useFormatDate } from '../../hooks/useFormatDate';
import { useNetWorth } from '../../hooks/useNetWorth';
import { AddDepositModal } from './AddDepositModal';
import { DepositAccount } from '../../../@my-wealth/shared/schemas';
import { Card, EmptyState } from '../ui';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/utils';

export function DepositDashboard() {
    const { deposits, brokers, refreshData, isLoading } = useVaultStore();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();
    const { baseCurrency } = useNetWorth();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDeposit, setEditingDeposit] = useState<DepositAccount | null>(null);

    // Calculations
    const metrics = useMemo(() => {
        const totalPrincipal = deposits.reduce((sum, d) => sum + d.principal, 0);
        // Simple interest estimation for total interest (just summing up hypothetical interest for dashboard)
        // This is decorative if we don't have exact accrued interest tracked
        const totalInterest = deposits.reduce((sum, d) => sum + (d.principal * (d.netRate / 100)), 0);
        return {
            totalPrincipal,
            totalInterest,
            count: deposits.length
        };
    }, [deposits]);

    const getBrokerName = (brokerId?: string) => {
        if (!brokerId) return t('deposits.noBroker');
        const broker = brokers.find(b => b.id === brokerId);
        return broker ? broker.name : t('deposits.noBroker');
    };

    // Polyfill or import getDaysRemaining if it's missing
    const getDaysRemaining = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };



    const handleCloseModal = () => {
        setIsAddModalOpen(false);
        setEditingDeposit(null);
    };

    if (!deposits.length) {
        return (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
                <EmptyState
                    icon={PiggyBank}
                    title={t('deposits.startTracking')}
                    description={t('deposits.trackDescription')}
                    action={{
                        label: t('deposits.addDeposit'),
                        onClick: () => setIsAddModalOpen(true)
                    }}
                />
                <AddDepositModal isOpen={isAddModalOpen} onClose={handleCloseModal} />
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-card-gap overflow-y-auto">
            <div className="px-card-p">
                {/* Header */}
                <PageHeader
                    title={t('deposits.title')}
                    description={t('deposits.subtitle')}
                    icon={PiggyBank}
                    iconClassName="text-indigo-500"
                    actions={
                        <>
                            <button
                                onClick={() => refreshData()}
                                className="btn btn-ghost flex items-center gap-1"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
                                <Plus className="w-4 h-4 mr-2" />
                                {t('deposits.addDeposit')}
                            </button>
                        </>
                    }
                />
            </div>

            <div className="p-card-p">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    <div className="card p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <PiggyBank className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('deposits.totalPrincipal')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate" title={formatMoney(metrics.totalPrincipal, baseCurrency)}>
                            {formatMoney(metrics.totalPrincipal, baseCurrency)}
                        </p>
                    </div>

                    <div className="card p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('deposits.totalInterest')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate" title={formatMoney(metrics.totalInterest, baseCurrency)}>
                            {formatMoney(metrics.totalInterest, baseCurrency)}
                        </p>
                    </div>

                    <div className="card p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-indigo-500/10">
                                <Building className="w-5 h-5 text-indigo-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('deposits.activeDeposits')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate">
                            {deposits.length}
                        </p>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-4">
                    <Info className="w-6 h-6 text-blue-500 shrink-0" />
                    <div>
                        <h4 className="font-medium text-blue-500 text-sm mb-1">{t('deposits.disclaimerTitle')}</h4>
                        <p className="text-sm text-foreground-muted leading-relaxed">
                            {t('deposits.disclaimerText')}
                        </p>
                    </div>
                </div>

                {/* Deposits Grid */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    {deposits.map(deposit => {
                        const daysRemaining = getDaysRemaining(deposit.maturityDate);
                        const isMatured = daysRemaining <= 0;

                        return (
                            <div
                                key={deposit.id}
                                onClick={() => setEditingDeposit(deposit)}
                                className={cn(
                                    "card p-card-p cursor-pointer hover:shadow-md transition-all border-l-4",
                                    isMatured ? "border-l-emerald-500" : "border-l-blue-500"
                                )}
                            >
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
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider",
                                                deposit.constraintType === 'free' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    deposit.constraintType === 'locked' ? 'bg-rose-500/10 text-rose-500' :
                                                        'bg-amber-500/10 text-amber-500'
                                            )}>
                                                {t(`deposits.constraintTypes.${deposit.constraintType}`)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center text-right border-t border-border pt-4">
                                    <div>
                                        <div className="font-bold text-xl text-foreground">
                                            {formatMoney(deposit.principal, deposit.currency)}
                                        </div>
                                        <div className="text-sm font-semibold text-emerald-500">
                                            {deposit.netRate.toFixed(2)}% {t('deposits.net')}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Info Row */}
                                <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-4 text-sm">
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
                        );
                    })}
                </div>
            </div >

            <AddDepositModal
                isOpen={isAddModalOpen}
                onClose={handleCloseModal}
                initialData={editingDeposit}
            />
        </div >
    );
}
