/**
 * DepositService Tests
 * Tests for deposit interest calculations, maturity dates, and accrued interest.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DepositService } from '../../main/services/DepositService';
import type { DepositAccount } from '../../shared/schemas';

describe('DepositService', () => {
    let service: DepositService;

    beforeEach(() => {
        service = new DepositService();
    });

    // Helper to create a deposit for testing
    const createTestDeposit = (overrides: Partial<DepositAccount> = {}): DepositAccount => ({
        id: 'test-deposit-1',
        name: 'Test Deposit',
        principal: 1000000, // €10,000 in cents
        grossRate: 4.0,
        netRate: 3.0,
        interestPeriodicity: 'annual',
        activationDate: '2025-01-01',
        durationMonths: 12,
        maturityDate: '2026-01-01',
        constraintType: 'locked',
        currency: 'EUR',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        ...overrides,
    });

    describe('calculateExpectedInterest', () => {
        it('should calculate simple interest correctly for 1 year', () => {
            const deposit = createTestDeposit({
                principal: 1000000, // €10,000
                netRate: 3.0,
                durationMonths: 12,
            });

            const interest = service.calculateExpectedInterest(deposit);
            // €10,000 * 3% * 1 year = €300 = 30000 cents
            expect(interest).toBe(30000);
        });

        it('should calculate interest for 6 months', () => {
            const deposit = createTestDeposit({
                principal: 1000000, // €10,000
                netRate: 4.0,
                durationMonths: 6,
            });

            const interest = service.calculateExpectedInterest(deposit);
            // €10,000 * 4% * 0.5 year = €200 = 20000 cents
            expect(interest).toBe(20000);
        });

        it('should calculate interest for 24 months', () => {
            const deposit = createTestDeposit({
                principal: 5000000, // €50,000
                netRate: 2.5,
                durationMonths: 24,
            });

            const interest = service.calculateExpectedInterest(deposit);
            // €50,000 * 2.5% * 2 years = €2,500 = 250000 cents
            expect(interest).toBe(250000);
        });

        it('should handle 0% interest rate', () => {
            const deposit = createTestDeposit({
                principal: 1000000,
                netRate: 0,
                durationMonths: 12,
            });

            const interest = service.calculateExpectedInterest(deposit);
            expect(interest).toBe(0);
        });
    });

    describe('calculateMaturityValue', () => {
        it('should return principal plus interest', () => {
            const deposit = createTestDeposit({
                principal: 1000000, // €10,000
                netRate: 3.0,
                durationMonths: 12,
            });

            const maturityValue = service.calculateMaturityValue(deposit);
            // €10,000 + €300 = €10,300 = 1030000 cents
            expect(maturityValue).toBe(1030000);
        });
    });

    describe('calculateMaturityDate', () => {
        it('should add months correctly', () => {
            const result = service.calculateMaturityDate('2025-01-15', 12);
            expect(result).toContain('2026-01');
        });

        it('should handle crossing year boundary', () => {
            const result = service.calculateMaturityDate('2025-06-01', 12);
            expect(result).toContain('2026-06');
        });

        it('should handle short durations', () => {
            const result = service.calculateMaturityDate('2025-01-15', 3);
            // 3 months from Jan 15 should be around April 15
            expect(result).toContain('2025-04');
        });
    });

    describe('getDaysUntilMaturity', () => {
        it('should return positive days for future maturity', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            
            const deposit = createTestDeposit({
                maturityDate: futureDate.toISOString(),
            });

            const days = service.getDaysUntilMaturity(deposit);
            expect(days).toBeGreaterThan(0);
            expect(days).toBeLessThanOrEqual(31);
        });

        it('should return negative days for past maturity', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10);
            
            const deposit = createTestDeposit({
                maturityDate: pastDate.toISOString(),
            });

            const days = service.getDaysUntilMaturity(deposit);
            expect(days).toBeLessThan(0);
        });
    });

    describe('isMaturingSoon', () => {
        it('should return true if maturing within threshold', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);
            
            const deposit = createTestDeposit({
                maturityDate: futureDate.toISOString(),
            });

            expect(service.isMaturingSoon(deposit, 30)).toBe(true);
        });

        it('should return false if maturing after threshold', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 60);
            
            const deposit = createTestDeposit({
                maturityDate: futureDate.toISOString(),
            });

            expect(service.isMaturingSoon(deposit, 30)).toBe(false);
        });

        it('should return false if already matured', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);
            
            const deposit = createTestDeposit({
                maturityDate: pastDate.toISOString(),
            });

            expect(service.isMaturingSoon(deposit)).toBe(false);
        });
    });

    describe('hasMatured', () => {
        it('should return true for past maturity date', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 10);
            
            const deposit = createTestDeposit({
                maturityDate: pastDate.toISOString(),
            });

            expect(service.hasMatured(deposit)).toBe(true);
        });

        it('should return false for future maturity date', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            
            const deposit = createTestDeposit({
                maturityDate: futureDate.toISOString(),
            });

            expect(service.hasMatured(deposit)).toBe(false);
        });
    });

    describe('calculateAccruedInterest', () => {
        it('should return 0 if not yet activated', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            
            const deposit = createTestDeposit({
                activationDate: futureDate.toISOString(),
                maturityDate: new Date(futureDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

            const accrued = service.calculateAccruedInterest(deposit);
            expect(accrued).toBe(0);
        });

        it('should return full interest if already matured', () => {
            const pastActivation = new Date();
            pastActivation.setFullYear(pastActivation.getFullYear() - 2);
            
            const pastMaturity = new Date();
            pastMaturity.setFullYear(pastMaturity.getFullYear() - 1);
            
            const deposit = createTestDeposit({
                principal: 1000000,
                netRate: 3.0,
                durationMonths: 12,
                activationDate: pastActivation.toISOString(),
                maturityDate: pastMaturity.toISOString(),
            });

            const accrued = service.calculateAccruedInterest(deposit);
            const expected = service.calculateExpectedInterest(deposit);
            expect(accrued).toBe(expected);
        });

        it('should return prorated interest for mid-term deposit', () => {
            // For a deposit that's 50% through its term
            const activation = new Date();
            activation.setMonth(activation.getMonth() - 6); // 6 months ago
            
            const maturity = new Date();
            maturity.setMonth(maturity.getMonth() + 6); // 6 months from now
            
            const deposit = createTestDeposit({
                principal: 1000000, // €10,000
                netRate: 4.0,
                durationMonths: 12,
                activationDate: activation.toISOString(),
                maturityDate: maturity.toISOString(),
            });

            const accrued = service.calculateAccruedInterest(deposit);
            const fullInterest = service.calculateExpectedInterest(deposit); // 40000 cents
            
            // Should be approximately 50% of full interest
            expect(accrued).toBeGreaterThan(fullInterest * 0.4);
            expect(accrued).toBeLessThan(fullInterest * 0.6);
        });
    });

    describe('create', () => {
        it('should create deposit with all fields', () => {
            const input = {
                name: 'New Deposit',
                principal: 5000000,
                grossRate: 4.5,
                netRate: 3.5,
                interestPeriodicity: 'annual' as const,
                activationDate: '2025-02-01',
                durationMonths: 18,
                maturityDate: '2026-08-01',
                constraintType: 'locked' as const,
                currency: 'EUR',
            };

            const deposit = service.create(input);

            expect(deposit.id).toBeDefined();
            expect(deposit.name).toBe('New Deposit');
            expect(deposit.principal).toBe(5000000);
            expect(deposit.netRate).toBe(3.5);
            expect(deposit.createdAt).toBeDefined();
        });
    });

    describe('update', () => {
        it('should update deposit fields', () => {
            const existing = createTestDeposit();
            const updated = service.update(existing, {
                id: existing.id,
                name: 'Updated Name',
                principal: 2000000,
            });

            expect(updated.name).toBe('Updated Name');
            expect(updated.principal).toBe(2000000);
            expect(updated.netRate).toBe(3.0); // unchanged
            expect(updated.updatedAt).not.toBe(existing.updatedAt);
        });
    });
});
