/**
 * BackupService
 * 
 * Manages automatic backups of vault data to protect against data loss.
 * 
 * Features:
 * - Automatic backup on every save
 * - Timestamped backup files
 * - Compression to save disk space
 * - Rolling window (keeps last N backups)
 * - Restore functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as zlib from 'zlib';
import { createLogger } from './services/LoggerService';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

export interface BackupInfo {
  id: string;
  timestamp: string;
  size: number;
  filename: string;
}

export class BackupService {
  private backupDir: string;
  private maxBackups: number;
  private logger = createLogger('BackupService');

  constructor(vaultPath: string, maxBackups: number = 10) {
    // Store backups in a 'backups' folder next to the vault
    const vaultDir = path.dirname(vaultPath);
    this.backupDir = path.join(vaultDir, 'backups');
    this.maxBackups = maxBackups;

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a new backup of the vault file
   * 
   * Intelligent backup: Only creates backup if 30+ minutes have passed since last backup
   * This prevents excessive backups while ensuring regular protection
   */
  async createBackup(vaultPath: string): Promise<boolean> {
    try {
      // Check if we should skip this backup (intelligent backup)
      const backups = await this.listBackups();
      
      if (backups.length > 0) {
        const lastBackup = new Date(backups[0].timestamp);
        const now = new Date();
        const minutesSinceLastBackup = (now.getTime() - lastBackup.getTime()) / 1000 / 60;
        
        if (minutesSinceLastBackup < 30) {
          console.log(`[BackupService] Skipping backup (last backup was ${Math.round(minutesSinceLastBackup)} minutes ago)`);
          return false; // Skip backup
        }
      }

      // Read vault file
      const vaultData = await readFile(vaultPath);

      // Compress data
      const compressed = await gzip(vaultData);

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `vault-backup-${timestamp}.json.gz`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Write compressed backup
      await writeFile(backupPath, compressed);

      console.log(`[BackupService] Created backup: ${backupFilename} (${(compressed.length / 1024).toFixed(2)} KB)`);
      return true;
    } catch (error) {
      console.error('[BackupService] Failed to create backup:', error);
      // Don't throw - backup failure shouldn't prevent save
      return false;
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = await readdir(this.backupDir);
      
      const backups: BackupInfo[] = [];
      
      for (const filename of files) {
        if (!filename.startsWith('vault-backup-') || !filename.endsWith('.json.gz')) {
          continue;
        }

        const filePath = path.join(this.backupDir, filename);
        const stats = await stat(filePath);

        // Extract timestamp from filename
        // Format: vault-backup-2026-01-05T12-00-00-000Z.json.gz
        const timestampMatch = filename.match(/vault-backup-(.+)\.json\.gz/);
        const timestamp = timestampMatch 
          ? timestampMatch[1].replace(/-/g, ':').replace(/T(\d{2}):(\d{2}):(\d{2}):(\d{3})Z/, 'T$1:$2:$3.$4Z')
          : new Date(stats.mtime).toISOString();

        backups.push({
          id: filename,
          timestamp,
          size: stats.size,
          filename
        });
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return backups;
    } catch (error) {
      console.error('[BackupService] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore vault from a backup
   */
  async restoreBackup(backupId: string, vaultPath: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      // Read compressed backup
      const compressed = await readFile(backupPath);

      // Decompress
      const decompressed = await gunzip(compressed);

      // Validate JSON before writing
      JSON.parse(decompressed.toString('utf-8'));

      // Create backup of current vault before restoring
      await this.createBackup(vaultPath);

      // Write restored data to vault
      await writeFile(vaultPath, decompressed);

      console.log(`[BackupService] Restored backup: ${backupId}`);
    } catch (error) {
      console.error('[BackupService] Failed to restore backup:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to restore backup: ${errorMessage}`);
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      await unlink(backupPath);
      console.log(`[BackupService] Deleted backup: ${backupId}`);
    } catch (error) {
      console.error('[BackupService] Failed to delete backup:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete backup: ${errorMessage}`);
    }
  }

  /**
   * Clean up old backups, keeping only the most recent N backups
   */
  async cleanOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();

      if (backups.length <= this.maxBackups) {
        return; // Nothing to clean
      }

      // Delete oldest backups
      const toDelete = backups.slice(this.maxBackups);
      
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }

      console.log(`[BackupService] Cleaned up ${toDelete.length} old backups`);
    } catch (error) {
      console.error('[BackupService] Failed to clean old backups:', error);
      // Don't throw - cleanup failure shouldn't prevent operation
    }
  }
}
