/**
 * Performance Monitor Service
 * 
 * Tracks operation performance and system metrics:
 * - Operation timing (start/end)
 * - Memory usage tracking
 * - Slow operation detection
 * - Metrics aggregation
 */

import { logger } from './LoggerService';

export interface OperationMetrics {
  name: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  slowCount: number; // Operations > 1s
  criticalCount: number; // Operations > 3s
}

interface ActiveOperation {
  id: string;
  name: string;
  startTime: number;
  startMemory: number;
}

interface CompletedOperation {
  name: string;
  duration: number;
  memory: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private activeOperations = new Map<string, ActiveOperation>();
  private completedOperations: CompletedOperation[] = [];
  private maxHistorySize = 1000; // Keep last 1000 operations
  private slowThreshold = 1000; // 1 second
  private criticalThreshold = 3000; // 3 seconds

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start tracking an operation
   * Returns operation ID for later use with endOperation
   */
  public startOperation(name: string): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const memUsage = process.memoryUsage();
    
    this.activeOperations.set(id, {
      id,
      name,
      startTime: Date.now(),
      startMemory: memUsage.heapUsed,
    });

    logger.debug(`Started operation: ${name}`, { operationId: id });
    
    return id;
  }

  /**
   * End tracking an operation
   */
  public endOperation(operationId: string, meta?: Record<string, unknown>): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      logger.warn(`Attempted to end unknown operation: ${operationId}`);
      return;
    }

    const duration = Date.now() - operation.startTime;
    const memUsage = process.memoryUsage();
    const memoryDelta = memUsage.heapUsed - operation.startMemory;

    // Remove from active operations
    this.activeOperations.delete(operationId);

    // Store completed operation
    const completed: CompletedOperation = {
      name: operation.name,
      duration,
      memory: memoryDelta,
      timestamp: Date.now(),
    };

    this.completedOperations.push(completed);

    // Trim history if needed
    if (this.completedOperations.length > this.maxHistorySize) {
      this.completedOperations = this.completedOperations.slice(-this.maxHistorySize);
    }

    // Log based on duration
    const logData = {
      duration: `${duration}ms`,
      memory: this.formatBytes(memoryDelta),
      ...meta,
    };

    if (duration >= this.criticalThreshold) {
      logger.error(`CRITICAL: Slow operation detected: ${operation.name}`, logData);
    } else if (duration >= this.slowThreshold) {
      logger.warn(`SLOW: Operation took longer than expected: ${operation.name}`, logData);
    } else {
      logger.debug(`Completed operation: ${operation.name}`, logData);
    }
  }

  /**
   * Record a custom metric
   */
  public recordMetric(name: string, value: number, unit: string): void {
    logger.info(`Metric: ${name}`, { value, unit });
  }

  /**
   * Get aggregated metrics for an operation
   */
  public getMetrics(operationName?: string): OperationMetrics[] {
    const operations = operationName
      ? this.completedOperations.filter(op => op.name === operationName)
      : this.completedOperations;

    if (operations.length === 0) {
      return [];
    }

    // Group by operation name
    const grouped = operations.reduce((acc, op) => {
      if (!acc[op.name]) {
        acc[op.name] = [];
      }
      acc[op.name].push(op.duration);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate metrics for each operation
    return Object.entries(grouped).map(([name, durations]) => {
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = durations.reduce((a, b) => a + b, 0);
      const p95Index = Math.floor(sorted.length * 0.95);

      return {
        name,
        count: durations.length,
        totalDuration: sum,
        avgDuration: sum / durations.length,
        minDuration: sorted[0],
        maxDuration: sorted[sorted.length - 1],
        p95Duration: sorted[p95Index] || sorted[sorted.length - 1],
        slowCount: durations.filter(d => d >= this.slowThreshold).length,
        criticalCount: durations.filter(d => d >= this.criticalThreshold).length,
      };
    });
  }

  /**
   * Get current memory usage
   */
  public getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Log current memory usage
   */
  public logMemoryUsage(): void {
    const mem = process.memoryUsage();
    logger.info('Memory usage', {
      heapUsed: this.formatBytes(mem.heapUsed),
      heapTotal: this.formatBytes(mem.heapTotal),
      rss: this.formatBytes(mem.rss),
      external: this.formatBytes(mem.external),
    });
  }

  /**
   * Clear all metrics history
   */
  public clearHistory(): void {
    this.completedOperations = [];
    logger.info('Performance metrics history cleared');
  }

  /**
   * Get summary of all metrics
   */
  public getSummary(): string {
    const metrics = this.getMetrics();
    const totalOps = metrics.reduce((sum, m) => sum + m.count, 0);
    const slowOps = metrics.reduce((sum, m) => sum + m.slowCount, 0);
    const criticalOps = metrics.reduce((sum, m) => sum + m.criticalCount, 0);

    return `Performance Summary: ${totalOps} operations tracked, ${slowOps} slow (>1s), ${criticalOps} critical (>3s)`;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)} ${sizes[i]}`;
  }
}

// Export singleton instance
export const perfMonitor = PerformanceMonitor.getInstance();
