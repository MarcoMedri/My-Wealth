/**
 * PortfolioAnalyzer
 * 
 * Analyzes portfolio composition across multiple dimensions:
 * - Sector allocation (Technology, Healthcare, Finance, etc.)
 * - Geographic exposure (North America, Europe, Asia, etc.)
 * - Asset class breakdown (Stocks, ETFs, Crypto, Bonds, etc.)
 * 
 * Provides insights into portfolio diversification and risk exposure.
 */

import type { Asset, Holding } from '../../shared/schemas';
import { createLogger } from './LoggerService';

const logger = createLogger('PortfolioAnalyzer');

export interface AllocationItem {
  name: string;
  value: number; // Market value in cents
  percentage: number; // 0-100
  count: number; // Number of holdings
}

export interface PortfolioComposition {
  totalValue: number;
  sectors: AllocationItem[];
  geographies: AllocationItem[];
  assetClasses: AllocationItem[];
  topHoldings: {
    assetId: string;
    symbol: string;
    name: string;
    value: number;
    percentage: number;
  }[];
}

export class PortfolioAnalyzer {
  /**
   * Analyze complete portfolio composition
   */
  analyzePortfolio(
    holdings: Holding[],
    assets: Map<string, Asset>
  ): PortfolioComposition {
    logger.debug('Analyzing portfolio', { holdingsCount: holdings.length });

    const totalValue = this.calculateTotalValue(holdings, assets);

    return {
      totalValue,
      sectors: this.analyzeSectors(holdings, assets, totalValue),
      geographies: this.analyzeGeographies(holdings, assets, totalValue),
      assetClasses: this.analyzeAssetClasses(holdings, assets, totalValue),
      topHoldings: this.getTopHoldings(holdings, assets, 10),
    };
  }

  /**
   * Calculate total portfolio value
   */
  private calculateTotalValue(
    holdings: Holding[],
    assets: Map<string, Asset>
  ): number {
    return holdings.reduce((total, holding) => {
      const asset = assets.get(holding.assetId);
      if (!asset) return total;
      return total + holding.quantity * asset.currentPrice;
    }, 0);
  }

  /**
   * Analyze sector allocation
   */
  analyzeSectors(
    holdings: Holding[],
    assets: Map<string, Asset>,
    totalValue: number
  ): AllocationItem[] {
    const sectorMap = new Map<string, { value: number; count: number }>();

    holdings.forEach((holding) => {
      const asset = assets.get(holding.assetId);
      if (!asset) return;

      const sector = asset.metadata?.sector || 'Unknown';
      const marketValue = holding.quantity * asset.currentPrice;

      const existing = sectorMap.get(sector) || { value: 0, count: 0 };
      sectorMap.set(sector, {
        value: existing.value + marketValue,
        count: existing.count + 1,
      });
    });

    const allocations = Array.from(sectorMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    logger.debug('Sector analysis complete', { sectors: allocations.length });
    return allocations;
  }

  /**
   * Analyze geographic exposure
   */
  analyzeGeographies(
    holdings: Holding[],
    assets: Map<string, Asset>,
    totalValue: number
  ): AllocationItem[] {
    const geoMap = new Map<string, { value: number; count: number }>();

    holdings.forEach((holding) => {
      const asset = assets.get(holding.assetId);
      if (!asset) return;

      // Use region first, fallback to country
      const geography = asset.metadata?.region || asset.metadata?.country || 'Unknown';
      const marketValue = holding.quantity * asset.currentPrice;

      const existing = geoMap.get(geography) || { value: 0, count: 0 };
      geoMap.set(geography, {
        value: existing.value + marketValue,
        count: existing.count + 1,
      });
    });

    const allocations = Array.from(geoMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    logger.debug('Geography analysis complete', { regions: allocations.length });
    return allocations;
  }

  /**
   * Analyze asset class breakdown
   */
  analyzeAssetClasses(
    holdings: Holding[],
    assets: Map<string, Asset>,
    totalValue: number
  ): AllocationItem[] {
    const classMap = new Map<string, { value: number; count: number }>();

    holdings.forEach((holding) => {
      const asset = assets.get(holding.assetId);
      if (!asset) return;

      const assetClass = this.formatAssetClass(asset.type);
      const marketValue = holding.quantity * asset.currentPrice;

      const existing = classMap.get(assetClass) || { value: 0, count: 0 };
      classMap.set(assetClass, {
        value: existing.value + marketValue,
        count: existing.count + 1,
      });
    });

    const allocations = Array.from(classMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    logger.debug('Asset class analysis complete', { classes: allocations.length });
    return allocations;
  }

  /**
   * Get top holdings by market value
   */
  getTopHoldings(
    holdings: Holding[],
    assets: Map<string, Asset>,
    limit: number = 10
  ): PortfolioComposition['topHoldings'] {
    const totalValue = this.calculateTotalValue(holdings, assets);

    const holdingsWithValue = holdings
      .map((holding) => {
        const asset = assets.get(holding.assetId);
        if (!asset) return null;

        const value = holding.quantity * asset.currentPrice;
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          value,
          percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        };
      })
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return holdingsWithValue;
  }

  /**
   * Format asset type for display
   */
  private formatAssetClass(type: string): string {
    const mapping: Record<string, string> = {
      stock: 'Stocks',
      etf: 'ETFs',
      crypto: 'Cryptocurrency',
      bond: 'Bonds',
      fund: 'Mutual Funds',
      insurance: 'Insurance',
      other: 'Other',
    };
    return mapping[type] || type;
  }

  /**
   * Calculate diversification score (0-100)
   * Higher score = more diversified
   */
  calculateDiversificationScore(composition: PortfolioComposition): number {
    // Simple Herfindahl-Hirschman Index (HHI) based diversification
    // HHI = sum of squared market shares
    // Lower HHI = more diversified
    // We invert and scale to 0-100

    const sectorHHI = composition.sectors.reduce(
      (sum, s) => sum + Math.pow(s.percentage, 2),
      0
    );

    const geoHHI = composition.geographies.reduce(
      (sum, g) => sum + Math.pow(g.percentage, 2),
      0
    );

    const classHHI = composition.assetClasses.reduce(
      (sum, c) => sum + Math.pow(c.percentage, 2),
      0
    );

    // Average HHI across dimensions
    const avgHHI = (sectorHHI + geoHHI + classHHI) / 3;

    // Convert to 0-100 score (10000 = max HHI for single holding)
    const score = Math.max(0, 100 - (avgHHI / 100));

    logger.debug('Diversification score calculated', { score: score.toFixed(2) });
    return score;
  }

  /**
   * Get concentration risk warnings
   */
  getConcentrationWarnings(composition: PortfolioComposition): string[] {
    const warnings: string[] = [];

    // Check for over-concentration in single sector
    const topSector = composition.sectors[0];
    if (topSector && topSector.percentage > 40) {
      warnings.push(
        `High concentration in ${topSector.name} sector (${topSector.percentage.toFixed(1)}%)`
      );
    }

    // Check for over-concentration in single geography
    const topGeo = composition.geographies[0];
    if (topGeo && topGeo.percentage > 60) {
      warnings.push(
        `High geographic concentration in ${topGeo.name} (${topGeo.percentage.toFixed(1)}%)`
      );
    }

    // Check for over-concentration in single holding
    const topHolding = composition.topHoldings[0];
    if (topHolding && topHolding.percentage > 25) {
      warnings.push(
        `Single holding ${topHolding.symbol} represents ${topHolding.percentage.toFixed(1)}% of portfolio`
      );
    }

    // Check for lack of diversification
    if (composition.sectors.length < 3) {
      warnings.push('Portfolio is concentrated in fewer than 3 sectors');
    }

    return warnings;
  }
}

// Export singleton instance
export const portfolioAnalyzer = new PortfolioAnalyzer();
