/**
 * Import Modal component using shadcn/ui and custom logic
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVaultStore } from '../store/useVaultStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { Select, Modal } from './';
import { cn } from '../lib/utils';
import { Loader2, Upload, FileText, AlertCircle, Check } from 'lucide-react';
import type { ImportPreset, ColumnMapping } from '../../../shared/types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedBrokerId?: string;
}

export default function ImportModal({ isOpen, onClose, preselectedBrokerId }: ImportModalProps) {
    const { t } = useTranslation();
    const { accounts, deposits, brokers, refreshData } = useVaultStore();
    const baseCurrency = useSettingsStore(state => state.currency);

    // Steps: 'upload' -> 'mapping' -> 'preview' -> 'done'
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload');

    // Auto-select broker if preselected
    useEffect(() => {
        if (isOpen && preselectedBrokerId) {
            setAccountId(`broker:${preselectedBrokerId}`);
        }
    }, [isOpen, preselectedBrokerId]);

    const [file, setFile] = useState<File | null>(null);
    const [content, setContent] = useState<string>('');
    const [accountId, setAccountId] = useState<string>('');
    const [presets, setPresets] = useState<ImportPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('generic');

    // Mapping state
    const [mapping, setMapping] = useState<ColumnMapping>({
        dateColumn: '',
        descriptionColumn: '',
        amountColumn: '',
        dateFormat: 'YYYY-MM-DD',
        decimalSeparator: '.',
    });

    const [headers, setHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);

    // Result state
    const [importStats, setImportStats] = useState({
        total: 0,
        imported: 0,
        skipped: 0,
        duplicates: 0
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Set initial mapping when preset changes or when presets load
    useEffect(() => {
        window.api.getImportPresets().then(setPresets);
    }, []);

    // Set initial mapping when preset changes or when presets load
    useEffect(() => {
        const preset = presets.find(p => p.id === selectedPresetId);
        if (preset) {
            setMapping(preset.mapping);
        }
    }, [selectedPresetId, presets]);

    // Handle file selection via Native Dialog
    const handleUploadClick = async () => {
        if (!accountId) {
            // User feedback for why nothing happens
            setError(t('import.selectAccountFirst', 'Please select an account first'));
            return;
        }

        setIsLoading(true);
        try {
            // RESOLVE TARGET: If user selected a BROKER, find or create the account
            let targetAccountId = accountId;

            if (accountId.startsWith('broker:')) {
                const brokerId = accountId.replace('broker:', '');
                const linkedAccount = accounts.find(a => a.brokerId === brokerId);

                if (linkedAccount) {
                    targetAccountId = linkedAccount.id;
                } else {
                    // Create new account for this broker
                    const broker = brokers.find(b => b.id === brokerId);
                    if (!broker) throw new Error('Broker not found');

                    const newAccount = await window.api.saveAccount({
                        name: `${broker.name} Account`,
                        type: 'investment',
                        currency: baseCurrency, // Default to system currency
                        initialBalance: 0,
                        color: broker.color || '#10b981',
                        isArchived: false,
                        brokerId: broker.id, // Explicitly link to broker
                        sortOrder: 0
                    });

                    targetAccountId = newAccount.id;
                    await refreshData(); // Refresh to ensure store is consistent
                }
            } else if (accountId.startsWith('deposit:')) {
                targetAccountId = accountId.replace('deposit:', '');
            } else if (accountId.startsWith('account:')) {
                targetAccountId = accountId.replace('account:', '');
            }

            // Use new IPC method
            const result = await window.api.selectFile();

            if (!result) {
                setIsLoading(false);
                return;
            }

            // Mock File object for UI compatibility
            setFile({ name: result.name } as File);
            setContent(result.content);
            // Store the RESOLVED account ID for the next step (executeImport)
            // We update the state to the real ID so executeImport uses it
            setAccountId(targetAccountId);

            const { headers, preview } = await window.api.previewCSV(result.content);
            setHeaders(headers);
            setPreviewRows(preview);

            // Try to auto-detect columns based on headers if generic
            if (selectedPresetId === 'generic') {
                const dateCol = headers.find(h => /date|data|time/i.test(h)) || '';
                const descCol = headers.find(h => /desc|msg|payee/i.test(h)) || '';
                const amtCol = headers.find(h => /amount|importo|value/i.test(h)) || '';

                setMapping(prev => ({
                    ...prev,
                    dateColumn: dateCol,
                    descriptionColumn: descCol,
                    amountColumn: amtCol || prev.amountColumn
                }));
            }

            setStep('mapping');
        } catch (err) {
            console.error("[ImportModal] File read error:", err);
            setError('Failed to read file or create account');
        } finally {
            setIsLoading(false);
        }
    };

    // EXECUTE IMPORT (Refactored)
    const executeImport = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Parse CSV (Backend only returns parsed data now)
            const result = await window.api.executeImport(content, mapping, accountId);

            if (!result.success) {
                setError(`Import failed: ${result.errors[0]}`);
                setIsLoading(false);
                return;
            }

            const existingTx = useVaultStore.getState().transactions;
            let importedCount = 0;
            let duplicatesCount = 0;

            // 2. Filter Duplicates & Save
            for (const tx of result.transactions) {
                // Check for exact duplicate in store
                // (Same Account, Date, Amount, Payee)
                const isDuplicate = existingTx.some(existing =>
                    existing.accountId === accountId &&
                    Math.abs(existing.amount) === Math.abs(tx.amount) &&
                    existing.date.split('T')[0] === tx.date.split('T')[0] && // Compare YYYY-MM-DD
                    existing.payee.toLowerCase() === tx.payee.toLowerCase()
                );

                if (isDuplicate) {
                    duplicatesCount++;
                    continue;
                }

                // Save new transaction
                await window.api.saveTransaction(tx);
                importedCount++;
            }

            setImportStats({
                total: result.transactions.length,
                imported: importedCount,
                skipped: result.skippedRows,
                duplicates: duplicatesCount
            });

            await refreshData();
            setStep('done');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        // Reset state after a delay for animation
        setTimeout(() => {
            setStep('upload');
            setFile(null);
            setContent('');
            setError(null);
        }, 300);
    };

    // Render helpers
    const renderStepUpload = () => (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                    {t('import.selectAccount')}
                </label>
                <Select
                    value={accountId}
                    onChange={e => {
                        setAccountId(e.target.value);
                        setError(null); // Clear error on selection
                    }}
                    options={[
                        // Combine all valid targets
                        // 1. Brokers (Preferred for investments)
                        ...(brokers || []).map(b => ({ value: `broker:${b.id}`, label: `Broker: ${b.name}` })),
                        // 2. Existing Accounts (Only manual ones, not linked to brokers)
                        ...(accounts || []).filter(a => !a.brokerId).map(acc => ({ value: `account:${acc.id}`, label: acc.name })),
                        // 3. Deposits
                        ...(deposits || []).map(dep => ({ value: `deposit:${dep.id}`, label: `${t('accounts.types.deposit')}: ${dep.name}` }))
                    ]}
                    placeholder={t('import.selectAccountPlaceholder', 'Select an account or broker...')}
                />

                <div className="mt-1 text-[10px] text-foreground-subtle flex gap-2">
                    <span>Target: {accountId ? accountId.split(':')[0] : 'None'}</span>
                </div>
            </div>

            <div
                onClick={handleUploadClick}
                className={cn(
                    "border-2 border-dashed border-border rounded-xl p-8 text-center transition-colors relative",
                    accountId ? "hover:border-emerald-500 hover:bg-background-subtle/50 cursor-pointer" : "opacity-50 cursor-not-allowed"
                )}
            >
                {/* Removed hidden input, now using IPC dialog */}
                <div className="pointer-events-none">
                    <Upload className="w-10 h-10 text-foreground-subtle mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground-muted">
                        {t('import.clickToUpload')}
                    </p>
                    <p className="text-sm text-foreground-subtle mt-2">
                        {t('import.maxSize')}
                    </p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground-muted mb-2">
                    {t('import.importPreset')}
                </label>
                <Select
                    value={selectedPresetId}
                    onChange={e => setSelectedPresetId(e.target.value)}
                    options={presets.map(p => ({ value: p.id, label: p.name }))}
                />
                <p className="text-xs text-foreground-subtle mt-1">
                    {presets.find(p => p.id === selectedPresetId)?.description}
                </p>
            </div>
        </div >
    );

    const renderStepMapping = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 p-3 bg-background-subtle rounded-lg">
                <FileText className="w-8 h-8 text-emerald-500" />
                <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{file?.name}</p>
                    <p className="text-xs text-foreground-subtle">{headers.length} columns detected</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs uppercase text-foreground-subtle font-semibold mb-1">
                        Date Column
                    </label>
                    <select
                        value={mapping.dateColumn}
                        onChange={e => setMapping({ ...mapping, dateColumn: e.target.value })}
                        className="w-full px-2 py-1.5 bg-background-subtle border border-border rounded text-sm text-foreground"
                    >
                        <option value="">Select column...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase text-foreground-subtle font-semibold mb-1">
                        Date Format
                    </label>
                    <select
                        value={mapping.dateFormat}
                        onChange={e => setMapping({ ...mapping, dateFormat: e.target.value })}
                        className="w-full px-2 py-1.5 bg-background-subtle border border-border rounded text-sm text-foreground"
                    >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                    </select>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs uppercase text-foreground-subtle font-semibold mb-1">
                        Description Column
                    </label>
                    <select
                        value={mapping.descriptionColumn}
                        onChange={e => setMapping({ ...mapping, descriptionColumn: e.target.value })}
                        className="w-full px-2 py-1.5 bg-background-subtle border border-border rounded text-sm text-foreground"
                    >
                        <option value="">Select column...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase text-foreground-subtle font-semibold mb-1">
                        Amount Column
                    </label>
                    <select
                        value={mapping.amountColumn || ''}
                        onChange={e => setMapping({ ...mapping, amountColumn: e.target.value })}
                        className="w-full px-2 py-1.5 bg-background-subtle border border-border rounded text-sm text-foreground"
                    >
                        <option value="">Select column...</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs uppercase text-foreground-subtle font-semibold mb-1">
                        Decimal Separator
                    </label>
                    <select
                        value={mapping.decimalSeparator}
                        onChange={e => setMapping({ ...mapping, decimalSeparator: e.target.value as '.' | ',' })}
                        className="w-full px-2 py-1.5 bg-background-subtle border border-border rounded text-sm text-foreground"
                    >
                        <option value=".">Dot (.)</option>
                        <option value=",">Comma (,)</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="invertSign"
                    checked={mapping.invertSign}
                    onChange={e => setMapping({ ...mapping, invertSign: e.target.checked })}
                    className="rounded border-border bg-background-subtle text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="invertSign" className="text-sm text-foreground-muted select-none">
                    {t('import.invertSign')}
                </label>
            </div>

            <div className="bg-background rounded-lg p-3 overflow-x-auto">
                <p className="text-xs text-foreground-subtle mb-2 uppercase">{t('import.filePreview')}</p>
                <table className="w-full text-left text-xs text-foreground-muted">
                    <thead>
                        <tr>
                            {headers.slice(0, 4).map(h => (
                                <th key={h} className="p-1 font-medium border-b border-border">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.slice(0, 3).map((row, i) => (
                            <tr key={i}>
                                {headers.slice(0, 4).map(h => (
                                    <td key={h} className="p-1 border-b border-border/50">{row[h]}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={() => setStep('upload')}
                    className="text-sm text-foreground-muted hover:text-foreground"
                >
                    {t('import.back')}
                </button>
                <button
                    onClick={executeImport}
                    disabled={isLoading}
                    className="px-4 py-2 bg-emerald-500 text-foreground rounded-lg hover:bg-emerald-600 flex items-center gap-2"
                >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t('import.importNow')}
                </button>
            </div>
        </div>
    );

    const renderStepDone = () => (
        <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{t('import.importSuccessful')}</h3>

            <div className="flex justify-center gap-8 py-4 text-sm">
                <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">{importStats.imported}</p>
                    <p className="text-foreground-subtle">{t('import.imported')}</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-foreground-muted">{importStats.duplicates}</p>
                    <p className="text-foreground-subtle">{t('import.duplicates')}</p>
                </div>
                {importStats.skipped > 0 && (
                    <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-500">{importStats.skipped}</p>
                        <p className="text-foreground-subtle">{t('import.skipped')}</p>
                    </div>
                )}
            </div>

            <p className="text-foreground-muted mb-6 text-sm">
                {importStats.duplicates > 0
                    ? `${importStats.duplicates} ${t('import.duplicatesSkipped')}`
                    : t('import.allImported')}
            </p>

            <button
                onClick={handleClose}
                className="px-6 py-2 bg-background-muted text-foreground rounded-lg hover:bg-background-muted"
            >
                {t('import.done')}
            </button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={step === 'done' ? t('import.complete') : t('import.title')}
        >
            {error && (
                <div className="mb-4 p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {step === 'upload' && renderStepUpload()}
            {step === 'mapping' && renderStepMapping()}
            {step === 'done' && renderStepDone()}
        </Modal>
    );
}
