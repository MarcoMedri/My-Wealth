/**
 * Auto-Backup Scheduler
 * 
 * Schedules automatic backups on app start and at intervals.
 */

import { getBackupService, initBackupService } from '../backup';
import { createLogger } from './LoggerService';

const log = createLogger('AutoBackup');

interface AutoBackupOptions {
    /** Interval between backups in milliseconds (default: 1 hour) */
    intervalMs: number;
    /** Run backup on app start */
    backupOnStart: boolean;
    /** Minimum time between backups in ms (prevents too frequent backups) */
    minIntervalMs: number;
}

const DEFAULT_OPTIONS: AutoBackupOptions = {
    intervalMs: 60 * 60 * 1000, // 1 hour
    backupOnStart: true,
    minIntervalMs: 5 * 60 * 1000, // 5 minutes
};

class AutoBackupScheduler {
    private options: AutoBackupOptions;
    private intervalId: NodeJS.Timeout | null = null;
    private lastBackupTime: number = 0;
    private vaultPath: string | null = null;

    constructor(options: Partial<AutoBackupOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Initialize and start the scheduler
     */
    async start(vaultPath: string): Promise<void> {
        this.vaultPath = vaultPath;
        
        // Initialize backup service
        initBackupService(vaultPath);
        
        log.info('Auto-backup scheduler started', { vaultPath, intervalMs: this.options.intervalMs });

        // Run backup on start if enabled
        if (this.options.backupOnStart) {
            await this.runBackup('startup');
        }

        // Schedule periodic backups
        this.intervalId = setInterval(() => {
            this.runBackup('scheduled');
        }, this.options.intervalMs);
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        log.info('Auto-backup scheduler stopped');
    }

    /**
     * Run a backup if minimum interval has passed
     */
    async runBackup(reason: string): Promise<boolean> {
        const now = Date.now();
        
        // Check minimum interval
        if (now - this.lastBackupTime < this.options.minIntervalMs) {
            log.debug('Skipping backup - minimum interval not reached');
            return false;
        }

        try {
            const backupService = getBackupService();
            const result = await backupService.createBackup(reason);
            
            this.lastBackupTime = now;
            log.info('Backup created successfully', {
                filename: result.filename,
                reason,
                sizeBytes: result.sizeBytes,
            });
            
            return true;
        } catch (error) {
            log.error('Backup failed', { error: error instanceof Error ? error.message : error });
            return false;
        }
    }

    /**
     * Trigger an immediate backup (ignores minimum interval)
     */
    async triggerBackup(reason: string = 'manual'): Promise<boolean> {
        try {
            const backupService = getBackupService();
            const result = await backupService.createBackup(reason);
            
            this.lastBackupTime = Date.now();
            log.info('Manual backup created', {
                filename: result.filename,
                reason,
            });
            
            return true;
        } catch (error) {
            log.error('Manual backup failed', { error: error instanceof Error ? error.message : error });
            return false;
        }
    }

    /**
     * Get last backup time
     */
    getLastBackupTime(): Date | null {
        return this.lastBackupTime > 0 ? new Date(this.lastBackupTime) : null;
    }
}

// Export singleton
export const autoBackupScheduler = new AutoBackupScheduler();
