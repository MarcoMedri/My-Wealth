/**
 * Deposit Service
 * 
 * Business logic for deposit account management.
 */

import { randomUUID } from 'crypto';
import type { DepositAccount } from '../../shared/schemas';

export interface CreateDepositInput {
    name: string;
    principal: number;
    grossRate: number;
    netRate: number;
    interestPeriodicity: DepositAccount['interestPeriodicity'];
    activationDate: string;
    durationMonths: number;
    maturityDate: string;
    constraintType: DepositAccount['constraintType'];
    currency: string;
    brokerId?: string;
    notes?: string;
}

export interface UpdateDepositInput extends Partial<CreateDepositInput> {
    id: string;
}

export class DepositService {
    
    /**
     * Create a new deposit account
     */
    create(input: CreateDepositInput): DepositAccount {
        const now = new Date().toISOString();
        
        return {
            id: randomUUID(),
            name: input.name,
            principal: input.principal,
            grossRate: input.grossRate,
            netRate: input.netRate,
            interestPeriodicity: input.interestPeriodicity,
            activationDate: input.activationDate,
            durationMonths: input.durationMonths,
            maturityDate: input.maturityDate,
            constraintType: input.constraintType,
            currency: input.currency,
            brokerId: input.brokerId,
            notes: input.notes,
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * Update an existing deposit
     */
    update(existing: DepositAccount, input: UpdateDepositInput): DepositAccount {
        return {
            ...existing,
            ...input,
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Calculate maturity date from activation date and duration
     */
    calculateMaturityDate(activationDate: string, durationMonths: number): string {
        const date = new Date(activationDate);
        date.setMonth(date.getMonth() + durationMonths);
        return date.toISOString();
    }

    /**
     * Calculate expected interest at maturity
     */
    calculateExpectedInterest(deposit: DepositAccount): number {
        const principal = deposit.principal;
        const rate = deposit.netRate / 100;
        const years = deposit.durationMonths / 12;
        
        // Simple interest: P * r * t
        return Math.round(principal * rate * years);
    }

    /**
     * Calculate total value at maturity (principal + interest)
     */
    calculateMaturityValue(deposit: DepositAccount): number {
        return deposit.principal + this.calculateExpectedInterest(deposit);
    }

    /**
     * Calculate days until maturity
     */
    getDaysUntilMaturity(deposit: DepositAccount): number {
        const now = new Date();
        const maturity = new Date(deposit.maturityDate);
        const diff = maturity.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Check if deposit is maturing soon
     */
    isMaturingSoon(deposit: DepositAccount, daysThreshold: number = 30): boolean {
        const days = this.getDaysUntilMaturity(deposit);
        return days > 0 && days <= daysThreshold;
    }

    /**
     * Check if deposit has matured
     */
    hasMatured(deposit: DepositAccount): boolean {
        return this.getDaysUntilMaturity(deposit) <= 0;
    }

    /**
     * Calculate current accrued interest (prorated)
     */
    calculateAccruedInterest(deposit: DepositAccount): number {
        const now = new Date();
        const activation = new Date(deposit.activationDate);
        const maturity = new Date(deposit.maturityDate);
        
        const totalDuration = maturity.getTime() - activation.getTime();
        const elapsed = now.getTime() - activation.getTime();
        
        if (elapsed <= 0) return 0;
        if (elapsed >= totalDuration) return this.calculateExpectedInterest(deposit);
        
        const ratio = elapsed / totalDuration;
        return Math.round(this.calculateExpectedInterest(deposit) * ratio);
    }
}

export const depositService = new DepositService();
