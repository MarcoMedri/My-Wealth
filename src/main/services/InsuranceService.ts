/**
 * Insurance Service
 * 
 * Business logic for insurance policy management.
 * Separates business rules from data persistence.
 */

import { randomUUID } from 'crypto';
import type { InsurancePolicy } from '../../shared/schemas';

export interface CreateInsuranceInput {
    name: string;
    provider: string;
    type: InsurancePolicy['type'];
    policyNumber: string;
    premiumAmount: number;
    premiumPeriod: InsurancePolicy['premiumPeriod'];
    startDate: string;
    currency: string;
    currentValue?: number;
    coverageAmount?: number;
    insuredEntity?: string;
    deductible?: number;
    contactInfo?: string;
    endDate?: string;
    nextPaymentDate?: string;
    autoRenewal?: boolean;
    notes?: string;
}

export interface UpdateInsuranceInput extends Partial<CreateInsuranceInput> {
    id: string;
}

export class InsuranceService {
    
    /**
     * Create a new insurance policy
     */
    create(input: CreateInsuranceInput): InsurancePolicy {
        const now = new Date().toISOString();
        
        return {
            id: randomUUID(),
            name: input.name,
            provider: input.provider,
            type: input.type,
            policyNumber: input.policyNumber,
            premiumAmount: input.premiumAmount,
            premiumPeriod: input.premiumPeriod,
            startDate: input.startDate,
            currency: input.currency,
            currentValue: input.currentValue || 0,
            coverageAmount: input.coverageAmount,
            insuredEntity: input.insuredEntity,
            deductible: input.deductible,
            contactInfo: input.contactInfo,
            endDate: input.endDate,
            nextPaymentDate: input.nextPaymentDate,
            autoRenewal: input.autoRenewal ?? false,
            notes: input.notes,
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * Update an existing policy
     */
    update(existing: InsurancePolicy, input: UpdateInsuranceInput): InsurancePolicy {
        return {
            ...existing,
            ...input,
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Calculate annual premium from any period
     */
    calculateAnnualPremium(policy: InsurancePolicy): number {
        const multiplier: Record<string, number> = {
            monthly: 12,
            quarterly: 4,
            semiannual: 2,
            annual: 1,
            'one-time': 0
        };
        
        return policy.premiumAmount * (multiplier[policy.premiumPeriod] ?? 1);
    }

    /**
     * Check if policy is expiring soon
     */
    isExpiringSoon(policy: InsurancePolicy, daysThreshold: number = 30): boolean {
        if (!policy.endDate) return false;
        
        const now = new Date();
        const endDate = new Date(policy.endDate);
        const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        return daysUntilEnd > 0 && daysUntilEnd <= daysThreshold;
    }

    /**
     * Calculate estimated accumulated value for life insurance
     * (Simple projection based on premiums paid + growth rate)
     */
    estimateAccumulatedValue(policy: InsurancePolicy, annualGrowthRate: number = 0.03): number {
        if (policy.type !== 'life') return 0;
        
        const startDate = new Date(policy.startDate);
        const now = new Date();
        const yearsActive = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        if (yearsActive <= 0) return 0;
        
        const annualPremium = this.calculateAnnualPremium(policy);
        const totalPremiumsPaid = annualPremium * yearsActive;
        
        // Compound growth estimation
        return Math.round(totalPremiumsPaid * Math.pow(1 + annualGrowthRate, yearsActive));
    }
}

export const insuranceService = new InsuranceService();
