import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, Check, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Modal, Select } from '../';

// ============================================================================
// TYPES
// ============================================================================

interface ColumnMapping {
    date: string;
    description: string;
    amount: string;
    category?: string;
    notes?: string;
}

interface ImportSettings {
    delimiter: string;
    skipHeader: boolean;
    dateFormat: string;
    decimalSeparator: string;
    invertAmounts: boolean;
}

interface ParsedRow {
    date: string;
    description: string;
    amount: number;
    category?: string;
    notes?: string;
    accountId: string;  // Target account for import
    isValid: boolean;
    error?: string;
}

export interface Account {
    id: string;
    name: string;
}

interface ImportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (transactions: ParsedRow[]) => Promise<void>;
    accounts: Account[];  // List of available accounts
}

type WizardStep = 'upload' | 'mapping' | 'preview' | 'complete';

// ============================================================================
// COMPONENT
// ============================================================================

export function ImportWizard({ isOpen, onClose, onImport, accounts }: ImportWizardProps) {
    const { t } = useTranslation();

    const [step, setStep] = useState<WizardStep>('upload');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [csvContent, setCsvContent] = useState<string>('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<string[][]>([]);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const [mapping, setMapping] = useState<ColumnMapping>({
        date: '',
        description: '',
        amount: '',
    });

    const [settings, setSettings] = useState<ImportSettings>({
        delimiter: ',',
        skipHeader: true,
        dateFormat: 'DD/MM/YYYY',
        decimalSeparator: ',',
        invertAmounts: false,
    });

    // ========== FILE HANDLING ==========

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);

            // Parse preview
            const lines = content.split(/\r?\n/).filter(l => l.trim());
            const delimiter = detectDelimiter(content);
            setSettings(s => ({ ...s, delimiter }));

            const parsedLines = lines.slice(0, 10).map(line => parseLine(line, delimiter));
            setHeaders(parsedLines[0] || []);
            setPreviewRows(parsedLines.slice(1, 6));

            // Auto-detect column mapping
            autoDetectMapping(parsedLines[0] || []);

            setStep('mapping');
        };
        reader.readAsText(selectedFile);
    }, []);

    const detectDelimiter = (content: string): string => {
        const firstLine = content.split(/\r?\n/)[0] || '';
        const delimiters = [',', ';', '\t', '|'];
        let best = ',';
        let maxCount = 0;

        for (const d of delimiters) {
            const count = (firstLine.match(new RegExp(`\\${d === '|' ? '\\|' : d}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                best = d;
            }
        }
        return best;
    };

    const parseLine = (line: string, delimiter: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const autoDetectMapping = (headerRow: string[]) => {
        const lower = headerRow.map(h => h.toLowerCase());

        const dateIndex = lower.findIndex(h =>
            h.includes('date') || h.includes('data') || h.includes('fecha')
        );
        const descIndex = lower.findIndex(h =>
            h.includes('description') || h.includes('descrizione') || h.includes('causale') || h.includes('memo')
        );
        const amountIndex = lower.findIndex(h =>
            h.includes('amount') || h.includes('importo') || h.includes('valore') || h.includes('euro')
        );

        setMapping({
            date: dateIndex >= 0 ? headerRow[dateIndex] : '',
            description: descIndex >= 0 ? headerRow[descIndex] : '',
            amount: amountIndex >= 0 ? headerRow[amountIndex] : '',
        });
    };

    // ========== PARSING ==========

    const handleParse = useCallback(() => {
        const lines = csvContent.split(/\r?\n/).filter(l => l.trim());
        const startIndex = settings.skipHeader ? 1 : 0;

        const columnMap: Record<string, number> = {};
        if (settings.skipHeader && lines[0]) {
            const headerRow = parseLine(lines[0], settings.delimiter);
            for (const [key, value] of Object.entries(mapping)) {
                if (value) {
                    const idx = headerRow.findIndex(h => h === value);
                    if (idx >= 0) columnMap[key] = idx;
                }
            }
        }

        const parsed: ParsedRow[] = [];

        for (let i = startIndex; i < lines.length; i++) {
            const values = parseLine(lines[i], settings.delimiter);

            try {
                const dateStr = values[columnMap.date] || '';
                const description = values[columnMap.description] || '';
                const amountStr = values[columnMap.amount] || '';

                if (!dateStr || !amountStr) {
                    continue;
                }

                const date = parseDate(dateStr, settings.dateFormat);
                let amount = parseAmount(amountStr, settings.decimalSeparator);

                if (settings.invertAmounts) {
                    amount = -amount;
                }

                parsed.push({
                    date,
                    description: description || 'Imported',
                    amount,
                    accountId: selectedAccountId,
                    category: columnMap.category !== undefined ? values[columnMap.category] : undefined,
                    notes: columnMap.notes !== undefined ? values[columnMap.notes] : undefined,
                    isValid: true,
                });
            } catch (error) {
                parsed.push({
                    date: '',
                    description: 'Error parsing row',
                    amount: 0,
                    accountId: selectedAccountId,
                    isValid: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        setParsedRows(parsed);
        setStep('preview');
    }, [csvContent, mapping, settings, selectedAccountId]);

    const parseDate = (dateStr: string, format: string): string => {
        const cleaned = dateStr.trim();
        let day: number, month: number, year: number;

        if (format === 'DD/MM/YYYY') {
            const parts = cleaned.split('/');
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        } else if (format === 'YYYY-MM-DD') {
            const parts = cleaned.split('-');
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        } else {
            const parts = cleaned.split('/');
            month = parseInt(parts[0], 10);
            day = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
        }

        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
    };

    const parseAmount = (amountStr: string, decimalSep: string): number => {
        let cleaned = amountStr.trim();
        cleaned = cleaned.replace(/[€$£¥\s]/g, '');

        if (decimalSep === ',') {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            cleaned = cleaned.replace(/,/g, '');
        }

        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
            cleaned = '-' + cleaned.slice(1, -1);
        }

        return Math.round(parseFloat(cleaned) * 100);
    };

    // ========== IMPORT ==========

    const handleImport = useCallback(async () => {
        setIsImporting(true);
        setImportError(null);

        try {
            const validRows = parsedRows.filter(r => r.isValid);
            await onImport(validRows);
            setStep('complete');
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Import failed');
        } finally {
            setIsImporting(false);
        }
    }, [parsedRows, onImport]);

    const handleClose = () => {
        setStep('upload');
        setCsvContent('');
        setHeaders([]);
        setPreviewRows([]);
        setParsedRows([]);
        setImportError(null);
        onClose();
    };

    // ========== RENDER ==========

    const renderStepIndicator = () => (
        <div className="flex items-center gap-2 mb-6">
            {(['upload', 'mapping', 'preview', 'complete'] as WizardStep[]).map((s, i) => (
                <React.Fragment key={s}>
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${step === s ? 'bg-primary text-white' :
                            ['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i
                                ? 'bg-success text-white' : 'bg-background-muted text-foreground-muted'}
                    `}>
                        {['upload', 'mapping', 'preview', 'complete'].indexOf(step) > i ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 3 && <div className="flex-1 h-0.5 bg-border" />}
                </React.Fragment>
            ))}
        </div>
    );

    const renderUploadStep = () => (
        <div className="space-y-6">
            {/* Account Selector */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    {t('import.selectAccount', 'Seleziona Conto')} *
                </label>
                <Select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                    placeholder={t('import.chooseAccount', 'Scegli il conto in cui importare...')}
                />
            </div>

            {/* File Upload */}
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <div className="w-20 h-20 bg-background-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileSpreadsheet className="w-10 h-10 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t('import.selectFile', 'Clicca per caricare CSV')}</h3>
                <p className="text-foreground-muted text-sm mb-6">Max 5MB • solo .csv</p>

                <label className="btn bg-primary text-white px-6 py-3 rounded-lg cursor-pointer inline-flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {t('import.browse', 'Browse Files')}
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={!selectedAccountId}
                    />
                </label>

                {!selectedAccountId && (
                    <p className="text-sm text-error mt-2">
                        {t('import.selectAccountFirst', 'Seleziona prima un conto')}
                    </p>
                )}
            </div>
        </div>
    );

    const renderMappingStep = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <Select
                    label={t('import.dateColumn', 'Date Column') + ' *'}
                    value={mapping.date}
                    onChange={(e) => setMapping(m => ({ ...m, date: e.target.value }))}
                    options={headers.map(h => ({ value: h, label: h }))}
                    placeholder={t('import.selectColumn', 'Select column')}
                />
                <Select
                    label={t('import.descriptionColumn', 'Description Column') + ' *'}
                    value={mapping.description}
                    onChange={(e) => setMapping(m => ({ ...m, description: e.target.value }))}
                    options={headers.map(h => ({ value: h, label: h }))}
                    placeholder={t('import.selectColumn', 'Select column')}
                />
                <Select
                    label={t('import.amountColumn', 'Amount Column') + ' *'}
                    value={mapping.amount}
                    onChange={(e) => setMapping(m => ({ ...m, amount: e.target.value }))}
                    options={headers.map(h => ({ value: h, label: h }))}
                    placeholder={t('import.selectColumn', 'Select column')}
                />
                <Select
                    label={t('import.dateFormat', 'Date Format')}
                    value={settings.dateFormat}
                    onChange={(e) => setSettings(s => ({ ...s, dateFormat: e.target.value }))}
                    options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                />
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.invertAmounts}
                        onChange={(e) => setSettings(s => ({ ...s, invertAmounts: e.target.checked }))}
                        className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">{t('import.invertAmounts', 'Invert amounts (for expense files)')}</span>
                </label>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm border border-border rounded-lg">
                    <thead className="bg-background-muted">
                        <tr>
                            {headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row, i) => (
                            <tr key={i} className="border-t border-border">
                                {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-2">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderPreviewStep = () => {
        const validCount = parsedRows.filter(r => r.isValid).length;
        const errorCount = parsedRows.filter(r => !r.isValid).length;

        return (
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 bg-success/10 border border-success/20 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-success">{validCount}</div>
                        <div className="text-sm text-foreground-muted">{t('import.validRows', 'Valid transactions')}</div>
                    </div>
                    {errorCount > 0 && (
                        <div className="flex-1 bg-error/10 border border-error/20 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-error">{errorCount}</div>
                            <div className="text-sm text-foreground-muted">{t('import.errorRows', 'Errors')}</div>
                        </div>
                    )}
                </div>

                <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-background-muted sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left">{t('import.date', 'Date')}</th>
                                <th className="px-3 py-2 text-left">{t('import.description', 'Description')}</th>
                                <th className="px-3 py-2 text-right">{t('import.amount', 'Amount')}</th>
                                <th className="px-3 py-2 text-center">{t('import.status', 'Status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parsedRows.slice(0, 50).map((row, i) => (
                                <tr key={i} className={`border-t border-border ${!row.isValid ? 'bg-error/5' : ''}`}>
                                    <td className="px-3 py-2">{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                                    <td className="px-3 py-2">{row.description}</td>
                                    <td className="px-3 py-2 text-right">{(row.amount / 100).toFixed(2)} €</td>
                                    <td className="px-3 py-2 text-center">
                                        {row.isValid ?
                                            <Check className="w-4 h-4 text-success mx-auto" /> :
                                            <AlertCircle className="w-4 h-4 text-error mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {importError && (
                    <div className="bg-error/10 border border-error/20 text-error p-3 rounded-lg text-sm">
                        {importError}
                    </div>
                )}
            </div>
        );
    };

    const renderCompleteStep = () => (
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('import.success', 'Import Complete!')}</h3>
            <p className="text-foreground-muted">
                {t('import.successMessage', '{{count}} transactions imported successfully', { count: parsedRows.filter(r => r.isValid).length })}
            </p>
        </div>
    );

    const footer = (
        <>
            {step !== 'upload' && step !== 'complete' && (
                <Button
                    variant="secondary"
                    onClick={() => setStep(step === 'mapping' ? 'upload' : 'mapping')}
                >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('common.back', 'Back')}
                </Button>
            )}
            <div className="flex-1" />
            {step === 'mapping' && (
                <Button onClick={handleParse} disabled={!mapping.date || !mapping.description || !mapping.amount}>
                    {t('common.next', 'Next')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            )}
            {step === 'preview' && (
                <Button onClick={handleImport} isLoading={isImporting}>
                    {t('import.importButton', 'Import Transactions')}
                </Button>
            )}
            {step === 'complete' && (
                <Button onClick={handleClose}>
                    {t('common.close', 'Close')}
                </Button>
            )}
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('import.title', 'Import Transactions')}
            size="lg"
            footer={footer}
        >
            {renderStepIndicator()}
            {step === 'upload' && renderUploadStep()}
            {step === 'mapping' && renderMappingStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'complete' && renderCompleteStep()}
        </Modal>
    );
}
