/**
 * Vault Backup Service
 * 
 * Automatic backup with rotation and restore capabilities.
 */

import fs from 'fs-extra';
import path from 'path';

export interface BackupOptions {
    /** Maximum number of backups to keep */
    maxBackups: number;
    /** Backup directory name within vault */
    backupDir: string;
}

export interface BackupInfo {
    filename: string;
    path: string;
    timestamp: Date;
    sizeBytes: number;
}

const DEFAULT_OPTIONS: BackupOptions = {
    maxBackups: 10,
    backupDir: '.backups',
};

export class BackupService {
    private vaultPath: string;
    private options: BackupOptions;

    constructor(vaultPath: string, options: Partial<BackupOptions> = {}) {
        this.vaultPath = vaultPath;
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Get the backup directory path
     */
    private get backupPath(): string {
        return path.join(this.vaultPath, this.options.backupDir);
    }

    /**
     * Ensure backup directory exists
     */
    private async ensureBackupDir(): Promise<void> {
        await fs.ensureDir(this.backupPath);
    }

    /**
     * Create a backup of the current vault
     */
    async createBackup(reason: string = 'auto'): Promise<BackupInfo> {
        await this.ensureBackupDir();

        const timestamp = new Date();
        const formattedDate = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // Get all JSON files in vault (excluding backups and settings)
        const files = await this.getVaultFiles();

        // Create a simple backup (copy files to a timestamped folder)
        const backupFolder = path.join(this.backupPath, formattedDate);
        await fs.ensureDir(backupFolder);

        for (const file of files) {
            const srcPath = path.join(this.vaultPath, file);
            const destPath = path.join(backupFolder, file);
            await fs.ensureDir(path.dirname(destPath));
            await fs.copy(srcPath, destPath);
        }

        // Write manifest
        await fs.writeJson(path.join(backupFolder, 'manifest.json'), {
            timestamp: timestamp.toISOString(),
            reason,
            files,
        });

        // Rotate old backups
        await this.rotateBackups();

        const stats = await fs.stat(backupFolder);
        
        return {
            filename: formattedDate,
            path: backupFolder,
            timestamp,
            sizeBytes: stats.size,
        };
    }

    /**
     * Get list of files to backup
     */
    private async getVaultFiles(): Promise<string[]> {
        const files: string[] = [];
        const entries = await fs.readdir(this.vaultPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue; // Skip hidden files/folders
            if (entry.name === this.options.backupDir) continue; // Skip backup folder

            if (entry.isDirectory()) {
                if (entry.name === 'transactions') {
                    // Include all transaction files
                    const txFiles = await fs.readdir(path.join(this.vaultPath, entry.name));
                    files.push(...txFiles.map(f => path.join('transactions', f)));
                }
            } else if (entry.name.endsWith('.json')) {
                files.push(entry.name);
            }
        }

        return files;
    }

    /**
     * List all available backups
     */
    async listBackups(): Promise<BackupInfo[]> {
        await this.ensureBackupDir();

        const entries = await fs.readdir(this.backupPath, { withFileTypes: true });
        const backups: BackupInfo[] = [];

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.')) continue;

            const manifestPath = path.join(this.backupPath, entry.name, 'manifest.json');
            if (await fs.pathExists(manifestPath)) {
                const manifest = await fs.readJson(manifestPath);
                const stats = await fs.stat(path.join(this.backupPath, entry.name));
                
                backups.push({
                    filename: entry.name,
                    path: path.join(this.backupPath, entry.name),
                    timestamp: new Date(manifest.timestamp),
                    sizeBytes: stats.size,
                });
            }
        }

        // Sort by timestamp, newest first
        backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        return backups;
    }

    /**
     * Rotate old backups (keep only maxBackups)
     */
    private async rotateBackups(): Promise<void> {
        const backups = await this.listBackups();

        if (backups.length <= this.options.maxBackups) return;

        // Delete oldest backups
        const toDelete = backups.slice(this.options.maxBackups);
        
        for (const backup of toDelete) {
            await fs.remove(backup.path);
        }
    }

    /**
     * Restore from a backup
     */
    async restore(backupName: string): Promise<void> {
        const backupFolder = path.join(this.backupPath, backupName);
        
        if (!await fs.pathExists(backupFolder)) {
            throw new Error(`Backup not found: ${backupName}`);
        }

        const manifestPath = path.join(backupFolder, 'manifest.json');
        const manifest = await fs.readJson(manifestPath);

        // Create a backup of current state before restoring
        await this.createBackup('pre-restore');

        // Restore files
        for (const file of manifest.files) {
            const srcPath = path.join(backupFolder, file);
            const destPath = path.join(this.vaultPath, file);
            
            if (await fs.pathExists(srcPath)) {
                await fs.ensureDir(path.dirname(destPath));
                await fs.copy(srcPath, destPath, { overwrite: true });
            }
        }
    }

    /**
     * Delete a specific backup
     */
    async deleteBackup(backupName: string): Promise<void> {
        const backupFolder = path.join(this.backupPath, backupName);
        
        if (await fs.pathExists(backupFolder)) {
            await fs.remove(backupFolder);
        }
    }
}

// Singleton for easy access
let backupServiceInstance: BackupService | null = null;

export function getBackupService(vaultPath?: string): BackupService {
    if (!backupServiceInstance && vaultPath) {
        backupServiceInstance = new BackupService(vaultPath);
    }
    if (!backupServiceInstance) {
        throw new Error('BackupService not initialized. Provide vaultPath on first call.');
    }
    return backupServiceInstance;
}

export function initBackupService(vaultPath: string, options?: Partial<BackupOptions>): BackupService {
    backupServiceInstance = new BackupService(vaultPath, options);
    return backupServiceInstance;
}
