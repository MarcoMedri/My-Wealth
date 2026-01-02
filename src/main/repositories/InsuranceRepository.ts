/**
 * Insurance Repository
 * 
 * File-based persistence for insurance policies.
 */

import { BaseRepository } from './BaseRepository';
import { InsurancePolicySchema, type InsurancePolicy } from '../../shared/schemas';

export class InsuranceRepository extends BaseRepository<InsurancePolicy> {
    
    constructor(vaultPath: string) {
        super(
            { vaultPath, fileName: 'insurance.json' },
            InsurancePolicySchema
        );
    }

    protected extractItems(content: unknown): unknown[] {
        if (typeof content === 'object' && content !== null) {
            const obj = content as Record<string, unknown>;
            // Handle both 'policies' and 'insurance' keys for backwards compatibility
            if (Array.isArray(obj.policies)) return obj.policies;
            if (Array.isArray(obj.insurance)) return obj.insurance;
        }
        return [];
    }

    protected wrapItems(items: InsurancePolicy[]): object {
        return {
            version: 1,
            policies: items
        };
    }

    protected getId(item: InsurancePolicy): string {
        return item.id;
    }

    /**
     * Get policies by type
     */
    findByType(type: string): InsurancePolicy[] {
        return this.data.filter(p => p.type === type);
    }

    /**
     * Get total current value of all policies
     */
    getTotalValue(): number {
        return this.data.reduce((sum, p) => sum + (p.currentValue || 0), 0);
    }

    /**
     * Get total annual premiums
     */
    getTotalAnnualPremiums(): number {
        return this.data.reduce((sum, p) => {
            const multiplier: Record<string, number> = {
                monthly: 12,
                quarterly: 4,
                semiannual: 2,
                annual: 1,
                'one-time': 0
            };
            
            return sum + (p.premiumAmount * (multiplier[p.premiumPeriod] ?? 1));
        }, 0);
    }
}
