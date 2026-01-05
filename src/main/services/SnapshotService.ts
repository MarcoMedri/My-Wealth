/**
 * SnapshotService
 * 
 * Tracks portfolio value over time to enable advanced performance metrics.
 * Creates snapshots on every transaction to calculate TWR and MWR.
 * 
 * Features:
 * - Automatic snapshot creation on transactions
 * - Efficient storage (monthly aggregation after 1 year)
 * - Fast retrieval for performance calculations
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { createLogger } from './LoggerService';

const logger = createLogger('SnapshotService');

export interface HoldingSnapshot {
  investmentId: string;
  ticker: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
}

export interface AccountSnapshot {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  holdings: HoldingSnapshot[];
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: string; // ISO 8601
  totalValue: number;
  cashFlow: number; // Net cash flow since last snapshot (+ deposits, - withdrawals)
  accounts: AccountSnapshot[];
}

export interface SnapshotsFile {
  version: string;
  snapshots: PortfolioSnapshot[];
}

export class SnapshotService {
  private snapshotsPath: string;
  private snapshots: PortfolioSnapshot[] = [];

  constructor(vaultPath: string) {
    const vaultDir = path.dirname(vaultPath);
    this.snapshotsPath = path.join(vaultDir, 'snapshots.json');
    this.loadSnapshots();
  }

  /**
   * Load snapshots from disk
   */
  private async loadSnapshots(): Promise<void> {
    try {
      if (await fs.pathExists(this.snapshotsPath)) {
        const data = await fs.readJson(this.snapshotsPath);
        this.snapshots = data.snapshots || [];
        logger.info('Snapshots loaded', { count: this.snapshots.length });
      } else {
        this.snapshots = [];
        logger.info('No snapshots file found, starting fresh');
      }
    } catch (error) {
      logger.error('Failed to load snapshots', error as Error);
      this.snapshots = [];
    }
  }

  /**
   * Save snapshots to disk
   */
  private async saveSnapshots(): Promise<void> {
    try {
      const data: SnapshotsFile = {
        version: '1.0',
        snapshots: this.snapshots,
      };
      await fs.writeJson(this.snapshotsPath, data, { spaces: 2 });
      logger.debug('Snapshots saved', { count: this.snapshots.length });
    } catch (error) {
      logger.error('Failed to save snapshots', error as Error);
      throw error;
    }
  }

  /**
   * Create a new snapshot
   * Called after every transaction that affects portfolio value
   */
  async createSnapshot(
    totalValue: number,
    cashFlow: number,
    accounts: AccountSnapshot[]
  ): Promise<PortfolioSnapshot> {
    const snapshot: PortfolioSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalValue,
      cashFlow,
      accounts,
    };

    this.snapshots.push(snapshot);
    await this.saveSnapshots();

    logger.info('Snapshot created', {
      totalValue,
      cashFlow,
      accountCount: accounts.length,
    });

    return snapshot;
  }

  /**
   * Get snapshots for a date range
   */
  getSnapshots(startDate: Date, endDate: Date): PortfolioSnapshot[] {
    return this.snapshots.filter((snapshot) => {
      const date = new Date(snapshot.timestamp);
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Get all snapshots
   */
  getAllSnapshots(): PortfolioSnapshot[] {
    return this.snapshots;
  }

  /**
   * Get the most recent snapshot
   */
  getLatestSnapshot(): PortfolioSnapshot | null {
    if (this.snapshots.length === 0) return null;
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Clean old snapshots
   * Keep daily snapshots for last year, monthly for older
   */
  async cleanOldSnapshots(): Promise<void> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Group old snapshots by month
    const oldSnapshots = this.snapshots.filter(
      (s) => new Date(s.timestamp) < oneYearAgo
    );

    if (oldSnapshots.length === 0) return;

    // Keep one snapshot per month for old data
    const monthlySnapshots = new Map<string, PortfolioSnapshot>();
    oldSnapshots.forEach((snapshot) => {
      const date = new Date(snapshot.timestamp);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      // Keep the last snapshot of each month
      if (!monthlySnapshots.has(monthKey) || 
          new Date(snapshot.timestamp) > new Date(monthlySnapshots.get(monthKey)!.timestamp)) {
        monthlySnapshots.set(monthKey, snapshot);
      }
    });

    // Keep recent snapshots (last year) + monthly aggregated old snapshots
    const recentSnapshots = this.snapshots.filter(
      (s) => new Date(s.timestamp) >= oneYearAgo
    );

    this.snapshots = [
      ...Array.from(monthlySnapshots.values()),
      ...recentSnapshots,
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    await this.saveSnapshots();

    logger.info('Old snapshots cleaned', {
      before: oldSnapshots.length,
      after: monthlySnapshots.size,
    });
  }

  /**
   * Get snapshot count
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}
