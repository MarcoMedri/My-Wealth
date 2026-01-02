import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, DollarSign, FileText, Percent, Clock } from 'lucide-react';
import { useVaultStore } from '../../store/useVaultStore';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal';
import { DepositAccount, InterestPeriodicity, ConstraintType } from '../../../../shared/schemas';

interface AddDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: DepositAccount | null;
}

export function AddDepositModal({ isOpen, onClose, initialData }: AddDepositModalProps) {
    const { brokers, saveDeposit, deleteDeposit, refreshData } = useVaultStore();
    const { t } = useTranslation();

    // State
    const [name, setName] = useState('');
    const [brokerId, setBrokerId] = useState('');
    const [principal, setPrincipal] = useState('');
    const [grossRate, setGrossRate] = useState('');
    const [netRate, setNetRate] = useState('');
    const [interestPeriodicity, setInterestPeriodicity] = useState<InterestPeriodicity>('end');
    const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
    const [durationMonths, setDurationMonths] = useState('12');
    const [maturityDate, setMaturityDate] = useState('');
    const [constraintType, setConstraintType] = useState<ConstraintType>('locked');
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Load initial data for editing
    useEffect(() => {
        if (initialData) {
            setName(initialData.name);
            setBrokerId(initialData.brokerId || '');
            setPrincipal((initialData.principal / 100).toString());
            setGrossRate(initialData.grossRate.toString());
            setNetRate(initialData.netRate.toString());
            setInterestPeriodicity(initialData.interestPeriodicity);
            setActivationDate(initialData.activationDate.split('T')[0]); // Use date part for input
            setDurationMonths(initialData.durationMonths.toString());
            setMaturityDate(initialData.maturityDate.split('T')[0]); // Use date part for input
            setConstraintType(initialData.constraintType);
            setNotes(initialData.notes || '');
        } else {
            // Reset
            setName('');
            setBrokerId('');
            setPrincipal('');
            setGrossRate('');
            setNetRate('');
            setInterestPeriodicity('end');
            const today = new Date().toISOString().split('T')[0];
            setActivationDate(today);
            setDurationMonths('12');
            setConstraintType('locked');
            setNotes('');

            // Auto-calculate initial maturity date
            const date = new Date(today);
            date.setMonth(date.getMonth() + 12);
            setMaturityDate(date.toISOString().split('T')[0]);
        }
    }, [initialData, isOpen]);

    // Auto-calculate Net Rate (approximate 26% tax for Italy)
    const handleGrossRateChange = (val: string) => {
        setGrossRate(val);
        const gross = parseFloat(val);
        if (!isNaN(gross)) {
            setNetRate((gross * 0.74).toFixed(2));
        }
    };

    // Helper for robust ISO conversion to avoid timezone shifts
    const toFullISO = (dateStr: string) => {
        if (!dateStr) return new Date().toISOString();
        // Set to noon UTC to avoid day shifts when parsing date-only strings
        return new Date(`${dateStr}T12:00:00Z`).toISOString();
    };

    // Auto-calculate Maturity Date
    const updateMaturity = (start: string, months: string) => {
        const m = parseInt(months);
        if (start && !isNaN(m)) {
            const date = new Date(start);
            date.setMonth(date.getMonth() + m);
            setMaturityDate(date.toISOString().split('T')[0]);
        }
    };

    // Auto-calculate Duration
    const updateDuration = (start: string, end: string) => {
        if (start && end) {
            const d1 = new Date(start);
            const d2 = new Date(end);
            const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
            if (months >= 0) {
                setDurationMonths(months.toString());
            }
        }
    };

    const handleActivationChange = (val: string) => {
        setActivationDate(val);
        updateMaturity(val, durationMonths);
    };

    const handleDurationChange = (val: string) => {
        setDurationMonths(val);
        updateMaturity(activationDate, val);
    };

    const handleMaturityChange = (val: string) => {
        setMaturityDate(val);
        updateDuration(activationDate, val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !principal || !grossRate || !maturityDate) {
            setErrorMessage(t('errors.missingRequiredFields') || "Please fill required fields");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const deposit: DepositAccount = {
                id: initialData?.id || crypto.randomUUID(),
                name,
                brokerId: brokerId || undefined,
                principal: Math.round(parseFloat(principal) * 100),
                grossRate: parseFloat(grossRate),
                netRate: parseFloat(netRate),
                interestPeriodicity,
                activationDate: toFullISO(activationDate),
                durationMonths: parseInt(durationMonths),
                maturityDate: toFullISO(maturityDate),
                constraintType,
                currency: 'EUR',
                notes: notes || undefined,
                createdAt: initialData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await saveDeposit(deposit);
            await refreshData();
            onClose();
        } catch (e) {
            console.error("Failed to save deposit", e);
            setErrorMessage(e instanceof Error ? e.message : t('errors.saveFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData) return;
        if (!confirm(t('common.confirmDelete') || 'Are you sure?')) return;

        setIsSubmitting(true);
        try {
            await deleteDeposit(initialData.id);
            await refreshData();
            onClose();
        } catch (e) {
            setErrorMessage(e instanceof Error ? e.message : t('errors.deleteFailed') || 'Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? t('deposits.editTitle') : t('deposits.addTitle')}>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Identity & Broker */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> {t('common.details')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.name')} *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder={t('deposits.placeholders.name')}
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.brokerLink')}
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={brokerId}
                                onChange={e => setBrokerId(e.target.value)}
                            >
                                <option value="">{t('accounts.noBroker')}</option>
                                {brokers.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 2: Financials */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> {t('deposits.principal')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.principal')} (€) *
                            </label>
                            <input
                                type="number"
                                required
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground font-semibold text-lg focus:ring-2 focus:ring-primary outline-none"
                                value={principal}
                                onChange={e => setPrincipal(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.grossRate')} (%) *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none pr-8"
                                    value={grossRate}
                                    onChange={e => handleGrossRateChange(e.target.value)}
                                />
                                <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.netRate')} (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none pr-8"
                                    value={netRate}
                                    onChange={e => setNetRate(e.target.value)}
                                />
                                <Percent className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.interestPeriodicity')}
                            </label>
                            <select
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={interestPeriodicity}
                                onChange={e => setInterestPeriodicity(e.target.value as InterestPeriodicity)}
                            >
                                <option value="end">{t('deposits.interestPeriodicityTypes.end')}</option>
                                <option value="monthly">{t('deposits.interestPeriodicityTypes.monthly')}</option>
                                <option value="quarterly">{t('deposits.interestPeriodicityTypes.quarterly')}</option>
                                <option value="semiannual">{t('deposits.interestPeriodicityTypes.semiannual')}</option>
                                <option value="annual">{t('deposits.interestPeriodicityTypes.annual')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 3: Timeline & Constraint */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground-muted flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" /> {t('common.timeline')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.activationDate')} *
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={activationDate}
                                onChange={e => handleActivationChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.duration')}
                            </label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={durationMonths}
                                onChange={e => handleDurationChange(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.maturityDate')} *
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none"
                                value={maturityDate}
                                onChange={e => handleMaturityChange(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-foreground-muted mb-1">
                                {t('deposits.constraintType')}
                            </label>
                            <div className="flex gap-2">
                                {(['free', 'locked', 'flexible'] as ConstraintType[]).map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setConstraintType(type)}
                                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${constraintType === type
                                            ? 'bg-primary border-primary text-white shadow-sm'
                                            : 'bg-background-subtle border-border text-foreground-muted hover:border-primary/50'
                                            }`}
                                    >
                                        {t(`deposits.constraintTypes.${type}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-border/50" />

                {/* Section 4: Notes */}
                <div>
                    <label className="block text-sm font-medium text-foreground-muted mb-1">
                        {t('deposits.notes')}
                    </label>
                    <textarea
                        className="w-full px-3 py-2 bg-background-subtle border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                        placeholder={t('deposits.notes')}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 flex justify-between items-center">
                    <div>
                        {initialData && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="text-sm font-medium text-error hover:text-error/80 transition-colors"
                            >
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
                            className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm active:scale-95"
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
