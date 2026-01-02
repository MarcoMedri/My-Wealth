/**
 * CSV Importer
 * 
 * Parse and import transactions from CSV files.
 */

import fs from 'fs-extra';

export interface CSVColumnMapping {
    date: string;
    description: string;
    amount: string;
    category?: string;
    notes?: string;
}

export interface CSVParseOptions {
    /** Column mapping */
    mapping: CSVColumnMapping;
    /** Delimiter character */
    delimiter: string;
    /** Skip header row */
    skipHeader: boolean;
    /** Date format (e.g., 'DD/MM/YYYY', 'YYYY-MM-DD') */
    dateFormat: string;
    /** Decimal separator */
    decimalSeparator: string;
    /** Thousands separator */
    thousandsSeparator: string;
    /** Invert amounts (for expense files) */
    invertAmounts: boolean;
}

export interface ParsedTransaction {
    date: string; // ISO format
    description: string;
    amount: number; // In cents
    category?: string;
    notes?: string;
    rawLine: string;
    lineNumber: number;
}

export interface CSVParseResult {
    success: boolean;
    transactions: ParsedTransaction[];
    errors: Array<{ line: number; message: string }>;
    totalLines: number;
}

const DEFAULT_OPTIONS: CSVParseOptions = {
    mapping: {
        date: 'Date',
        description: 'Description',
        amount: 'Amount',
    },
    delimiter: ',',
    skipHeader: true,
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    invertAmounts: false,
};

export class CSVImporter {
    private options: CSVParseOptions;

    constructor(options: Partial<CSVParseOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Parse a CSV file
     */
    async parseFile(filePath: string): Promise<CSVParseResult> {
        const content = await fs.readFile(filePath, 'utf-8');
        return this.parse(content);
    }

    /**
     * Parse CSV content
     */
    parse(content: string): CSVParseResult {
        const lines = content.split(/\r?\n/).filter(line => line.trim());
        const transactions: ParsedTransaction[] = [];
        const errors: Array<{ line: number; message: string }> = [];

        // Parse header to find column indices
        const startLine = this.options.skipHeader ? 1 : 0;
        const headerLine = this.options.skipHeader ? lines[0] : null;
        const columnIndices = headerLine ? this.getColumnIndices(headerLine) : null;

        for (let i = startLine; i < lines.length; i++) {
            try {
                const line = lines[i];
                const values = this.parseLine(line);
                
                const transaction = this.parseTransaction(values, columnIndices, i + 1, line);
                if (transaction) {
                    transactions.push(transaction);
                }
            } catch (error) {
                errors.push({
                    line: i + 1,
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return {
            success: errors.length === 0,
            transactions,
            errors,
            totalLines: lines.length - (this.options.skipHeader ? 1 : 0),
        };
    }

    /**
     * Get column indices from header
     */
    private getColumnIndices(headerLine: string): Record<string, number> {
        const values = this.parseLine(headerLine);
        const indices: Record<string, number> = {};

        for (const [key, columnName] of Object.entries(this.options.mapping)) {
            if (columnName) {
                const index = values.findIndex(v => 
                    v.toLowerCase().trim() === columnName.toLowerCase().trim()
                );
                if (index >= 0) {
                    indices[key] = index;
                }
            }
        }

        return indices;
    }

    /**
     * Parse a single CSV line
     */
    private parseLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === this.options.delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    }

    /**
     * Parse a transaction from values
     */
    private parseTransaction(
        values: string[],
        columnIndices: Record<string, number> | null,
        lineNumber: number,
        rawLine: string
    ): ParsedTransaction | null {
        const getValue = (key: string, fallbackIndex?: number): string => {
            if (columnIndices && key in columnIndices) {
                return values[columnIndices[key]] || '';
            }
            if (fallbackIndex !== undefined && values[fallbackIndex]) {
                return values[fallbackIndex];
            }
            return '';
        };

        const dateStr = getValue('date', 0);
        const description = getValue('description', 1);
        const amountStr = getValue('amount', 2);

        if (!dateStr || !amountStr) {
            return null;
        }

        // Parse date
        const date = this.parseDate(dateStr);
        if (!date) {
            throw new Error(`Invalid date: ${dateStr}`);
        }

        // Parse amount
        let amount = this.parseAmount(amountStr);
        if (this.options.invertAmounts) {
            amount = -amount;
        }

        return {
            date,
            description: description || 'Imported transaction',
            amount,
            category: getValue('category', 3) || undefined,
            notes: getValue('notes', 4) || undefined,
            rawLine,
            lineNumber,
        };
    }

    /**
     * Parse date string to ISO format
     */
    private parseDate(dateStr: string): string | null {
        const format = this.options.dateFormat;
        const cleaned = dateStr.trim();

        try {
            let day: number, month: number, year: number;

            if (format === 'DD/MM/YYYY') {
                const parts = cleaned.split('/');
                day = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            } else if (format === 'MM/DD/YYYY') {
                const parts = cleaned.split('/');
                month = parseInt(parts[0], 10);
                day = parseInt(parts[1], 10);
                year = parseInt(parts[2], 10);
            } else if (format === 'YYYY-MM-DD') {
                const parts = cleaned.split('-');
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
            } else {
                // Try to parse as Date
                const parsed = new Date(cleaned);
                if (isNaN(parsed.getTime())) return null;
                return parsed.toISOString();
            }

            const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
            return date.toISOString();
        } catch {
            return null;
        }
    }

    /**
     * Parse amount string to cents
     */
    private parseAmount(amountStr: string): number {
        let cleaned = amountStr.trim();

        // Remove thousands separator
        cleaned = cleaned.replace(new RegExp(`\\${this.options.thousandsSeparator}`, 'g'), '');

        // Replace decimal separator with dot
        cleaned = cleaned.replace(this.options.decimalSeparator, '.');

        // Remove currency symbols
        cleaned = cleaned.replace(/[€$£¥]/g, '');

        // Handle parentheses for negative (accounting format)
        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
            cleaned = '-' + cleaned.slice(1, -1);
        }

        const parsed = parseFloat(cleaned);
        if (isNaN(parsed)) {
            throw new Error(`Invalid amount: ${amountStr}`);
        }

        return Math.round(parsed * 100);
    }

    /**
     * Detect CSV format from content
     */
    static detectFormat(content: string): Partial<CSVParseOptions> {
        const lines = content.split(/\r?\n/).slice(0, 5);
        const firstLine = lines[0] || '';

        // Detect delimiter
        const delimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxCount = 0;

        for (const d of delimiters) {
            const count = (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                bestDelimiter = d;
            }
        }

        // Detect decimal separator based on locale hints
        const hasCommaDecimals = /\d,\d{2}(?!\d)/.test(content);
        const decimalSeparator = hasCommaDecimals ? ',' : '.';
        const thousandsSeparator = hasCommaDecimals ? '.' : ',';

        return {
            delimiter: bestDelimiter,
            decimalSeparator,
            thousandsSeparator,
        };
    }
}
