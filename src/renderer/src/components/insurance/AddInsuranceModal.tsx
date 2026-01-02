import React, { useState } from 'react';
import { Loader2, AlertTriangle, Shield, Calendar, DollarSign, FileText } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { InsurancePolicy } from '../../../../shared/schemas';

interface AddInsuranceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: InsurancePolicy | null;
}

export function AddInsuranceModal({ isOpen, onClose, initialData }: AddInsuranceModalProps) {
    const { accounts, saveInsurance, deleteInsurance, refreshData } = useVaultStore();
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
    const [currentValue, setCurrentValue] = useState('');
    const [notes, setNotes] = useState('');

    // Coverage
    const [coverageAmount, setCoverageAmount] = useState('');
    const [deductible, setDeductible] = useState('');
    const [insuredEntity, setInsuredEntity] = useState('');

    // Timeline
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [autoRenewal, setAutoRenewal] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Sync state with initialData when editing
    React.useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setProvider(initialData.provider || '');
            setPolicyNumber(initialData.policyNumber || '');
            setContactInfo(initialData.contactInfo || '');
            setType(initialData.type);
            setPremiumAmount((initialData.premiumAmount / 100).toString());
            setPremiumPeriod(initialData.premiumPeriod);
            setNextPaymentDate(initialData.nextPaymentDate ? initialData.nextPaymentDate.split('T')[0] : '');
            setAccountId(initialData.accountId || '');
            setCoverageAmount(initialData.coverageAmount ? (initialData.coverageAmount / 100).toString() : '');
            setDeductible(initialData.deductible ? (initialData.deductible / 100).toString() : '');
            setInsuredEntity(initialData.insuredEntity || '');
            setStartDate(initialData.startDate.split('T')[0]);
            setEndDate(initialData.endDate ? initialData.endDate.split('T')[0] : '');
            setAutoRenewal(initialData.autoRenewal);
            setCurrentValue(initialData.currentValue ? (initialData.currentValue / 100).toString() : '');
            setNotes(initialData.notes || '');
        } else {
            // Reset for Add mode
            setName('');
            setProvider('');
            setPolicyNumber('');
            setContactInfo('');
            setType('life');
            setPremiumAmount('');
            setPremiumPeriod('annual');
            setNextPaymentDate('');
            setAccountId('');
            setCoverageAmount('');
            setDeductible('');
            setInsuredEntity('');
            setStartDate(new Date().toISOString().split('T')[0]);
            setEndDate('');
            setAutoRenewal(true);
            setCurrentValue('');
            setNotes('');
        }
    }, [initialData, isOpen]);

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
                id: initialData?.id || crypto.randomUUID(),
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

                currentValue: currentValue ? Math.round(parseFloat(currentValue) * 100) : 0,
                currency: 'EUR',

                insuredEntity: insuredEntity || undefined,
                accountId: accountId || undefined,

                notes: notes || '',
                createdAt: initialData?.createdAt || new Date().toISOString(),
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

    const handleDelete = async () => {
        if (!initialData) return;
        if (!window.confirm(t('common.confirmDelete'))) return;

        setIsDeleting(true);
        try {
            await deleteInsurance(initialData.id);
            await refreshData();
            onClose();
        } catch (e) {
            console.error("Failed to delete insurance", e);
            setErrorMessage(e instanceof Error ? e.message : t('errors.deleteFailed'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? t('insurance.editTitle') : t('insurance.addTitle')}>
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
                                {t('insurance.currentValue')}
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none font-medium"
                                value={currentValue}
                                onChange={e => setCurrentValue(e.target.value)}
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

                <div className="h-px bg-border/50" />

                {/* Section 5: Notes */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {t('deposits.notes') || t('common.notes')}
                    </h3>
                    <textarea
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                        placeholder="..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>


                {/* Error message */}
                {errorMessage && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex justify-between items-center border-t border-border/30">
                    <div>
                        {initialData && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                                {t('common.delete')}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
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
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t('common.save')}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
