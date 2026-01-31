/**
 * Export Modal Component
 * 
 * Allows users to export vault data in JSON or CSV format.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FileJson, FileSpreadsheet, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ExportFormat = 'json' | 'csv';
type DataType = 'transactions' | 'accounts' | 'holdings';

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
    const { t } = useTranslation();
    const [format, setFormat] = useState<ExportFormat>('json');
    const [dataType, setDataType] = useState<DataType>('transactions');
    const [useDateRange, setUseDateRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const options: {
                format: ExportFormat;
                dataType?: DataType;
                startDate?: string;
                endDate?: string;
            } = { format };

            if (format === 'csv') {
                options.dataType = dataType;
            }

            if (useDateRange && startDate) {
                options.startDate = startDate;
            }
            if (useDateRange && endDate) {
                options.endDate = endDate;
            }

            const result = await window.api.exportData(options);

            if (result.success) {
                toast.success(t('export.success', 'Data exported successfully'), {
                    description: result.filePath,
                });
                onClose();
            } else {
                if (result.error !== 'Export cancelled') {
                    toast.error(t('export.error', 'Export failed'), {
                        description: result.error,
                    });
                }
            }
        } catch (error) {
            console.error('Export failed:', error);
            toast.error(t('export.error', 'Export failed'));
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="bg-background-card rounded-xl shadow-xl w-full max-w-md border border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Download className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">
                            {t('export.title', 'Export Data')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-foreground-muted hover:text-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            {t('export.format', 'Export Format')}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFormat('json')}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                    format === 'json'
                                        ? "border-emerald-500 bg-emerald-500/5"
                                        : "border-border hover:border-foreground-muted"
                                )}
                            >
                                <FileJson className={cn(
                                    "w-8 h-8",
                                    format === 'json' ? "text-emerald-500" : "text-foreground-muted"
                                )} />
                                <span className={cn(
                                    "text-sm font-medium",
                                    format === 'json' ? "text-emerald-500" : "text-foreground-muted"
                                )}>
                                    JSON
                                </span>
                                <span className="text-xs text-foreground-subtle text-center">
                                    {t('export.jsonDesc', 'Full backup')}
                                </span>
                            </button>
                            <button
                                onClick={() => setFormat('csv')}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                                    format === 'csv'
                                        ? "border-emerald-500 bg-emerald-500/5"
                                        : "border-border hover:border-foreground-muted"
                                )}
                            >
                                <FileSpreadsheet className={cn(
                                    "w-8 h-8",
                                    format === 'csv' ? "text-emerald-500" : "text-foreground-muted"
                                )} />
                                <span className={cn(
                                    "text-sm font-medium",
                                    format === 'csv' ? "text-emerald-500" : "text-foreground-muted"
                                )}>
                                    CSV
                                </span>
                                <span className="text-xs text-foreground-subtle text-center">
                                    {t('export.csvDesc', 'Spreadsheet')}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* CSV Data Type Selection */}
                    {format === 'csv' && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                {t('export.dataType', 'Data to Export')}
                            </label>
                            <select
                                value={dataType}
                                onChange={(e) => setDataType(e.target.value as DataType)}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                            >
                                <option value="transactions">{t('export.transactions', 'Transactions')}</option>
                                <option value="accounts">{t('export.accounts', 'Accounts')}</option>
                                <option value="holdings">{t('export.holdings', 'Investment Holdings')}</option>
                            </select>
                        </div>
                    )}

                    {/* Date Range Filter */}
                    {format === 'csv' && dataType === 'transactions' && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useDateRange}
                                    onChange={(e) => setUseDateRange(e.target.checked)}
                                    className="w-4 h-4 rounded border-border"
                                />
                                <Calendar className="w-4 h-4 text-foreground-muted" />
                                <span className="text-sm text-foreground">
                                    {t('export.filterByDate', 'Filter by date range')}
                                </span>
                            </label>

                            {useDateRange && (
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label className="block text-xs text-foreground-muted mb-1">
                                            {t('common.from', 'From')}
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-foreground-muted mb-1">
                                            {t('common.to', 'To')}
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-border text-foreground-muted hover:text-foreground hover:bg-background-muted transition-colors"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                            "bg-emerald-500 text-white hover:bg-emerald-600",
                            isExporting && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('export.exporting', 'Exporting...')}
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                {t('export.export', 'Export')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
