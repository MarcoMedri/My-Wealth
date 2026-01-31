import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Shield, Plus, Calendar, RefreshCw, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InsurancePolicy } from '../../../@my-wealth/shared/schemas';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { AddInsuranceModal } from './AddInsuranceModal';
import { useFormatDate } from '../../hooks/useFormatDate';

import { Card, EmptyState } from '../ui';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/utils';

export function InsuranceDashboard() {
    const { insurance, refreshData, isLoading } = useVaultStore();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);

    // Total Premium Calculation (Annualized approximation)
    const totalAnnualPremium = useMemo(() => {
        return insurance.reduce((sum, policy) => {
            let amount = policy.premiumAmount;
            // Normalize to annual if possible, for now just sum raw amounts or handle basic periods
            if (policy.premiumPeriod === 'monthly') amount *= 12;
            if (policy.premiumPeriod === 'semiannual') amount *= 2;
            if (policy.premiumPeriod === 'quarterly') amount *= 4;
            return sum + amount;
        }, 0);
    }, [insurance]);

    if (!insurance.length) {
        return (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
                <EmptyState
                    icon={Shield}
                    title={t('insurance.startTracking')}
                    description={t('insurance.trackDescription')}
                    action={{
                        label: t('insurance.addPolicy'),
                        onClick: () => setIsAddModalOpen(true)
                    }}
                />
                <AddInsuranceModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingPolicy(null); }} initialData={editingPolicy} />
            </Card>
        );
    }

    return (
        <div className="h-full flex flex-col space-y-card-gap overflow-y-auto">
            <div className="px-card-p">
                {/* Header */}
                <PageHeader
                    title={t('insurance.title')}
                    description={t('insurance.subtitle')}
                    icon={Shield}
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
                                {t('insurance.addPolicy')}
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
                            <div className="p-2 rounded-lg bg-rose-500/10">
                                <Shield className="w-5 h-5 text-rose-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('insurance.totalPremium')}</p>
                        </div>
                        <p className="text-2xl font-bold text-foreground tracking-tight truncate" title={formatMoney(totalAnnualPremium, insurance[0]?.currency || 'EUR')}> {/* Replaced metrics.totalPremium and baseCurrency with existing logic */}
                            {formatMoney(totalAnnualPremium, insurance[0]?.currency || 'EUR')} <span className="text-sm font-normal text-foreground-muted">/ {t('common.year')}</span> {/* Replaced metrics.totalPremium and baseCurrency with existing logic */}
                        </p>
                    </div>

                    <div className="card p-card-p">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Shield className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-sm font-medium text-foreground-muted truncate">{t('insurance.activePolicies')}</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-foreground tracking-tight truncate">
                                {insurance.length} {/* Replaced metrics.activePolicies with existing logic */}
                            </p>
                            <p className="text-sm text-foreground-muted">
                                {t('common.of')} {insurance.length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Policies Grid */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
                    {insurance.map(policy => {
                        const daysRemaining = 0; // Fixed calculation in future if needed
                        const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
                        const isExpired = daysRemaining < 0;

                        return (
                            <div
                                key={policy.id}
                                onClick={() => { setEditingPolicy(policy); setIsAddModalOpen(true); }}
                                className={cn(
                                    "card p-card-p cursor-pointer hover:shadow-md transition-all border-l-4 group relative overflow-hidden",
                                    isExpired ? "border-l-foreground-muted opacity-75" :
                                        isExpiringSoon ? "border-l-amber-500" :
                                            "border-l-emerald-500"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-500 group-hover:scale-110 transition-transform">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-foreground text-lg">{policy.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-foreground-muted mt-1">
                                            {policy.provider && (
                                                <span className="flex items-center gap-1 bg-background-subtle px-2 py-0.5 rounded-md">
                                                    <Building className="w-3 h-3" />
                                                    {policy.provider}
                                                </span>
                                            )}
                                            {policy.nextPaymentDate && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {t('insurance.placeholders.next') || 'Next'}: {formatDate(policy.nextPaymentDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center text-right border-t border-border pt-4">
                                    <div className="text-left">
                                        <div className="text-xs text-foreground-muted font-medium uppercase tracking-wide">
                                            {t(`insurance.premiumPeriods.${policy.premiumPeriod}`)}
                                        </div>
                                    </div>
                                    <div className="font-bold text-lg text-foreground">
                                        {formatMoney(policy.premiumAmount, policy.currency)}
                                    </div>
                                </div>

                                {/* Detailed Info Row */}
                                <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 gap-4 text-sm">
                                    {policy.coverageAmount && (
                                        <div>
                                            <span className="text-foreground-muted block text-xs mb-0.5">{t('insurance.coverageLimit')}</span>
                                            <span className="font-medium text-foreground">{formatMoney(policy.coverageAmount, policy.currency)}</span>
                                        </div>
                                    )}
                                    {policy.deductible && (
                                        <div>
                                            <span className="text-foreground-muted block text-xs mb-0.5">{t('insurance.deductible')}</span>
                                            <span className="font-medium text-foreground">{formatMoney(policy.deductible, policy.currency)}</span>
                                        </div>
                                    )}
                                    {policy.contactInfo && (
                                        <div className="col-span-2">
                                            <span className="text-foreground-muted block text-xs mb-0.5">{t('insurance.contactInfo')}</span>
                                            <span className="font-medium text-foreground">{policy.contactInfo}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div >

            <AddInsuranceModal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); setEditingPolicy(null); }}
                initialData={editingPolicy}
            />
        </div >
    );
}
