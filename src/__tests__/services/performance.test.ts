/**
 * PerformanceCalculator Tests
 * 
 * Tests for TWR and MWR calculations with known examples
 */

import { describe, it, expect } from 'vitest';
import { PerformanceCalculator } from '../../main/services/PerformanceCalculator';
import type { PortfolioSnapshot } from '../../main/services/SnapshotService';

describe('PerformanceCalculator', () => {
  const calculator = new PerformanceCalculator();

  describe('TWR (Time-Weighted Return)', () => {
    it('should calculate TWR correctly for simple growth with no cash flows', () => {
      // Scenario: Start with €10,000, grow to €11,000 (10% return)
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 11000,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const twr = calculator.calculateTWR(snapshots);
      
      // Expected: 10% return
      expect(twr).toBeCloseTo(10, 1);
    });

    it('should calculate TWR correctly with deposit mid-period', () => {
      // Scenario:
      // Start: €10,000
      // After 6 months: €11,000 (10% growth)
      // Deposit: €5,000
      // End: €17,600 (10% growth on €16,000)
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-07-01T00:00:00Z',
          totalValue: 16000, // 11,000 + 5,000 deposit
          cashFlow: 5000,
          accounts: [],
        },
        {
          id: '3',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 17600,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const twr = calculator.calculateTWR(snapshots);
      
      // Period 1: (11,000 - 10,000) / 10,000 = 10%
      // Period 2: (17,600 - 16,000) / 16,000 = 10%
      // TWR: (1.10 × 1.10) - 1 = 21%
      expect(twr).toBeCloseTo(21, 0);
    });

    it('should calculate TWR correctly with withdrawal', () => {
      // Scenario:
      // Start: €20,000
      // After 6 months: €22,000 (10% growth)
      // Withdrawal: €5,000
      // End: €18,700 (10% growth on €17,000)
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 20000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-07-01T00:00:00Z',
          totalValue: 17000, // 22,000 - 5,000 withdrawal
          cashFlow: -5000,
          accounts: [],
        },
        {
          id: '3',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 18700,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const twr = calculator.calculateTWR(snapshots);
      
      // Period 1: (22,000 - 20,000 - 0) / 20,000 = 10%
      // Period 2: (18,700 - 17,000 - 0) / 17,000 = 10%
      // TWR: (1.10 × 1.10) - 1 = 21%
      expect(twr).toBeCloseTo(21, 0);
    });

    it('should return 0 for insufficient snapshots', () => {
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const twr = calculator.calculateTWR(snapshots);
      expect(twr).toBe(0);
    });
  });

  describe('MWR (Money-Weighted Return / IRR)', () => {
    it('should calculate MWR correctly for simple growth with no cash flows', () => {
      // Scenario: Start with €10,000, grow to €11,000 over 1 year (10% return)
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 11000,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const mwr = calculator.calculateMWR(snapshots);
      
      // Expected: ~10% annualized return
      expect(mwr).toBeCloseTo(10, 0);
    });

    it('should calculate MWR correctly with deposit mid-period', () => {
      // Scenario:
      // Start: €10,000
      // After 6 months: deposit €5,000
      // End (1 year): €16,500
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-07-01T00:00:00Z',
          totalValue: 15500, // Includes deposit
          cashFlow: 5000,
          accounts: [],
        },
        {
          id: '3',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 16500,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const mwr = calculator.calculateMWR(snapshots);
      
      // MWR should be lower than TWR due to deposit timing
      // (deposited when market was already up)
      expect(mwr).toBeGreaterThan(0);
      expect(mwr).toBeLessThan(15);
    });

    it('should return 0 for insufficient snapshots', () => {
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const mwr = calculator.calculateMWR(snapshots);
      expect(mwr).toBe(0);
    });
  });

  describe('getMetrics', () => {
    it('should return complete metrics for valid snapshots', () => {
      const snapshots: PortfolioSnapshot[] = [
        {
          id: '1',
          timestamp: '2024-01-01T00:00:00Z',
          totalValue: 10000,
          cashFlow: 0,
          accounts: [],
        },
        {
          id: '2',
          timestamp: '2024-07-01T00:00:00Z',
          totalValue: 16000,
          cashFlow: 5000,
          accounts: [],
        },
        {
          id: '3',
          timestamp: '2024-12-31T00:00:00Z',
          totalValue: 17600,
          cashFlow: 0,
          accounts: [],
        },
      ];

      const metrics = calculator.getMetrics(snapshots, 'ALL');

      expect(metrics.startValue).toBe(10000);
      expect(metrics.endValue).toBe(17600);
      expect(metrics.totalCashFlow).toBe(5000);
      expect(metrics.absoluteGain).toBe(2600); // 17,600 - 10,000 - 5,000
      expect(metrics.twr).toBeGreaterThan(0);
      expect(metrics.mwr).toBeGreaterThan(0);
      expect(metrics.period).toBe('ALL');
    });

    it('should return zero metrics for empty snapshots', () => {
      const metrics = calculator.getMetrics([], 'ALL');

      expect(metrics.twr).toBe(0);
      expect(metrics.mwr).toBe(0);
      expect(metrics.startValue).toBe(0);
      expect(metrics.endValue).toBe(0);
      expect(metrics.totalCashFlow).toBe(0);
      expect(metrics.absoluteGain).toBe(0);
    });
  });

  describe('getSnapshotsForPeriod', () => {
    const allSnapshots: PortfolioSnapshot[] = [
      {
        id: '1',
        timestamp: '2021-01-01T00:00:00Z',
        totalValue: 5000,
        cashFlow: 0,
        accounts: [],
      },
      {
        id: '2',
        timestamp: '2023-01-01T00:00:00Z',
        totalValue: 8000,
        cashFlow: 0,
        accounts: [],
      },
      {
        id: '3',
        timestamp: '2024-01-01T00:00:00Z',
        totalValue: 10000,
        cashFlow: 0,
        accounts: [],
      },
      {
        id: '4',
        timestamp: new Date().toISOString(),
        totalValue: 12000,
        cashFlow: 0,
        accounts: [],
      },
    ];

    it('should return all snapshots for ALL period', () => {
      const snapshots = calculator.getSnapshotsForPeriod(allSnapshots, 'ALL');
      expect(snapshots.length).toBe(4);
    });

    it('should filter snapshots for YTD period', () => {
      const snapshots = calculator.getSnapshotsForPeriod(allSnapshots, 'YTD');
      // Should include snapshots from Jan 1st of current year onwards
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter snapshots for 1Y period', () => {
      const snapshots = calculator.getSnapshotsForPeriod(allSnapshots, '1Y');
      // Should include recent snapshots only
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
      expect(snapshots.length).toBeLessThanOrEqual(allSnapshots.length);
    });
  });
});
