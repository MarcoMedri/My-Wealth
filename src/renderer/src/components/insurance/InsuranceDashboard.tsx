import React, { useState, useMemo } from 'react';
import { useVaultStore } from '../../store/useVaultStore';
import { Shield, Plus, Building, Calendar, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormatMoney } from '../../hooks/useFormatMoney';
import { AddInsuranceModal } from './AddInsuranceModal';
import { useFormatDate } from '../../hooks/useFormatDate';

export function InsuranceDashboard() {
    const { insurance } = useVaultStore();
    const { t } = useTranslation();
    const formatMoney = useFormatMoney();
    const { formatDate } = useFormatDate();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-foreground-subtle animate-in fade-in zoom-in duration-300">
                <div className="bg-success/10 p-6 rounded-full mb-6">
                    <Shield className="w-12 h-12 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{t('insurance.startTracking')}</h2>
                <p className="max-w-md text-foreground-muted mb-8 leading-relaxed">{t('insurance.trackDescription')}</p>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-success text-success-foreground hover:bg-success/90 px-6 py-3 rounded-xl flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-success/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    {t('insurance.addPolicy')}
                </button>
                <AddInsuranceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 overflow-y-auto h-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Shield className="w-8 h-8 text-success" />
                        {t('insurance.title')}
                    </h1>
                    <p className="text-foreground-muted mt-2 text-lg">{t('insurance.subtitle')}</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-success text-success-foreground hover:bg-success/90 px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all hover:shadow-lg hover:shadow-success/20 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    {t('insurance.addPolicy')}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-background-card p-6 rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm">
                    <div className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {t('insurance.totalValue')} ({t('insurance.placeholders.annualized') || 'Annualized'})
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                        {formatMoney(totalAnnualPremium, 'EUR')}
                    </div>
                </div>
                <div className="bg-background-card p-6 rounded-2xl shadow-sm border border-border/50 backdrop-blur-sm">
                    <div className="text-sm font-medium text-foreground-muted mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {t('insurance.policiesCount')}
                    </div>
                    <div className="text-3xl font-bold text-foreground tracking-tight">
                        {insurance.length}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="font-semibold text-foreground-muted uppercase text-xs tracking-wider ml-1">
                    {t('insurance.yourPolicies')}
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {insurance.map(policy => (
                        <div
                            key={policy.id}
                            className="group bg-background-card p-5 rounded-2xl border border-border/50 hover:border-success/30 hover:shadow-md transition-all duration-200"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-success/10 rounded-xl text-success group-hover:scale-110 transition-transform">
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
                                <div className="text-right">
                                    <div className="font-bold text-lg text-foreground">
                                        {formatMoney(policy.premiumAmount, policy.currency)}
                                    </div>
                                    <div className="text-xs text-foreground-muted font-medium uppercase tracking-wide">
                                        {t(`insurance.premiumPeriods.${policy.premiumPeriod}`)}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Info Row */}
                            <div className="mt-4 pt-4 border-t border-border/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                    ))}
                </div>
            </div>

            <AddInsuranceModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
        </div>
    );
}
