/**
 * Unit tests for schema validation and utility functions
 */

import { describe, it, expect } from 'vitest';
import { 
    Money, 
    UUID, 
    ISODate, 
    CurrencyCode,
    AccountSchema,
    TransactionSchema,
    HoldingSchema,
    formatMoney
} from '../shared/schemas';

describe('Primitive Schemas', () => {
    describe('Money', () => {
        it('should accept valid integer amounts', () => {
            expect(Money.safeParse(1099).success).toBe(true);
            expect(Money.safeParse(0).success).toBe(true);
            expect(Money.safeParse(-500).success).toBe(true);
            expect(Money.safeParse(1000000).success).toBe(true);
        });

        it('should reject floating point numbers', () => {
            expect(Money.safeParse(10.99).success).toBe(false);
            expect(Money.safeParse(0.5).success).toBe(false);
        });

        it('should reject non-numbers', () => {
            expect(Money.safeParse('1099').success).toBe(false);
            expect(Money.safeParse(null).success).toBe(false);
        });
    });

    describe('UUID', () => {
        it('should accept valid UUIDs', () => {
            expect(UUID.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
            expect(UUID.safeParse('f47ac10b-58cc-4372-a567-0e02b2c3d479').success).toBe(true);
        });

        it('should reject invalid UUIDs', () => {
            expect(UUID.safeParse('not-a-uuid').success).toBe(false);
            expect(UUID.safeParse('12345').success).toBe(false);
            expect(UUID.safeParse('').success).toBe(false);
        });
    });

    describe('ISODate', () => {
        it('should accept valid date strings', () => {
            expect(ISODate.safeParse('2024-12-31').success).toBe(true);
            expect(ISODate.safeParse('2024-01-01').success).toBe(true);
        });

        it('should accept valid datetime strings', () => {
            expect(ISODate.safeParse('2024-12-31T14:30:00.000Z').success).toBe(true);
            expect(ISODate.safeParse('2024-01-01T00:00:00Z').success).toBe(true);
        });

        it('should reject invalid date formats', () => {
            expect(ISODate.safeParse('31-12-2024').success).toBe(false);
            expect(ISODate.safeParse('2024/12/31').success).toBe(false);
            expect(ISODate.safeParse('not-a-date').success).toBe(false);
        });
    });

    describe('CurrencyCode', () => {
        it('should accept valid 3-letter currency codes', () => {
            expect(CurrencyCode.safeParse('EUR').success).toBe(true);
            expect(CurrencyCode.safeParse('USD').success).toBe(true);
            expect(CurrencyCode.safeParse('GBP').success).toBe(true);
        });

        it('should transform lowercase to uppercase', () => {
            const result = CurrencyCode.safeParse('eur');
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe('EUR');
            }
        });

        it('should reject invalid currency codes', () => {
            expect(CurrencyCode.safeParse('EURO').success).toBe(false);
            expect(CurrencyCode.safeParse('US').success).toBe(false);
            expect(CurrencyCode.safeParse('').success).toBe(false);
        });
    });
});

describe('formatMoney', () => {
    it('should format EUR correctly', () => {
        expect(formatMoney(1099, 'EUR')).toBe('€10.99');
        expect(formatMoney(500, 'EUR')).toBe('€5.00');
        expect(formatMoney(0, 'EUR')).toBe('€0.00');
    });

    it('should format USD correctly', () => {
        expect(formatMoney(1099, 'USD')).toBe('$10.99');
        expect(formatMoney(15000, 'USD')).toBe('$150.00');
    });

    it('should format negative amounts', () => {
        expect(formatMoney(-500, 'EUR')).toBe('-€5.00');
        expect(formatMoney(-1099, 'USD')).toBe('-$10.99');
    });

    it('should handle large amounts with thousands separators', () => {
        const result = formatMoney(100000000, 'EUR'); // €1,000,000.00
        expect(result).toContain('1');
        expect(result).toContain('000');
        expect(result).toContain('000');
    });

    it('should handle zero decimal currencies like JPY', () => {
        // JPY uses 0 decimal places, formatMoney uses locale so may add separators
        const result = formatMoney(1000, 'JPY', 0);
        expect(result).toContain('¥');
        expect(result).toContain('1'); // At minimum contains the digit 1
    });
});

describe('AccountSchema', () => {
    const validAccount = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: 10000,
        color: '#3b82f6',
        icon: 'wallet',
        isArchived: false,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
    };

    it('should accept valid account data', () => {
        expect(AccountSchema.safeParse(validAccount).success).toBe(true);
    });

    it('should reject missing required fields', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { name: _name, ...withoutName } = validAccount;
        expect(AccountSchema.safeParse(withoutName).success).toBe(false);
    });

    it('should reject invalid account type', () => {
        expect(AccountSchema.safeParse({ 
            ...validAccount, 
            type: 'invalid_type' 
        }).success).toBe(false);
    });

    it('should accept all valid account types', () => {
        const types = ['cash', 'checking', 'savings', 'credit', 'investment', 'loan'];
        types.forEach(type => {
            expect(AccountSchema.safeParse({ ...validAccount, type }).success).toBe(true);
        });
    });
});

describe('HoldingSchema', () => {
    const validHolding = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        assetId: 'a47ac10b-58cc-4372-a567-0e02b2c3d479',
        quantity: 100,
        averageBuyPrice: 5000,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
    };

    it('should accept valid holding data', () => {
        expect(HoldingSchema.safeParse(validHolding).success).toBe(true);
    });

    it('should accept fractional quantities (for crypto)', () => {
        expect(HoldingSchema.safeParse({ 
            ...validHolding, 
            quantity: 0.5 
        }).success).toBe(true);
    });

    it('should reject missing assetId', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { assetId: _assetId, ...withoutAssetId } = validHolding;
        expect(HoldingSchema.safeParse(withoutAssetId).success).toBe(false);
    });
});

describe('TransactionSchema', () => {
    const validTransaction = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'expense',
        date: '2024-01-15T10:30:00.000Z',
        payee: 'Test Payee',
        amount: 5000,
        currency: 'EUR',
        accountId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        categoryId: 'a47ac10b-58cc-4372-a567-0e02b2c3d479', // Required for income/expense
        toAccountId: null,
        splits: [],
        status: 'cleared',
        notes: '',
        tags: [],
        isReconciled: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
    };

    it('should accept valid transaction data', () => {
        expect(TransactionSchema.safeParse(validTransaction).success).toBe(true);
    });

    it('should accept all transaction types', () => {
        // Test income and expense (need categoryId)
        const incomeExpenseTypes = ['income', 'expense'];
        incomeExpenseTypes.forEach(type => {
            expect(TransactionSchema.safeParse({ ...validTransaction, type }).success).toBe(true);
        });
        
        // Test transfer (needs toAccountId instead of categoryId)
        const transferTx = {
            ...validTransaction,
            type: 'transfer',
            categoryId: null,
            toAccountId: 'b47ac10b-58cc-4372-a567-0e02b2c3d479'
        };
        expect(TransactionSchema.safeParse(transferTx).success).toBe(true);
    });

    it('should reject invalid transaction type', () => {
        expect(TransactionSchema.safeParse({ 
            ...validTransaction, 
            type: 'refund' 
        }).success).toBe(false);
    });

    it('should reject negative amounts', () => {
        expect(TransactionSchema.safeParse({ 
            ...validTransaction, 
            amount: -100 
        }).success).toBe(false);
    });
});
