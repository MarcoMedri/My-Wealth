/**
 * Deposit Repository
 * 
 * File-based persistence for deposit accounts.
 */

import { BaseRepository } from './BaseRepository';
import { DepositAccountSchema, type DepositAccount } from '../../shared/schemas';

export class DepositRepository extends BaseRepository<DepositAccount> {
    
    constructor(vaultPath: string) {
        super(
            { vaultPath, fileName: 'deposits.json' },
            DepositAccountSchema
        );
    }

    protected extractItems(content: unknown): unknown[] {
        if (typeof content === 'object' && content !== null) {
            const obj = content as Record<string, unknown>;
            if (Array.isArray(obj.deposits)) return obj.deposits;
        }
        return [];
    }

    protected wrapItems(items: DepositAccount[]): object {
        return {
            version: 1,
            deposits: items
        };
    }

    protected getId(item: DepositAccount): string {
        return item.id;
    }

    /**
     * Get deposits by broker ID
     */
    findByBrokerId(brokerId: string): DepositAccount[] {
        return this.data.filter(d => d.brokerId === brokerId);
    }

    /**
     * Get total principal of all deposits
     */
    getTotalPrincipal(): number {
        return this.data.reduce((sum, d) => sum + d.principal, 0);
    }

    /**
     * Get deposits maturing within N days
     */
    getMaturingSoon(days: number = 30): DepositAccount[] {
        const now = new Date();
        const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return this.data.filter(d => {
            const maturity = new Date(d.maturityDate);
            return maturity <= threshold && maturity >= now;
        });
    }

    /**
     * Calculate expected interest for a deposit
     */
    calculateExpectedInterest(deposit: DepositAccount): number {
        const principal = deposit.principal;
        const rate = deposit.netRate / 100;
        const months = deposit.durationMonths;
        
        // Simple interest calculation
        return Math.round(principal * rate * (months / 12));
    }
}
