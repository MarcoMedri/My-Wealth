import React, { useState } from 'react';
import { Loader2, AlertTriangle, Shield, Calendar, DollarSign, FileText } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { InsurancePolicy } from '../../../../shared/schemas';

interface AddInsuranceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddInsuranceModal({ isOpen, onClose }: AddInsuranceModalProps) {
    const { accounts, saveInsurance, refreshData } = useVaultStore();
    const { t } = useTranslation();

    // Identity
    const [name, setName] = useState('');
    const [provider, setProvider] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    // Type
    const [type, setType] = useState('life'); // default

    // Economics
    const [premiumAmount, setPremiumAmount] = useState('');
    const [premiumPeriod, setPremiumPeriod] = useState<InsurancePolicy['premiumPeriod']>('annual');
    const [nextPaymentDate, setNextPaymentDate] = useState('');
    const [accountId, setAccountId] = useState('');

    // Coverage
    const [coverageAmount, setCoverageAmount] = useState('');
    const [deductible, setDeductible] = useState('');
    const [insuredEntity, setInsuredEntity] = useState('');

    // Timeline
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [autoRenewal, setAutoRenewal] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Helper for robust ISO conversion to avoid timezone shifts
    const toFullISO = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        // Set to noon UTC to avoid day shifts when parsing date-only strings
        return new Date(`${dateStr}T12:00:00Z`).toISOString();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !premiumAmount) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const policy: InsurancePolicy = {
                id: crypto.randomUUID(),
                name,
                provider: provider || undefined,
                policyNumber: policyNumber || undefined,
                contactInfo: contactInfo || undefined,
                type,

                premiumAmount: Math.round(parseFloat(premiumAmount) * 100), // cents
                premiumPeriod,
                nextPaymentDate: nextPaymentDate ? toFullISO(nextPaymentDate) : undefined,

                startDate: toFullISO(startDate),
                endDate: endDate ? toFullISO(endDate) : undefined,
                autoRenewal,

                coverageAmount: coverageAmount ? Math.round(parseFloat(coverageAmount) * 100) : undefined,
                deductible: deductible ? Math.round(parseFloat(deductible) * 100) : undefined,

                currentValue: 0, // Default 0 for now
                currency: 'EUR',

                insuredEntity: insuredEntity || undefined,
                accountId: accountId || undefined,

                notes: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await saveInsurance(policy);
            await refreshData();
            onClose();
        } catch (e) {
            console.error("Failed to save insurance", e);
            setErrorMessage(e instanceof Error ? e.message : t('errors.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('insurance.addTitle')}>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Identity */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {t('common.details')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.policyName')} *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder={t('insurance.placeholders.policyName')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.provider')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('insurance.placeholders.provider')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={provider}
                                onChange={e => setProvider(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.policyNumber')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('insurance.placeholders.policyNumber')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={policyNumber}
                                onChange={e => setPolicyNumber(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.contactInfo')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('insurance.placeholders.contactInfo')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={contactInfo}
                                onChange={e => setContactInfo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 2: Coverage */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <Shield className="w-4 h-4" /> {t('insurance.placeholders.coverage')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('common.type')}
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={type}
                                onChange={e => setType(e.target.value)}
                            >
                                <option value="life">{t('insurance.types.life')}</option>
                                <option value="health">{t('insurance.types.health')}</option>
                                <option value="auto">{t('insurance.types.auto')}</option>
                                <option value="home">{t('insurance.types.home')}</option>
                                <option value="travel">{t('insurance.types.travel')}</option>
                                <option value="liability">{t('insurance.types.liability')}</option>
                                <option value="other">{t('insurance.types.other')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.insuredEntity')}
                            </label>
                            <input
                                type="text"
                                placeholder={t('insurance.placeholders.insuredEntity')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={insuredEntity}
                                onChange={e => setInsuredEntity(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.coverageLimit')}
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={coverageAmount}
                                onChange={e => setCoverageAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.deductible')}
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={deductible}
                                onChange={e => setDeductible(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 3: Economics */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> {t('insurance.placeholders.economics')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.premiumAmount')} *
                            </label>
                            <input
                                type="number"
                                required
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={premiumAmount}
                                onChange={e => setPremiumAmount(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.premiumPeriod')}
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={premiumPeriod}
                                onChange={e => setPremiumPeriod(e.target.value as InsurancePolicy['premiumPeriod'])}
                            >
                                <option value="monthly">{t('insurance.premiumPeriods.monthly')}</option>
                                <option value="quarterly">{t('insurance.premiumPeriods.quarterly')}</option>
                                <option value="semiannual">{t('insurance.premiumPeriods.semiannual')}</option>
                                <option value="annual">{t('insurance.premiumPeriods.annual')}</option>
                                <option value="one-time">{t('insurance.premiumPeriods.one-time')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.nextPaymentDate')}
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={nextPaymentDate}
                                onChange={e => setNextPaymentDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('accounts.linkedBroker')}
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                            >
                                <option value="">{t('accounts.noBroker')}</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 4: Timeline */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {t('common.timeline')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.startDate')} *
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('insurance.endDate')}
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="autoRenewal"
                            className="rounded border-border text-success focus:ring-success"
                            checked={autoRenewal}
                            onChange={e => setAutoRenewal(e.target.checked)}
                        />
                        <label htmlFor="autoRenewal" className="text-sm text-foreground">
                            {t('insurance.autoRenewal')}
                        </label>
                    </div>
                </div>


                {/* Error message */}
                {errorMessage && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{errorMessage}</span>
                    </div>
                )}

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
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t('common.save')}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
