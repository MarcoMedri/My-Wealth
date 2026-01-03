/**
 * Unit tests for performance calculation functions
 * Tests TWR (Time-Weighted Return) and XIRR (Money-Weighted Return)
 */

import { describe, it, expect } from 'vitest';
import { calculateTWR, calculateXIRR, type PeriodSnapshot, type CashFlow } from '../../shared/math/performance';

describe('calculateTWR', () => {
    it('should return 0 for empty snapshots', () => {
        expect(calculateTWR([])).toBe(0);
    });

    it('should calculate 10% return for simple growth', () => {
        // €10,000 → €11,000 = +10%
        const snapshots: PeriodSnapshot[] = [{
            date: new Date('2024-01-01'),
            startValue: 1000000, // €10,000 in cents
            endValue: 1100000,   // €11,000 in cents
            flows: 0
        }];

        const result = calculateTWR(snapshots);
        expect(result).toBeCloseTo(0.10, 2); // 10%
    });

    it('should calculate negative return for loss', () => {
        // €10,000 → €9,000 = -10%
        const snapshots: PeriodSnapshot[] = [{
            date: new Date('2024-01-01'),
            startValue: 1000000,
            endValue: 900000,
            flows: 0
        }];

        const result = calculateTWR(snapshots);
        expect(result).toBeCloseTo(-0.10, 2); // -10%
    });

    it('should isolate return from cash flows', () => {
        // Start: €10,000, Deposit: €5,000, End: €16,500
        // Without deposit effect, underlying return should be ~10%
        // Gain = End - Start - Flows = 16,500 - 10,000 - 5,000 = 1,500
        // Return = 1,500 / 10,000 = 15%
        const snapshots: PeriodSnapshot[] = [{
            date: new Date('2024-01-01'),
            startValue: 1000000,  // €10,000
            endValue: 1650000,    // €16,500
            flows: 500000         // €5,000 deposit
        }];

        const result = calculateTWR(snapshots);
        expect(result).toBeCloseTo(0.15, 2); // 15%
    });

    it('should compound multiple periods correctly', () => {
        // Period 1: €10,000 → €11,000 = +10%
        // Period 2: €11,000 → €12,100 = +10%
        // Compound: 1.1 * 1.1 - 1 = 21%
        const snapshots: PeriodSnapshot[] = [
            {
                date: new Date('2024-01-01'),
                startValue: 1000000,
                endValue: 1100000,
                flows: 0
            },
            {
                date: new Date('2024-02-01'),
                startValue: 1100000,
                endValue: 1210000,
                flows: 0
            }
        ];

        const result = calculateTWR(snapshots);
        expect(result).toBeCloseTo(0.21, 2); // 21%
    });

    it('should skip period with zero start value', () => {
        const snapshots: PeriodSnapshot[] = [
            {
                date: new Date('2024-01-01'),
                startValue: 0,
                endValue: 1000000,
                flows: 1000000
            },
            {
                date: new Date('2024-02-01'),
                startValue: 1000000,
                endValue: 1100000,
                flows: 0
            }
        ];

        const result = calculateTWR(snapshots);
        expect(result).toBeCloseTo(0.10, 2); // Only second period counts: 10%
    });
});

describe('calculateXIRR', () => {
    it('should return 0 for less than 2 flows', () => {
        const flows: CashFlow[] = [{ date: new Date('2024-01-01'), amount: -10000 }];
        expect(calculateXIRR(flows)).toBe(0);
    });

    it('should return 0 if no positive and negative flows', () => {
        // All deposits, no final value (no sell)
        const flows: CashFlow[] = [
            { date: new Date('2024-01-01'), amount: -10000 },
            { date: new Date('2024-06-01'), amount: -5000 }
        ];
        expect(calculateXIRR(flows)).toBe(0);
    });

    it('should calculate ~10% annual return for simple investment', () => {
        // Invest €10,000, receive €11,000 after 1 year
        const flows: CashFlow[] = [
            { date: new Date('2024-01-01'), amount: -1000000 }, // Invest €10,000
            { date: new Date('2025-01-01'), amount: 1100000 }   // Receive €11,000
        ];

        const result = calculateXIRR(flows);
        expect(result).toBeCloseTo(0.10, 1); // ~10%
    });

    it('should calculate return for multiple investments', () => {
        // Jan: Invest €10,000
        // Jul: Invest €5,000
        // Dec: Portfolio worth €16,500 (final "withdrawal")
        const flows: CashFlow[] = [
            { date: new Date('2024-01-01'), amount: -1000000 },
            { date: new Date('2024-07-01'), amount: -500000 },
            { date: new Date('2024-12-31'), amount: 1650000 }
        ];

        const result = calculateXIRR(flows);
        // Should be positive but less than the simple 10% scenario
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(0.20);
    });

    it('should handle 2-year investment period', () => {
        // Invest €10,000, receive €12,100 after 2 years (~10% annual compounded)
        const flows: CashFlow[] = [
            { date: new Date('2024-01-01'), amount: -1000000 },
            { date: new Date('2026-01-01'), amount: 1210000 }
        ];

        const result = calculateXIRR(flows);
        expect(result).toBeCloseTo(0.10, 1); // ~10% annualized
    });
});
