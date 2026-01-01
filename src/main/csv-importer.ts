/**
 * MyWealth Desktop - CSV Importer
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Flexible CSV parser that handles different bank/broker formats
 * through configurable column mapping.
 */

import Papa from 'papaparse';
import { randomUUID } from 'crypto';
import type { Transaction } from '../shared/schemas';
import type { ColumnMapping, ImportResult, ImportPreset } from '../shared/types';

// ============================================================================
// TYPES (ParsedRow kept local or moved if needed, keeping local for now if not shared)
// ============================================================================

// ============================================================================
// COMMON PRESETS
// ============================================================================

export const IMPORT_PRESETS: ImportPreset[] = [
  {
    id: 'generic',
    name: 'Generic CSV',
    description: 'Date, Description, Amount columns',
    mapping: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
    },
  },
  {
    id: 'italian-bank',
    name: 'Banca Italiana',
    description: 'Data, Descrizione, Dare/Avere',
    mapping: {
      dateColumn: 'Data',
      descriptionColumn: 'Descrizione',
      debitColumn: 'Dare',
      creditColumn: 'Avere',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
    },
  },
  {
    id: 'n26',
    name: 'N26',
    description: 'Date, Payee, Amount (EUR)',
    mapping: {
      dateColumn: 'Date',
      descriptionColumn: 'Payee',
      amountColumn: 'Amount (EUR)',
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
    },
  },
  {
    id: 'revolut',
    name: 'Revolut',
    description: 'Completed Date, Description, Amount',
    mapping: {
      dateColumn: 'Completed Date',
      descriptionColumn: 'Description',
      amountColumn: 'Amount',
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
    },
  },
  {
    id: 'fineco',
    name: 'Fineco',
    description: 'Data, Descrizione, Entrate/Uscite',
    mapping: {
      dateColumn: 'Data',
      descriptionColumn: 'Descrizione Completa',
      creditColumn: 'Entrate',
      debitColumn: 'Uscite',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
    },
  },
  {
    id: 'intesa',
    name: 'Intesa Sanpaolo',
    description: 'Data Operazione, Descrizione, Importo',
    mapping: {
      dateColumn: 'Data Operazione',
      descriptionColumn: 'Descrizione',
      amountColumn: 'Importo',
      dateFormat: 'DD/MM/YYYY',
      decimalSeparator: ',',
    },
  },
];

// ============================================================================
// CSV PARSER
// ============================================================================

/**
 * Parse a CSV file with the given column mapping
 */
export function parseCSV(
  csvContent: string,
  mapping: ColumnMapping,
  accountId: string
): ImportResult {
  const errors: string[] = [];
  const transactions: Transaction[] = [];
  let skippedRows = 0;

  // Parse CSV
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map(e => `Row ${e.row}: ${e.message}`));
  }

  // Skip initial rows if configured
  const dataRows = mapping.skipRows 
    ? parsed.data.slice(mapping.skipRows) 
    : parsed.data;

  const now = new Date().toISOString();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 1 + (mapping.skipRows ?? 0);

    try {
      // Parse date
      const dateStr = row[mapping.dateColumn]?.trim();
      if (!dateStr) {
        skippedRows++;
        continue;
      }
      const date = parseDate(dateStr, mapping.dateFormat);
      if (!date) {
        errors.push(`Row ${rowNum}: Invalid date "${dateStr}"`);
        skippedRows++;
        continue;
      }

      // Parse description
      const description = row[mapping.descriptionColumn]?.trim() || '';

      // Parse amount
      let amountCents: number;
      
      if (mapping.amountColumn) {
        // Single amount column
        const amountStr = row[mapping.amountColumn]?.trim();
        if (!amountStr) {
          skippedRows++;
          continue;
        }
        amountCents = parseAmount(amountStr, mapping.decimalSeparator ?? '.');
      } else if (mapping.debitColumn && mapping.creditColumn) {
        // Separate debit/credit columns
        const debitStr = row[mapping.debitColumn]?.trim();
        const creditStr = row[mapping.creditColumn]?.trim();
        
        const debit = debitStr ? parseAmount(debitStr, mapping.decimalSeparator ?? '.') : 0;
        const credit = creditStr ? parseAmount(creditStr, mapping.decimalSeparator ?? '.') : 0;
        
        // Debit is negative (money out), credit is positive (money in)
        amountCents = credit - debit;
      } else {
        errors.push(`Row ${rowNum}: No amount column configured`);
        skippedRows++;
        continue;
      }

      // Invert sign if configured
      if (mapping.invertSign) {
        amountCents = -amountCents;
      }

      // Skip zero amounts
      if (amountCents === 0) {
        skippedRows++;
        continue;
      }

      // Determine transaction type
      const type = amountCents > 0 ? 'income' : 'expense';
      const absAmount = Math.abs(amountCents);

      const transaction: Transaction = {
        id: randomUUID(),
        type,
        date: date.toISOString(),
        payee: description,
        amount: absAmount,
        currency: mapping.currency ?? 'EUR',
        accountId,
        categoryId: null, // User will categorize later
        toAccountId: null,
        splits: [],
        status: 'cleared',
        notes: '',
        tags: ['imported'],
        isReconciled: false,
        createdAt: now,
        updatedAt: now,
      };

      transactions.push(transaction);
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      skippedRows++;
    }
  }

  return {
    success: errors.length === 0,
    transactions,
    errors,
    skippedRows,
  };
}

/**
 * Get column headers from CSV content
 */
export function getCSVHeaders(csvContent: string): string[] {
  const parsed = Papa.parse<string[]>(csvContent, {
    preview: 1,
    header: false,
  });
  
  return parsed.data[0]?.map(h => h.trim()) ?? [];
}

/**
 * Get preview rows from CSV
 */
export function getCSVPreview(csvContent: string, rows: number = 5): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    preview: rows,
    skipEmptyLines: true,
  });
  
  return parsed.data;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse a date string with the given format
 */
function parseDate(dateStr: string, format: string): Date | null {
  // Common date formats
  const patterns: Record<string, RegExp> = {
    'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
    'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
    'DD-MM-YYYY': /^(\d{2})-(\d{2})-(\d{4})$/,
    'DD.MM.YYYY': /^(\d{2})\.(\d{2})\.(\d{4})$/,
  };

  const pattern = patterns[format];
  if (!pattern) {
    // Try to parse as ISO date
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  const match = dateStr.match(pattern);
  if (!match) return null;

  let year: number, month: number, day: number;

  switch (format) {
    case 'YYYY-MM-DD':
      [, year, month, day] = match.map(Number);
      break;
    case 'DD/MM/YYYY':
    case 'DD-MM-YYYY':
    case 'DD.MM.YYYY':
      [, day, month, year] = match.map(Number);
      break;
    case 'MM/DD/YYYY':
      [, month, day, year] = match.map(Number);
      break;
    default:
      return null;
  }

  const date = new Date(year, month - 1, day, 12, 0, 0); // Noon to avoid timezone issues
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse an amount string to cents
 */
function parseAmount(amountStr: string, decimalSeparator: '.' | ','): number {
  let cleaned = amountStr.trim();
  
  // Handle accounting negative format: (123.45) -> -123.45
  const isAccountingNegative = /^\(.*\)$/.test(cleaned);
  if (isAccountingNegative) {
    cleaned = cleaned.replace(/[()]/g, '');
  }

  // Remove currency symbols and whitespace
  cleaned = cleaned.replace(/[€$£¥\s]/g, '');
  
  // Handle European format (1.234,56) vs US format (1,234.56)
  if (decimalSeparator === ',') {
    // Remove thousand separators (.) and convert decimal (,) to (.)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove thousand separators (,)
    cleaned = cleaned.replace(/,/g, '');
  }

  const amount = parseFloat(cleaned);
  if (isNaN(amount)) {
    throw new Error(`Invalid amount: "${amountStr}"`);
  }

  const finalAmount = isAccountingNegative ? -amount : amount;

  // Convert to cents
  return Math.round(finalAmount * 100);
}
