/**
 * BackupService Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackupService } from '../BackupService';
import * as fs from 'fs-extra';
import * as path from 'path';
import { tmpdir } from 'os';

describe('BackupService', () => {
  let testDir: string;
  let vaultPath: string;
  let backupService: BackupService;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(tmpdir(), `backup-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    
    // Create test vault file
    vaultPath = path.join(testDir, 'test-vault.json');
    await fs.writeJson(vaultPath, { test: 'data', timestamp: new Date().toISOString() });
    
    // Initialize BackupService
    backupService = new BackupService(vaultPath, 10);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testDir);
  });

  describe('createBackup', () => {
    it('should create a compressed backup file', async () => {
      const result = await backupService.createBackup(vaultPath);
      
      expect(result).toBe(true);
      
      const backups = await backupService.listBackups();
      expect(backups.length).toBe(1);
      expect(backups[0].filename).toMatch(/vault-backup-.+\.json\.gz/);
    });

    it('should skip backup if less than 30 minutes since last backup', async () => {
      // Create first backup
      await backupService.createBackup(vaultPath);
      
      // Try to create second backup immediately
      const result = await backupService.createBackup(vaultPath);
      
      expect(result).toBe(false);
      
      const backups = await backupService.listBackups();
      expect(backups.length).toBe(1);
    });

    it('should handle vault file read errors gracefully', async () => {
      const invalidPath = path.join(testDir, 'nonexistent.json');
      const result = await backupService.createBackup(invalidPath);
      
      expect(result).toBe(false);
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', async () => {
      const backups = await backupService.listBackups();
      expect(backups).toEqual([]);
    });

    it('should list backups sorted by timestamp (newest first)', async () => {
      // Create multiple backups with delay
      await backupService.createBackup(vaultPath);
      
      // Wait a bit and modify vault to force new backup
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.writeJson(vaultPath, { test: 'data2' });
      
      // Force second backup by creating new service instance
      const service2 = new BackupService(vaultPath, 10);
      await service2.createBackup(vaultPath);
      
      const backups = await backupService.listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(1);
      
      // Verify sorted by timestamp
      if (backups.length > 1) {
        const first = new Date(backups[0].timestamp);
        const second = new Date(backups[1].timestamp);
        expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
      }
    });

    it('should include size information for each backup', async () => {
      await backupService.createBackup(vaultPath);
      
      const backups = await backupService.listBackups();
      expect(backups[0].size).toBeGreaterThan(0);
    });
  });

  describe('restoreBackup', () => {
    it('should restore vault from backup', async () => {
      // Create backup
      await backupService.createBackup(vaultPath);
      const backups = await backupService.listBackups();
      
      // Modify vault
      await fs.writeJson(vaultPath, { test: 'modified' });
      
      // Restore backup
      await backupService.restoreBackup(backups[0].id, vaultPath);
      
      // Verify restoration
      const restored = await fs.readJson(vaultPath);
      expect(restored.test).toBe('data');
    });

    it('should create backup before restoring', async () => {
      // Create initial backup
      await backupService.createBackup(vaultPath);
      const initialBackups = await backupService.listBackups();
      
      // Restore
      await backupService.restoreBackup(initialBackups[0].id, vaultPath);
      
      // Should have created a pre-restore backup
      const finalBackups = await backupService.listBackups();
      expect(finalBackups.length).toBeGreaterThan(initialBackups.length);
    });

    it('should throw error for non-existent backup', async () => {
      await expect(
        backupService.restoreBackup('nonexistent-backup.json.gz', vaultPath)
      ).rejects.toThrow('Backup not found');
    });
  });

  describe('deleteBackup', () => {
    it('should delete specified backup', async () => {
      await backupService.createBackup(vaultPath);
      const backups = await backupService.listBackups();
      
      await backupService.deleteBackup(backups[0].id);
      
      const remainingBackups = await backupService.listBackups();
      expect(remainingBackups.length).toBe(0);
    });

    it('should throw error for non-existent backup', async () => {
      await expect(
        backupService.deleteBackup('nonexistent-backup.json.gz')
      ).rejects.toThrow('Backup not found');
    });
  });

  describe('cleanOldBackups', () => {
    it('should keep only the most recent N backups', async () => {
      // Create service with max 3 backups
      const service = new BackupService(vaultPath, 3);
      
      // Create 5 backups
      for (let i = 0; i < 5; i++) {
        await fs.writeJson(vaultPath, { test: `data${i}` });
        const tempService = new BackupService(vaultPath, 3);
        await tempService.createBackup(vaultPath);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Clean old backups
      await service.cleanOldBackups();
      
      const backups = await service.listBackups();
      expect(backups.length).toBeLessThanOrEqual(3);
    });

    it('should not delete backups if under limit', async () => {
      await backupService.createBackup(vaultPath);
      
      await backupService.cleanOldBackups();
      
      const backups = await backupService.listBackups();
      expect(backups.length).toBe(1);
    });
  });
});
