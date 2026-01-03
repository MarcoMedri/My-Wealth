/**
 * Recurring Transactions Service
 * 
 * Manages recurring transaction logic and execution.
 */

import type { RecurringTransaction, RecurrenceFrequency } from '../../shared/schemas';

export interface RecurringTransactionInput {
    description: string;
    amount: number;
    currency: string;
    category?: string;
    accountId?: string;
    frequency: RecurrenceFrequency;
    startDate: string;
    endDate?: string;
    dayOfMonth?: number;
    dayOfWeek?: number;
    notes?: string;
}

/**
 * Calculate the next execution date based on frequency
 */
export function calculateNextExecutionDate(
    frequency: RecurrenceFrequency,
    fromDate: Date,
    dayOfMonth?: number
): Date {
    const next = new Date(fromDate);
    
    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            if (dayOfMonth) {
                next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
            }
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            if (dayOfMonth) {
                next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
            }
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            if (dayOfMonth) {
                next.setDate(Math.min(dayOfMonth, getDaysInMonth(next)));
            }
            break;
    }
    
    return next;
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Create a new recurring transaction
 */
export function createRecurringTransaction(input: RecurringTransactionInput): RecurringTransaction {
    const now = new Date().toISOString();
    const startDate = new Date(input.startDate);
    
    return {
        id: crypto.randomUUID(),
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        accountId: input.accountId,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate,
        dayOfMonth: input.dayOfMonth,
        dayOfWeek: input.dayOfWeek,
        nextExecutionDate: startDate.toISOString(),
        isActive: true,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Check if a recurring transaction is due for execution
 */
export function isDue(recurring: RecurringTransaction, today: Date = new Date()): boolean {
    if (!recurring.isActive) return false;
    
    const nextExecution = new Date(recurring.nextExecutionDate);
    
    // Check if end date has passed
    if (recurring.endDate) {
        const endDate = new Date(recurring.endDate);
        if (today > endDate) return false;
    }
    
    return today >= nextExecution;
}

/**
 * Get all due recurring transactions
 */
export function getDueRecurrings(
    recurrings: RecurringTransaction[],
    today: Date = new Date()
): RecurringTransaction[] {
    return recurrings.filter(r => isDue(r, today));
}

/**
 * Execute a recurring transaction (update dates)
 */
export function execute(recurring: RecurringTransaction): RecurringTransaction {
    const today = new Date();
    const nextExecution = calculateNextExecutionDate(
        recurring.frequency,
        new Date(recurring.nextExecutionDate),
        recurring.dayOfMonth
    );
    
    return {
        ...recurring,
        lastExecutedDate: today.toISOString(),
        nextExecutionDate: nextExecution.toISOString(),
        updatedAt: today.toISOString(),
    };
}

/**
 * Get frequency label for display
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
    const labels: Record<RecurrenceFrequency, string> = {
        daily: 'Daily',
        weekly: 'Weekly',
        biweekly: 'Every 2 weeks',
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        yearly: 'Yearly',
    };
    return labels[frequency];
}
