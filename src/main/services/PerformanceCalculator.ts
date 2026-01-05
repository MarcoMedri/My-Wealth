/**
 * PerformanceCalculator
 * 
 * Calculates advanced portfolio performance metrics:
 * - TWR (Time-Weighted Return): Eliminates impact of cash flows
 * - MWR (Money-Weighted Return / IRR): Accounts for timing of cash flows
 * 
 * TWR is best for judging investment strategy.
 * MWR is best for measuring personal return.
 */

import { PortfolioSnapshot } from './SnapshotService';
import { createLogger } from './LoggerService';

const logger = createLogger('PerformanceCalculator');

export interface PerformanceMetrics {
  twr: number; // Time-Weighted Return (%)
  mwr: number; // Money-Weighted Return (%)
  startValue: number;
  endValue: number;
  totalCashFlow: number;
  absoluteGain: number;
  period: string;
}

export class PerformanceCalculator {
  /**
   * Calculate Time-Weighted Return (TWR)
   * 
   * Formula: TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
   * Where Ri = (Ending Value - Beginning Value - Cash Flow) / Beginning Value
   * 
   * This eliminates the impact of deposits/withdrawals timing.
   */
  calculateTWR(snapshots: PortfolioSnapshot[]): number {
    if (snapshots.length < 2) {
      logger.warn('Not enough snapshots for TWR calculation', { count: snapshots.length });
      return 0;
    }

    let cumulativeReturn = 1;

    for (let i = 1; i < snapshots.length; i++) {
      const prevSnapshot = snapshots[i - 1];
      const currSnapshot = snapshots[i];

      const beginningValue = prevSnapshot.totalValue;
      const endingValue = currSnapshot.totalValue;
      const cashFlow = currSnapshot.cashFlow;

      // Period return = (Ending - Beginning - CashFlow) / Beginning
      const periodReturn = (endingValue - beginningValue - cashFlow) / beginningValue;

      // Chain-link returns
      cumulativeReturn *= (1 + periodReturn);
    }

    const twr = (cumulativeReturn - 1) * 100;

    logger.debug('TWR calculated', {
      snapshots: snapshots.length,
      twr: twr.toFixed(2),
    });

    return twr;
  }

  /**
   * Calculate Money-Weighted Return (MWR / IRR)
   * 
   * This is the Internal Rate of Return (IRR) that makes NPV = 0:
   * NPV = CF0 + CF1/(1+IRR) + CF2/(1+IRR)^2 + ... + CFn/(1+IRR)^n = 0
   * 
   * Solved using Newton-Raphson method.
   */
  calculateMWR(snapshots: PortfolioSnapshot[]): number {
    if (snapshots.length < 2) {
      logger.warn('Not enough snapshots for MWR calculation', { count: snapshots.length });
      return 0;
    }

    // Build cash flow array
    const cashFlows: { date: Date; amount: number }[] = [];

    // Initial investment (negative)
    cashFlows.push({
      date: new Date(snapshots[0].timestamp),
      amount: -snapshots[0].totalValue,
    });

    // Intermediate cash flows
    for (let i = 1; i < snapshots.length; i++) {
      if (snapshots[i].cashFlow !== 0) {
        cashFlows.push({
          date: new Date(snapshots[i].timestamp),
          amount: -snapshots[i].cashFlow, // Negative because deposits are outflows from investor perspective
        });
      }
    }

    // Final value (positive)
    const lastSnapshot = snapshots[snapshots.length - 1];
    cashFlows.push({
      date: new Date(lastSnapshot.timestamp),
      amount: lastSnapshot.totalValue,
    });

    // Calculate IRR using XIRR (Newton-Raphson)
    const irr = this.xirr(cashFlows);
    const mwr = irr * 100;

    logger.debug('MWR calculated', {
      snapshots: snapshots.length,
      cashFlows: cashFlows.length,
      mwr: mwr.toFixed(2),
    });

    return mwr;
  }

  /**
   * XIRR calculation using Newton-Raphson method
   * Returns annualized IRR as decimal (e.g., 0.10 = 10%)
   */
  private xirr(cashFlows: { date: Date; amount: number }[]): number {
    const maxIterations = 100;
    const tolerance = 0.0001;

    // Initial guess: 10%
    let rate = 0.1;

    for (let i = 0; i < maxIterations; i++) {
      const { npv, derivative } = this.calculateNPVAndDerivative(cashFlows, rate);

      if (Math.abs(npv) < tolerance) {
        return rate; // Converged
      }

      // Newton-Raphson: x_new = x_old - f(x) / f'(x)
      rate = rate - npv / derivative;

      // Prevent extreme values
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }

    logger.warn('XIRR did not converge', { iterations: maxIterations });
    return rate;
  }

  /**
   * Calculate NPV and its derivative for Newton-Raphson
   */
  private calculateNPVAndDerivative(
    cashFlows: { date: Date; amount: number }[],
    rate: number
  ): { npv: number; derivative: number } {
    const firstDate = cashFlows[0].date;
    let npv = 0;
    let derivative = 0;

    for (const cf of cashFlows) {
      const yearFraction = this.yearsBetween(firstDate, cf.date);
      const discountFactor = Math.pow(1 + rate, yearFraction);

      npv += cf.amount / discountFactor;
      derivative -= (cf.amount * yearFraction) / Math.pow(1 + rate, yearFraction + 1);
    }

    return { npv, derivative };
  }

  /**
   * Calculate years between two dates (fractional)
   */
  private yearsBetween(date1: Date, date2: Date): number {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return (date2.getTime() - date1.getTime()) / msPerYear;
  }

  /**
   * Get performance metrics for a specific period
   */
  getMetrics(snapshots: PortfolioSnapshot[], period: string): PerformanceMetrics {
    if (snapshots.length === 0) {
      return {
        twr: 0,
        mwr: 0,
        startValue: 0,
        endValue: 0,
        totalCashFlow: 0,
        absoluteGain: 0,
        period,
      };
    }

    const twr = this.calculateTWR(snapshots);
    const mwr = this.calculateMWR(snapshots);

    const startValue = snapshots[0].totalValue;
    const endValue = snapshots[snapshots.length - 1].totalValue;
    const totalCashFlow = snapshots.reduce((sum, s) => sum + s.cashFlow, 0);
    const absoluteGain = endValue - startValue - totalCashFlow;

    return {
      twr,
      mwr,
      startValue,
      endValue,
      totalCashFlow,
      absoluteGain,
      period,
    };
  }

  /**
   * Get snapshots for a specific period
   */
  getSnapshotsForPeriod(
    allSnapshots: PortfolioSnapshot[],
    period: 'YTD' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'
  ): PortfolioSnapshot[] {
    if (period === 'ALL') {
      return allSnapshots;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'YTD':
        startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st of current year
        break;
      case '1M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6M':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1Y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '3Y':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 3);
        break;
      default:
        return allSnapshots;
    }

    return allSnapshots.filter((s) => new Date(s.timestamp) >= startDate);
  }
}
