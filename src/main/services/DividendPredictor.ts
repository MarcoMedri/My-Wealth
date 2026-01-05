/**
 * DividendPredictor
 * 
 * Forecasts future dividend payments based on historical data and frequency.
 * Calculates yield on cost and estimates monthly passive income.
 * 
 * Features:
 * - Predict next N dividend payments
 * - Calculate yield on cost per holding
 * - Estimate monthly/annual passive income
 * - Track dividend growth rate
 */

import type { Asset, Holding, Dividend } from '../../shared/schemas';
import { createLogger } from './LoggerService';

const logger = createLogger('DividendPredictor');

export interface DividendPrediction {
  assetId: string;
  symbol: string;
  name: string;
  expectedDate: string; // ISO date
  estimatedAmount: number; // Total amount in cents
  amountPerShare: number; // Per share in cents
  confidence: 'high' | 'medium' | 'low';
}

export interface DividendYield {
  assetId: string;
  symbol: string;
  annualDividend: number; // Total annual dividend in cents
  yieldOnCost: number; // Percentage (0-100)
  currentYield: number; // Percentage based on current price
}

export interface MonthlyIncome {
  month: string; // YYYY-MM
  totalIncome: number; // In cents
  payments: DividendPrediction[];
}

export interface DividendFrequency {
  type: 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'irregular';
  monthsBetween: number; // Average months between payments
}

export class DividendPredictor {
  /**
   * Predict next N dividend payments for a holding
   */
  predictDividends(
    holding: Holding,
    asset: Asset,
    dividendHistory: Dividend[],
    monthsAhead: number = 12
  ): DividendPrediction[] {
    // Filter dividends for this asset
    const assetDividends = dividendHistory
      .filter((d) => d.assetId === asset.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (assetDividends.length === 0) {
      logger.debug('No dividend history', { symbol: asset.symbol });
      return [];
    }

    // Detect frequency
    const frequency = this.detectFrequency(assetDividends);

    // Calculate average dividend per share
    const avgDividendPerShare = this.calculateAverageDividend(assetDividends);

    // Generate predictions
    const predictions: DividendPrediction[] = [];
    const lastDividend = assetDividends[assetDividends.length - 1];
    let nextDate = this.addMonths(new Date(lastDividend.date), frequency.monthsBetween);
    const endDate = this.addMonths(new Date(), monthsAhead);

    while (nextDate <= endDate) {
      predictions.push({
        assetId: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        expectedDate: nextDate.toISOString().split('T')[0],
        estimatedAmount: Math.round(avgDividendPerShare * holding.quantity),
        amountPerShare: avgDividendPerShare,
        confidence: this.calculateConfidence(assetDividends, frequency),
      });

      nextDate = this.addMonths(nextDate, frequency.monthsBetween);
    }

    logger.debug('Dividends predicted', {
      symbol: asset.symbol,
      predictions: predictions.length,
    });

    return predictions;
  }

  /**
   * Calculate yield on cost for a holding
   */
  calculateYieldOnCost(
    holding: Holding,
    asset: Asset,
    dividendHistory: Dividend[]
  ): DividendYield {
    const assetDividends = dividendHistory.filter((d) => d.assetId === asset.id);

    // Calculate annual dividend (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentDividends = assetDividends.filter(
      (d) => new Date(d.date) >= oneYearAgo
    );

    const annualDividendPerShare = recentDividends.reduce(
      (sum, d) => sum + d.amountPerShare,
      0
    );

    const annualDividend = annualDividendPerShare * holding.quantity;

    // Yield on cost = annual dividend / original cost basis
    const costBasis = holding.averageBuyPrice * holding.quantity;
    const yieldOnCost = costBasis > 0 ? (annualDividendPerShare / holding.averageBuyPrice) * 100 : 0;

    // Current yield = annual dividend / current market value
    const currentValue = asset.currentPrice * holding.quantity;
    const currentYield = currentValue > 0 ? (annualDividend / currentValue) * 100 : 0;

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      annualDividend,
      yieldOnCost,
      currentYield,
    };
  }

  /**
   * Estimate monthly passive income
   */
  estimateMonthlyIncome(
    holdings: Holding[],
    assets: Map<string, Asset>,
    dividendHistory: Dividend[],
    monthsAhead: number = 12
  ): MonthlyIncome[] {
    // Collect all predictions
    const allPredictions: DividendPrediction[] = [];

    holdings.forEach((holding) => {
      const asset = assets.get(holding.assetId);
      if (!asset) return;

      const predictions = this.predictDividends(
        holding,
        asset,
        dividendHistory,
        monthsAhead
      );
      allPredictions.push(...predictions);
    });

    // Group by month
    const monthlyMap = new Map<string, DividendPrediction[]>();

    allPredictions.forEach((prediction) => {
      const month = prediction.expectedDate.substring(0, 7); // YYYY-MM
      const existing = monthlyMap.get(month) || [];
      existing.push(prediction);
      monthlyMap.set(month, existing);
    });

    // Convert to MonthlyIncome array
    const monthlyIncome: MonthlyIncome[] = Array.from(monthlyMap.entries())
      .map(([month, payments]) => ({
        month,
        totalIncome: payments.reduce((sum, p) => sum + p.estimatedAmount, 0),
        payments,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    logger.info('Monthly income estimated', { months: monthlyIncome.length });
    return monthlyIncome;
  }

  /**
   * Calculate dividend growth rate
   */
  calculateGrowthRate(dividendHistory: Dividend[]): number {
    if (dividendHistory.length < 2) return 0;

    const sorted = dividendHistory.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstYear = sorted.slice(0, 4); // First 4 quarters
    const lastYear = sorted.slice(-4); // Last 4 quarters

    if (firstYear.length < 4 || lastYear.length < 4) return 0;

    const firstYearTotal = firstYear.reduce((sum, d) => sum + d.amountPerShare, 0);
    const lastYearTotal = lastYear.reduce((sum, d) => sum + d.amountPerShare, 0);

    if (firstYearTotal === 0) return 0;

    const growthRate = ((lastYearTotal - firstYearTotal) / firstYearTotal) * 100;
    return growthRate;
  }

  /**
   * Detect dividend payment frequency
   */
  private detectFrequency(dividends: Dividend[]): DividendFrequency {
    if (dividends.length < 2) {
      return { type: 'irregular', monthsBetween: 12 };
    }

    // Calculate average months between payments
    const intervals: number[] = [];
    for (let i = 1; i < dividends.length; i++) {
      const prev = new Date(dividends[i - 1].date);
      const curr = new Date(dividends[i].date);
      const months = this.monthsBetween(prev, curr);
      intervals.push(months);
    }

    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

    // Classify frequency
    if (avgInterval <= 1.5) return { type: 'monthly', monthsBetween: 1 };
    if (avgInterval <= 4) return { type: 'quarterly', monthsBetween: 3 };
    if (avgInterval <= 8) return { type: 'semi-annual', monthsBetween: 6 };
    if (avgInterval <= 14) return { type: 'annual', monthsBetween: 12 };
    return { type: 'irregular', monthsBetween: Math.round(avgInterval) };
  }

  /**
   * Calculate average dividend per share
   */
  private calculateAverageDividend(dividends: Dividend[]): number {
    if (dividends.length === 0) return 0;

    // Use last 4 payments for average (more recent = more relevant)
    const recent = dividends.slice(-4);
    const sum = recent.reduce((total, d) => total + d.amountPerShare, 0);
    return Math.round(sum / recent.length);
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    dividends: Dividend[],
    frequency: DividendFrequency
  ): 'high' | 'medium' | 'low' {
    // High confidence: regular payments, 2+ years of history
    if (dividends.length >= 8 && frequency.type !== 'irregular') {
      return 'high';
    }

    // Medium confidence: some history, regular or semi-regular
    if (dividends.length >= 4) {
      return 'medium';
    }

    // Low confidence: limited history
    return 'low';
  }

  /**
   * Add months to a date
   */
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Calculate months between two dates
   */
  private monthsBetween(date1: Date, date2: Date): number {
    const months =
      (date2.getFullYear() - date1.getFullYear()) * 12 +
      (date2.getMonth() - date1.getMonth());
    return Math.abs(months);
  }
}

// Export singleton instance
export const dividendPredictor = new DividendPredictor();
