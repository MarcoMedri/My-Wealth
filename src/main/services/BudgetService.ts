/**
 * Budget Service
 * 
 * Budget management and spending tracking.
 */

import type { Budget, BudgetPeriod, Transaction } from '../../shared/schemas';

export interface BudgetInput {
    name: string;
    category?: string;
    limitAmount: number;
    currency: string;
    period: BudgetPeriod;
    color?: string;
    rollover?: boolean;
    notes?: string;
}

export interface BudgetWithProgress extends Budget {
    spent: number;
    remaining: number;
    percentUsed: number;
    isOverBudget: boolean;
}

/**
 * Create a new budget
 */
export function createBudget(input: BudgetInput): Budget {
    const now = new Date().toISOString();
    
    return {
        id: crypto.randomUUID(),
        name: input.name,
        category: input.category,
        limitAmount: input.limitAmount,
        currency: input.currency,
        period: input.period,
        color: input.color || '#6366f1',
        rollover: input.rollover || false,
        isActive: true,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Get period start and end dates
 */
export function getPeriodDates(period: BudgetPeriod, referenceDate: Date = new Date()): { start: Date; end: Date } {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    
    switch (period) {
        case 'monthly':
            return {
                start: new Date(year, month, 1),
                end: new Date(year, month + 1, 0, 23, 59, 59),
            };
        case 'quarterly': {
            const quarterStart = Math.floor(month / 3) * 3;
            return {
                start: new Date(year, quarterStart, 1),
                end: new Date(year, quarterStart + 3, 0, 23, 59, 59),
            };
        }
        case 'yearly':
            return {
                start: new Date(year, 0, 1),
                end: new Date(year, 11, 31, 23, 59, 59),
            };
    }
}

/**
 * Calculate spent amount for a budget
 */
export function calculateSpent(
    budget: Budget,
    transactions: Transaction[],
    referenceDate: Date = new Date()
): number {
    const { start, end } = getPeriodDates(budget.period, referenceDate);
    
    return transactions
        .filter(tx => {
            const txDate = new Date(tx.date);
            if (txDate < start || txDate > end) return false;
            if (tx.amount >= 0) return false; // Only expenses (negative amounts)
            if (budget.category && tx.categoryId !== budget.category) return false;
            return true;
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
}

/**
 * Get budget with progress information
 */
export function getBudgetWithProgress(
    budget: Budget,
    transactions: Transaction[],
    referenceDate: Date = new Date()
): BudgetWithProgress {
    const spent = calculateSpent(budget, transactions, referenceDate);
    const remaining = Math.max(0, budget.limitAmount - spent);
    const percentUsed = (spent / budget.limitAmount) * 100;
    const isOverBudget = spent > budget.limitAmount;
    
    return {
        ...budget,
        spent,
        remaining,
        percentUsed,
        isOverBudget,
    };
}

/**
 * Get all budgets with progress
 */
export function getAllBudgetsWithProgress(
    budgets: Budget[],
    transactions: Transaction[],
    referenceDate: Date = new Date()
): BudgetWithProgress[] {
    return budgets
        .filter(b => b.isActive)
        .map(b => getBudgetWithProgress(b, transactions, referenceDate));
}

/**
 * Get period label for display
 */
export function getPeriodLabel(period: BudgetPeriod): string {
    const labels: Record<BudgetPeriod, string> = {
        monthly: 'Monthly',
        quarterly: 'Quarterly',
        yearly: 'Yearly',
    };
    return labels[period];
}

/**
 * Check if budget is at risk (>80% used)
 */
export function isAtRisk(budgetWithProgress: BudgetWithProgress): boolean {
    return budgetWithProgress.percentUsed >= 80 && !budgetWithProgress.isOverBudget;
}
