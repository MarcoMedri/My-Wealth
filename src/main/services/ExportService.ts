/**
 * Export Service
 * 
 * Handles exporting vault data in various formats (JSON, CSV).
 */

import { writeFile } from 'fs/promises';
import { dialog } from 'electron';
import type { SerializableVaultState } from '../../shared/schemas';

export interface ExportOptions {
    format: 'json' | 'csv';
    /** For CSV: which data to export */
    dataType?: 'transactions' | 'accounts' | 'holdings';
    /** Date range filter for transactions */
    startDate?: string;
    endDate?: string;
}

export interface ExportResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

export class ExportService {
    /**
     * Export vault data to a file
     */
    async export(state: SerializableVaultState, options: ExportOptions): Promise<ExportResult> {
        try {
            const defaultName = options.format === 'json' 
                ? `mywealth-backup-${this.getDateString()}.json`
                : `mywealth-${options.dataType || 'transactions'}-${this.getDateString()}.csv`;

            const filters = options.format === 'json'
                ? [{ name: 'JSON Files', extensions: ['json'] }]
                : [{ name: 'CSV Files', extensions: ['csv'] }];

            const result = await dialog.showSaveDialog({
                title: 'Export Data',
                defaultPath: defaultName,
                filters,
            });

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Export cancelled' };
            }

            const content = options.format === 'json'
                ? this.exportToJSON(state)
                : this.exportToCSV(state, options);

            await writeFile(result.filePath, content, 'utf-8');

            return { success: true, filePath: result.filePath };
        } catch (error) {
            console.error('Export failed:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    /**
     * Export full vault state as JSON
     */
    private exportToJSON(state: SerializableVaultState): string {
        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            data: {
                accounts: state.accounts,
                categories: state.categories,
                transactions: state.transactions,
                assets: state.assets,
                holdings: state.holdings,
                trades: state.trades,
                properties: state.properties,
                collectibles: state.collectibles,
                insurance: state.insurance,
                deposits: state.deposits,
                brokers: state.brokers,
                snapshots: state.snapshots,
            }
        };
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Export to CSV format
     */
    private exportToCSV(state: SerializableVaultState, options: ExportOptions): string {
        switch (options.dataType) {
            case 'accounts':
                return this.accountsToCSV(state);
            case 'holdings':
                return this.holdingsToCSV(state);
            case 'transactions':
            default:
                return this.transactionsToCSV(state, options);
        }
    }

    /**
     * Convert transactions to CSV
     */
    private transactionsToCSV(state: SerializableVaultState, options: ExportOptions): string {
        let transactions = state.transactions;

        // Filter by date range if specified
        if (options.startDate) {
            const start = new Date(options.startDate);
            transactions = transactions.filter(t => new Date(t.date) >= start);
        }
        if (options.endDate) {
            const end = new Date(options.endDate);
            transactions = transactions.filter(t => new Date(t.date) <= end);
        }

        // Sort by date
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Create account lookup
        const accountMap = new Map(state.accounts.map(a => [a.id, a.name]));
        const categoryMap = new Map(state.categories.map(c => [c.id, c.name]));

        // CSV Header
        const headers = ['Date', 'Type', 'Account', 'Category', 'Description', 'Amount', 'Currency', 'Notes'];
        
        // CSV Rows
        const rows = transactions.map(t => [
            t.date.split('T')[0],
            t.type,
            accountMap.get(t.accountId) || t.accountId,
            t.categoryId ? (categoryMap.get(t.categoryId) || t.categoryId) : '',
            this.escapeCSV(t.payee),
            (t.amount / 100).toFixed(2),
            t.currency,
            this.escapeCSV(t.notes || ''),
        ]);

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * Convert accounts to CSV
     */
    private accountsToCSV(state: SerializableVaultState): string {
        const headers = ['Name', 'Type', 'Currency', 'Balance', 'Is Archived'];
        
        const rows = state.accounts.map(a => {
            const balance = state.accountBalances[a.id] || 0;
            return [
                this.escapeCSV(a.name),
                a.type,
                a.currency,
                (balance / 100).toFixed(2),
                a.isArchived ? 'Yes' : 'No',
            ];
        });

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * Convert holdings to CSV
     */
    private holdingsToCSV(state: SerializableVaultState): string {
        const assetMap = new Map(state.assets.map(a => [a.id, a]));
        
        const headers = ['Symbol', 'Name', 'Quantity', 'Avg Buy Price', 'Current Price', 'Currency', 'Current Value', 'Gain/Loss'];
        
        const rows = state.holdings.map(h => {
            const asset = assetMap.get(h.assetId);
            if (!asset) return null;
            
            const currentValue = h.quantity * asset.currentPrice;
            const costBasis = h.quantity * h.averageBuyPrice;
            const gainLoss = currentValue - costBasis;
            
            return [
                asset.symbol,
                this.escapeCSV(asset.name),
                h.quantity.toString(),
                (h.averageBuyPrice / 100).toFixed(2),
                (asset.currentPrice / 100).toFixed(2),
                asset.currency,
                (currentValue / 100).toFixed(2),
                (gainLoss / 100).toFixed(2),
            ];
        }).filter(Boolean) as string[][];

        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    /**
     * Escape CSV field
     */
    private escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Get formatted date string for filenames
     */
    private getDateString(): string {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }
}

export const exportService = new ExportService();
