/**
 * MyWealth Desktop - VaultManager
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * The I/O Engine for the local-first finance app.
 * Handles all file system operations with atomic writes and concurrency limits.
 */

import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs-extra';
import { getInvestmentManager } from './investments';
import { randomUUID } from 'crypto';
import type { VaultStatus } from '../shared/types';
import { VAULT_STRUCTURE } from '../shared/types';
import { BackupService } from './BackupService';
import { createLogger } from './services/LoggerService';
import { SnapshotService } from './services/SnapshotService';
import { PerformanceCalculator } from './services/PerformanceCalculator';
import { PortfolioAnalyzer } from './services/PortfolioAnalyzer';
import { DividendPredictor } from './services/DividendPredictor';
import {
  AppSettingsSchema,
  AccountsFileSchema,
  CategoriesFileSchema,
  TransactionSchema,
  TransactionsFileSchema,
  AssetsFileSchema,
  HoldingsFileSchema,
  TradesFileSchema,
  DividendsFileSchema,
  PropertiesFileSchema,
  CollectiblesFileSchema,
  SnapshotsFileSchema,
  DepositsFileSchema,
  BrokersFileSchema,
  InsuranceFileSchema,
  InsurancePolicySchema,
  DepositAccountSchema,
  WorkspaceSettingsSchema,
  type AppSettings,
  type Account,
  type Category,
  type Transaction,
  type Asset,
  type Holding,
  type InvestmentTrade,
  type Dividend,
  type Property,
  type Collectible,
  type InsurancePolicy,
  type DepositAccount,
  type Broker,
  type Snapshot,
  type SnapshotsFile,
  type VaultState,
  type SerializableVaultState,
  type WorkspaceSettings,
  createEmptyVaultState,
} from '../shared/schemas';

/** Concurrency limit for file operations */
const MAX_CONCURRENT_READS = 10;

// ============================================================================
// VAULT MANAGER CLASS
// ============================================================================

/**
 * VaultManager - The I/O Engine
 * 
 * Responsibilities:
 * - Settings persistence in userData
 * - Vault initialization and validation
 * - Loading vault data with concurrency limits
 * - Atomic file writes for data integrity
 * - Automatic backups with intelligent scheduling
 */
export class VaultManager {
  private settingsPath: string;
  private settings: AppSettings | null = null;
  private vaultState: VaultState = createEmptyVaultState();
  private backupService: BackupService | null = null;
  private snapshotService: SnapshotService | null = null;
  private performanceCalculator: PerformanceCalculator | null = null;
  private portfolioAnalyzer: PortfolioAnalyzer | null = null;
  private dividendPredictor: DividendPredictor | null = null;

  constructor() {
    // Settings stored in Electron's userData directory
    // macOS: ~/Library/Application Support/my-wealth-desktop/
    // Windows: %APPDATA%/my-wealth-desktop/
    // Linux: ~/.config/my-wealth-desktop/
    this.settingsPath = path.join(app.getPath('userData'), VAULT_STRUCTURE.SETTINGS_FILE);
    
    // Initialize analytics services (SnapshotService initialized after vault load)
    this.performanceCalculator = new PerformanceCalculator();
    this.portfolioAnalyzer = new PortfolioAnalyzer();
    this.dividendPredictor = new DividendPredictor();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the VaultManager - load settings from disk
   */
  async initialize(): Promise<void> {
    try {
      if (await fs.pathExists(this.settingsPath)) {
        const data = await fs.readJson(this.settingsPath);
        const parsed = AppSettingsSchema.safeParse(data);
        
        if (parsed.success) {
          this.settings = parsed.data;
        } else {
          console.error('Invalid settings file:', parsed.error);
          this.settings = null;
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = null;
    }
  }

  /**
   * Check if the app has been initialized with a vault
   */
  isInitialized(): boolean {
    return this.settings !== null && this.settings.vaultPath !== null;
  }

  /**
   * Get the current state of the vault
   */
  getState(): VaultState {
    return this.vaultState;
  }

  /**
   * Get the current vault status
   */
  async getStatus(): Promise<VaultStatus> {
    if (!this.settings || !this.settings.vaultPath) {
      return {
        isInitialized: false,
        vaultPath: null,
        isAccessible: false,
      };
    }

    const vaultPath = this.settings.vaultPath;
    
    try {
      const exists = await fs.pathExists(vaultPath);
      if (!exists) {
        return {
          isInitialized: true,
          vaultPath,
          isAccessible: false,
          error: 'Vault directory does not exist',
        };
      }

      // Check if we can write to the vault
      const testFile = path.join(vaultPath, '.mywealth-test');
      await fs.writeFile(testFile, 'test');
      await fs.remove(testFile);

      return {
        isInitialized: true,
        vaultPath,
        isAccessible: true,
      };
    } catch (error) {
      return {
        isInitialized: true,
        vaultPath,
        isAccessible: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current vault path
   */
  getVaultPath(): string | null {
    return this.settings?.vaultPath ?? null;
  }
  
  /**
   * Get all assets
   */
  get assets(): Asset[] {
    return this.vaultState.assets;
  }

  /**
   * Get all holdings
   */
  get holdings(): Holding[] {
    return this.vaultState.holdings;
  }

  /**
   * Get all categories
   */
  get categories(): Category[] {
    return Array.from(this.vaultState.categories.values());
  }

  /**
   * Get all accounts
   */
  get accounts(): Account[] {
    return Array.from(this.vaultState.accounts.values());
  }

  /**
   * Open a folder selection dialog
   */
  async selectVaultPath(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: 'Select Vault Location',
      message: 'Choose a folder to store your financial data',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  /**
   * Initialize a new vault at the specified path
   */
  async initializeVault(vaultPath: string): Promise<void> {
    // Create the vault directory structure
    await fs.ensureDir(vaultPath);
    await fs.ensureDir(path.join(vaultPath, VAULT_STRUCTURE.TRANSACTIONS_DIR));

    // Create empty accounts.json
    const accountsPath = path.join(vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE);
    if (!(await fs.pathExists(accountsPath))) {
      await fs.writeJson(accountsPath, { version: 1, accounts: [] }, { spaces: 2 });
    }

    // Create empty categories.json with default categories
    const categoriesPath = path.join(vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE);
    if (!(await fs.pathExists(categoriesPath))) {
      await fs.writeJson(categoriesPath, { version: 1, categories: [] }, { spaces: 2 });
    }

    // Save settings
    await this.saveSettings({
      vaultPath,
      theme: 'system',
      lastAppVersion: app.getVersion(),
      lastModified: new Date().toISOString(),
      hasCompletedTutorial: false
    });
  }
  
  /**
   * Reset the vault path in settings
   */
  async resetVaultPath(): Promise<void> {
    if (this.settings) {
        await this.saveSettings({
            ...this.settings,
            vaultPath: null
        });
        // Clear in-memory state
        this.vaultState = createEmptyVaultState();
    }
  }

  // ==========================================================================
  // READING - THE "SCAN"
  // ==========================================================================

  /**
   * Load the entire vault into memory
   * 
   * Reads accounts, categories, and scans transactions folder
   * with concurrency limits to avoid opening too many files at once.
   * 
   * @returns Serializable vault state for IPC transfer
   */
  async loadVault(): Promise<SerializableVaultState> {
    const vaultPath = this.settings?.vaultPath;
    
    if (!vaultPath) {
        console.warn('[VaultManager] loadVault called but no vault path configured in settings.');
        this.vaultState = createEmptyVaultState();
        return this.getSerializableState();
    }

    // Load vault

    try {
      // Reset state
      this.vaultState = createEmptyVaultState();
      this.vaultState.vaultPath = vaultPath;

      // Load accounts
      const accountsPath = path.join(vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE);
      if (await fs.pathExists(accountsPath)) {
        const accountsData = await fs.readJson(accountsPath);
        const parsed = AccountsFileSchema.safeParse(accountsData);
        if (parsed.success) {
          for (const account of parsed.data.accounts) {
            this.vaultState.accounts.set(account.id, account);
          }
        } else {
          console.error('[VaultManager] Invalid accounts.json:', parsed.error);
        }
      } else {
        console.warn(`[VaultManager] accounts.json NOT FOUND at ${accountsPath}`);
      }

      // Load categories
      const categoriesPath = path.join(vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE);
      if (await fs.pathExists(categoriesPath)) {
        const categoriesData = await fs.readJson(categoriesPath);
        const parsed = CategoriesFileSchema.safeParse(categoriesData);
        if (parsed.success) {
          for (const category of parsed.data.categories) {
            this.vaultState.categories.set(category.id, category);
          }
        } else {
          console.error('Invalid categories.json:', parsed.error);
        }
      }

      // Load Brokers
      const brokersPath = path.join(vaultPath, VAULT_STRUCTURE.BROKERS_FILE);
      if (await fs.pathExists(brokersPath)) {
        try {
          const brokersData = await fs.readJson(brokersPath);
          const parsed = BrokersFileSchema.safeParse(brokersData);
          if (parsed.success) {
            this.vaultState.brokers = parsed.data.brokers;
          } else {
            console.error('Invalid brokers.json:', parsed.error);
          }
        } catch (e) {
          console.error('Failed to load brokers:', e);
        }
      }


      // Load Assets
      const assetsPath = path.join(vaultPath, 'assets.json');
      if (await fs.pathExists(assetsPath)) {
        try {
            const data = await fs.readJson(assetsPath);
            const parsed = AssetsFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.assets = parsed.data.assets;
            } else {
                console.error('Invalid assets.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load assets:', e);
        }
      }

      // Load Holdings
      const holdingsPath = path.join(vaultPath, 'holdings.json');
      if (await fs.pathExists(holdingsPath)) {
        try {
            const data = await fs.readJson(holdingsPath);
            const parsed = HoldingsFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.holdings = parsed.data.holdings;
            } else {
                console.error('Invalid holdings.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load holdings:', e);
        }
      }

      // Load Properties (Real Estate)
      const propertiesPath = path.join(vaultPath, 'properties.json');
      if (await fs.pathExists(propertiesPath)) {
        try {
            const data = await fs.readJson(propertiesPath);
            const parsed = PropertiesFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.properties = parsed.data.properties;
            } else {
                console.error('Invalid properties.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load properties:', e);
        }
      }

      // Load Collectibles
      const collectiblesPath = path.join(vaultPath, 'collectibles.json');
      if (await fs.pathExists(collectiblesPath)) {
        try {
            const data = await fs.readJson(collectiblesPath);
            const parsed = CollectiblesFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.collectibles = parsed.data.collectibles;
            } else {
                console.error('Invalid collectibles.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load collectibles:', e);
        }
      }

      // Load Insurance
      const insurancePath = path.join(vaultPath, VAULT_STRUCTURE.INSURANCE_FILE);
      if (await fs.pathExists(insurancePath)) {
        try {
            const data = await fs.readJson(insurancePath);
            const parsed = InsuranceFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.insurance = parsed.data.policies;
            } else {
                console.error('Invalid insurance.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load insurance:', e);
        }
      }

      // Load Deposits
      const depositsPath = path.join(vaultPath, VAULT_STRUCTURE.DEPOSITS_FILE);
      if (await fs.pathExists(depositsPath)) {
        try {
            const data = await fs.readJson(depositsPath);
            const parsed = DepositsFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.deposits = parsed.data.deposits;
            } else {
                console.error('Invalid deposits.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load deposits:', e);
        }
      }

      // Load Trades (Investment history)
      const tradesPath = path.join(vaultPath, 'trades.json');
      if (await fs.pathExists(tradesPath)) {
        try {
            const data = await fs.readJson(tradesPath);
            const parsed = TradesFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.trades = parsed.data.trades;
            } else {
                console.error('Invalid trades.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load trades:', e);
        }
      }

      // Load Dividends
      const dividendsPath = path.join(vaultPath, 'dividends.json');
      if (await fs.pathExists(dividendsPath)) {
        try {
            const data = await fs.readJson(dividendsPath);
            const parsed = DividendsFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.dividends = parsed.data.dividends;
            } else {
                console.error('Invalid dividends.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load dividends:', e);
        }
      }

      // Load Snapshots
      const snapshotsPath = path.join(vaultPath, VAULT_STRUCTURE.SNAPSHOTS_FILE);
      if (await fs.pathExists(snapshotsPath)) {
        try {
            const data = await fs.readJson(snapshotsPath);
            const parsed = SnapshotsFileSchema.safeParse(data);
            if (parsed.success) {
                this.vaultState.snapshots = parsed.data.snapshots;
            } else {
                console.error('Invalid snapshots.json:', parsed.error);
            }
        } catch (e) {
            console.error('Failed to load snapshots:', e);
        }
      }

      // Load workspace settings
      await this.loadWorkspace(vaultPath);

      // Scan transactions folder
      await this.scanTransactions(vaultPath);

      // Calculate account balances
      this.calculateBalances();

      // Initialize backup service for this vault
      if (vaultPath) {
        // Initialize BackupService with vault path
        this.backupService = new BackupService(vaultPath);
        const vaultLogger = createLogger('VaultManager'); // Assuming logger is defined or imported
        vaultLogger.info('BackupService initialized', { vaultPath });

        // Initialize SnapshotService with vault path
        if (!this.snapshotService) {
          this.snapshotService = new SnapshotService(vaultPath);
          vaultLogger.info('SnapshotService initialized', { vaultPath });
        }
      }

      this.vaultState.isLoaded = true;
      return this.getSerializableState();
    } catch (error) {
      console.error('Failed to load vault:', error);
      this.vaultState = createEmptyVaultState();
      return this.getSerializableState();
    }
  }

  /**
   * Recursively scan transactions folder with concurrency limits
   */
  private async scanTransactions(vaultPath: string): Promise<void> {
    const transactionsDir = path.join(vaultPath, VAULT_STRUCTURE.TRANSACTIONS_DIR);
    
    if (!(await fs.pathExists(transactionsDir))) {
      return;
    }

    // Get all year folders
    const years = await fs.readdir(transactionsDir);
    const transactionFiles: string[] = [];

    // Collect all transaction file paths
    for (const year of years) {
      const yearPath = path.join(transactionsDir, year);
      const stat = await fs.stat(yearPath);
      if (!stat.isDirectory()) continue;

      const months = await fs.readdir(yearPath);
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);
        if (!monthStat.isDirectory()) continue;

        // Look for transactions.json in this month folder
        const txFilePath = path.join(monthPath, 'transactions.json');
        if (await fs.pathExists(txFilePath)) {
          transactionFiles.push(txFilePath);
          this.vaultState.loadedMonths.add(`${year}-${month}`);
        }
      }
    }

    // Read files with concurrency limit
    await this.readFilesWithConcurrency(transactionFiles, MAX_CONCURRENT_READS);
  }

  /**
   * Read multiple files with a concurrency limit
   * Prevents opening too many file handles at once
   */
  private async readFilesWithConcurrency(
    files: string[],
    limit: number
  ): Promise<void> {
    const chunks: string[][] = [];
    
    for (let i = 0; i < files.length; i += limit) {
      chunks.push(files.slice(i, i + limit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(file => this.readTransactionFile(file)));
    }
  }

  /**
   * Read and parse a single transaction file
   */
  private async readTransactionFile(filePath: string): Promise<void> {
    try {
      const data = await fs.readJson(filePath);
      const parsed = TransactionsFileSchema.safeParse(data);
      
      if (parsed.success) {
        for (const tx of parsed.data.transactions) {
          this.vaultState.transactions.set(tx.id, tx);
        }
      } else {
        console.error(`Invalid transaction file ${filePath}:`, parsed.error);
      }
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
    }
  }

  /**
   * Calculate account balances from transactions
   * If an account has a manual balance set, use that instead
   */
  private calculateBalances(): void {
    // Start with initial balances or manual overrides
    for (const [id, account] of this.vaultState.accounts) {
      // If manual balance is set, use it and skip transaction calculation for this account
      if (account.manualBalance !== undefined) {
        this.vaultState.accountBalances.set(id, account.manualBalance);
      } else {
        this.vaultState.accountBalances.set(id, account.initialBalance);
      }
    }

    // Apply transactions only to accounts without manual balance
    for (const [, tx] of this.vaultState.transactions) {
      const account = this.vaultState.accounts.get(tx.accountId);
      
      // Skip if account has manual balance override
      if (account?.manualBalance !== undefined) {
        continue;
      }

      const currentBalance = this.vaultState.accountBalances.get(tx.accountId) ?? 0;

      switch (tx.type) {
        case 'income':
          this.vaultState.accountBalances.set(tx.accountId, currentBalance + tx.amount);
          break;
        case 'expense':
          this.vaultState.accountBalances.set(tx.accountId, currentBalance - tx.amount);
          break;
        case 'transfer':
          // Subtract from source
          this.vaultState.accountBalances.set(tx.accountId, currentBalance - tx.amount);
          // Add to destination
          if (tx.toAccountId) {
            const destAccount = this.vaultState.accounts.get(tx.toAccountId);
            // Only apply if destination doesn't have manual balance
            if (destAccount?.manualBalance === undefined) {
              const destBalance = this.vaultState.accountBalances.get(tx.toAccountId) ?? 0;
              this.vaultState.accountBalances.set(tx.toAccountId, destBalance + tx.amount);
            }
          }
          break;
      }
    }
  }

  // ==========================================================================
  // WORKSPACE SETTINGS
  // ==========================================================================

  /**
   * Load workspace settings from vault
   */
  private async loadWorkspace(vaultPath: string): Promise<void> {
    try {
      const workspacePath = path.join(vaultPath, VAULT_STRUCTURE.WORKSPACE_FILE);
      
      if (await fs.pathExists(workspacePath)) {
        const data = await fs.readJson(workspacePath);
        const result = WorkspaceSettingsSchema.safeParse(data);
        
        if (result.success) {
          this.vaultState.workspace = result.data;
        } else {
          console.warn('Invalid workspace settings, using defaults:', result.error);
          this.vaultState.workspace = { taxDefaults: {} };
        }
      } else {
        this.vaultState.workspace = { taxDefaults: {} };
      }
    } catch (error) {
      console.error('Failed to load workspace settings:', error);
      this.vaultState.workspace = { taxDefaults: {} };
    }
  }

  /**
   * Save workspace settings to vault
   */
  async saveWorkspace(settings: Partial<WorkspaceSettings>): Promise<boolean> {
    if (!this.vaultState.isLoaded || !this.vaultState.vaultPath) {
      return false;
    }

    try {
      // Merge with existing settings
      const newSettings = {
        ...this.vaultState.workspace,
        ...settings,
      };

      // Validate
      const result = WorkspaceSettingsSchema.safeParse(newSettings);
      if (!result.success) {
        console.error('Invalid workspace settings:', result.error);
        return false;
      }

      const workspacePath = path.join(this.vaultState.vaultPath, VAULT_STRUCTURE.WORKSPACE_FILE);
      await fs.writeJson(workspacePath, result.data, { spaces: 2 });
      
      this.vaultState.workspace = result.data;
      return true;
    } catch (error) {
      console.error('Failed to save workspace settings:', error);
      return false;
    }
  }

  /**
   * Download and save a broker logo from Clearbit
   */
  async downloadBrokerLogo(domain: string, brokerId: string): Promise<string | null> {
    if (!this.settings?.vaultPath) return null;

    try {
      // Use native fetch (Node 18+)
      
      const response = await fetch(`https://logo.clearbit.com/${domain}`);
      if (!response.ok) {
        console.warn(`[VaultManager] Failed to fetch logo for ${domain}: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const logosDir = path.join(this.settings.vaultPath, 'logos');
      await fs.ensureDir(logosDir);

      const fileName = `${brokerId}.png`;
      const filePath = path.join(logosDir, fileName);
      
      await fs.writeFile(filePath, Buffer.from(buffer));

      return `logos/${fileName}`;
    } catch (error) {
      console.error('[VaultManager] Failed to download logo:', error);
      return null;
    }
  }

  /**
   * Save a custom logo file to the vault
   */
  async saveBrokerLogo(sourcePath: string, brokerId: string): Promise<string> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');
    
    const logosDir = path.join(this.settings.vaultPath, 'logos');
    await fs.ensureDir(logosDir);
    
    const ext = path.extname(sourcePath);
    const filename = `${brokerId}${ext}`;
    const destPath = path.join(logosDir, filename);
    
    await fs.copyFile(sourcePath, destPath);
    
    return `logos/${filename}`;
  }

  // ==========================================================================
  // IPC HANDLERS
  // ==========================================================================
  
  /**
   * Register IPC handlers for renderer communication
   */
  /* 
   * Note: This method is manually called in main/index.ts to register handlers.
   * We don't register them here strictly to keep separation of concerns, 
   * but we expose public methods that main/index.ts calls.
   */

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Convert internal state to IPC-safe object (Arrays instead of Maps/Sets)
   */
  getSerializableState(): SerializableVaultState {
    return {
      isLoaded: this.vaultState.isLoaded,
      vaultPath: this.vaultState.vaultPath,
      accounts: Array.from(this.vaultState.accounts.values()),
      categories: Array.from(this.vaultState.categories.values()),
      transactions: Array.from(this.vaultState.transactions.values()),
      loadedMonths: Array.from(this.vaultState.loadedMonths),
      accountBalances: Object.fromEntries(this.vaultState.accountBalances),
      assets: this.vaultState.assets,
      holdings: this.vaultState.holdings,
      properties: this.vaultState.properties,
      collectibles: this.vaultState.collectibles,
      insurance: this.vaultState.insurance,
      deposits: this.vaultState.deposits,
      trades: this.vaultState.trades,
      dividends: this.vaultState.dividends,
      brokers: this.vaultState.brokers,
      snapshots: this.vaultState.snapshots,
      workspace: this.vaultState.workspace,
    };
  }

  // ==========================================================================
  // WRITING - THE "SAVE"
  // ==========================================================================

  /**
   * Save a transaction to disk
   * 
   * Uses atomic write: write to temp file, then rename.
   * This prevents data corruption if the app crashes mid-write.
   * 
   * @param transaction - The transaction data (id will be generated if not provided)
   * @returns The saved transaction with generated ID
   */
  async saveTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Transaction> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const now = new Date().toISOString();
    
    // Create full transaction with generated fields
    const fullTransaction: Transaction = {
      ...transaction,
      id: transaction.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Transaction;

    // Validate with Zod
    const validated = TransactionSchema.parse(fullTransaction);

    // Determine file path based on transaction date
    const txDate = new Date(validated.date);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    
    const monthDir = path.join(
      this.settings.vaultPath,
      VAULT_STRUCTURE.TRANSACTIONS_DIR,
      year.toString(),
      monthStr
    );
    const filePath = path.join(monthDir, 'transactions.json');

    // Ensure directory exists
    await fs.ensureDir(monthDir);

    // Read existing file or create new structure
    let txFile = { version: 1 as const, year, month, transactions: [] as Transaction[] };
    
    if (await fs.pathExists(filePath)) {
      try {
        const existing = await fs.readJson(filePath);
        const parsed = TransactionsFileSchema.safeParse(existing);
        if (parsed.success) {
          txFile = parsed.data;
        }
      } catch {
        // If file is corrupted, start fresh
        console.warn(`Corrupted transaction file at ${filePath}, starting fresh`);
      }
    }

    // Check if this is an update or new transaction
    const existingIndex = txFile.transactions.findIndex(t => t.id === validated.id);
    if (existingIndex >= 0) {
      // Update existing
      txFile.transactions[existingIndex] = {
        ...validated,
        createdAt: txFile.transactions[existingIndex].createdAt, // Preserve original creation time
      };
    } else {
      // Add new
      txFile.transactions.push(validated);
    }

    // Atomic write: write to temp file, then rename
    await this.atomicWriteJson(filePath, txFile);

    // Update in-memory state
    this.vaultState.transactions.set(validated.id, validated);
    this.vaultState.loadedMonths.add(`${year}-${monthStr}`);
    this.calculateBalances();

    return validated;
  }

  /**
   * Delete a transaction from disk
   */
  async deleteTransaction(id: string): Promise<void> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    // Find transaction in memory to get the date (needed for file path)
    const transaction = this.vaultState.transactions.get(id);
    if (!transaction) {
      console.warn(`Transaction ${id} not found in memory, scanning all files or aborting.`);
      // If not in memory, we might need to scan index? But for now assume memory is source of truth.
      // If not found, nothing to delete.
      return;
    }

    const txDate = new Date(transaction.date);
    const year = txDate.getFullYear();
    const month = txDate.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    
    const monthDir = path.join(
      this.settings.vaultPath,
      VAULT_STRUCTURE.TRANSACTIONS_DIR,
      year.toString(),
      monthStr
    );
    const filePath = path.join(monthDir, 'transactions.json');

    if (await fs.pathExists(filePath)) {
        try {
            const data = await fs.readJson(filePath);
            const parsed = TransactionsFileSchema.safeParse(data);
            
            if (parsed.success) {
                const newTransactions = parsed.data.transactions.filter(t => t.id !== id);
                
                // If no transactions left, maybe delete file? 
                // For now, just save empty array or filtered array.
                const newFileContent = {
                    ...parsed.data,
                    transactions: newTransactions
                };
                
                await this.atomicWriteJson(filePath, newFileContent);
            }
        } catch (e) {
            throw new Error(`Failed to delete transaction from file: ${e}`);
        }
    }

    // Update in-memory state
    this.vaultState.transactions.delete(id);
    this.calculateBalances();
  }

  /**
   * Save an account to disk
   */
  async saveAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Account> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const now = new Date().toISOString();
    const fullAccount: Account = {
      ...account,
      id: account.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Account;

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE);
    
    // Read existing
    let accountsFile = { version: 1 as const, accounts: [] as Account[] };
    if (await fs.pathExists(filePath)) {
      const existing = await fs.readJson(filePath);
      const parsed = AccountsFileSchema.safeParse(existing);
      if (parsed.success) {
        accountsFile = parsed.data;
      }
    }

    // Update or add
    const existingIndex = accountsFile.accounts.findIndex(a => a.id === fullAccount.id);
    if (existingIndex >= 0) {
      accountsFile.accounts[existingIndex] = {
        ...fullAccount,
        createdAt: accountsFile.accounts[existingIndex].createdAt,
      };
    } else {
      accountsFile.accounts.push(fullAccount);
    }

    await this.atomicWriteJson(filePath, accountsFile);

    // Update in-memory state
    this.vaultState.accounts.set(fullAccount.id, fullAccount);
    this.calculateBalances();

    return fullAccount;
  }

  /**
   * Delete an account from disk
   */
  async deleteAccount(id: string): Promise<void> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const { vaultPath } = this.settings;
    
    // 1. Delete Account
    const accountsPath = path.join(vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE);
    let accountsFile = { version: 1 as const, accounts: [] as Account[] };
    if (await fs.pathExists(accountsPath)) {
      try {
        const existing = await fs.readJson(accountsPath);
        const parsed = AccountsFileSchema.safeParse(existing);
        if (parsed.success) {
          accountsFile = parsed.data;
        }
      } catch (e) {
        throw new Error(`Failed to read accounts file: ${e}`);
      }
    }

    const initialLength = accountsFile.accounts.length;
    accountsFile.accounts = accountsFile.accounts.filter(a => a.id !== id);

    if (accountsFile.accounts.length === initialLength) {
        return; // Account not found, nothing to do
    }

    await this.atomicWriteJson(accountsPath, accountsFile);
    this.vaultState.accounts.delete(id);

    // 2. Delete Associated Transactions (Cascading)
    // Iterate through all transaction files
    const transactionsDir = path.join(vaultPath, VAULT_STRUCTURE.TRANSACTIONS_DIR);
    if (await fs.pathExists(transactionsDir)) {
      const years = await fs.readdir(transactionsDir);
      for (const year of years) {
        const yearPath = path.join(transactionsDir, year);
        if (!(await fs.stat(yearPath)).isDirectory()) continue;

        const months = await fs.readdir(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          if (!(await fs.stat(monthPath)).isDirectory()) continue;

          const transFilePath = path.join(monthPath, 'transactions.json');
          if (await fs.pathExists(transFilePath)) {
             try {
               const fileData = await fs.readJson(transFilePath);
               const parsed = TransactionsFileSchema.safeParse(fileData);
               if (parsed.success) {
                 const initialCount = parsed.data.transactions.length;
                 // Filter out transactions belonging to this account or transfers TO this account
                 const newTransactions = parsed.data.transactions.filter(t => 
                   t.accountId !== id && t.toAccountId !== id
                 );

                 if (newTransactions.length !== initialCount) {
                   await this.atomicWriteJson(transFilePath, { ...parsed.data, transactions: newTransactions });
                 }
               }
             } catch (e) {
               console.error(`Failed to process transactions file ${transFilePath}`, e);
             }
          }
        }
      }
    }

    // Update in-memory transactions
    const txDeleteIds: string[] = [];
    for (const [txId, tx] of this.vaultState.transactions.entries()) {
        if (tx.accountId === id || tx.toAccountId === id) {
            txDeleteIds.push(txId);
        }
    }
    txDeleteIds.forEach(txId => this.vaultState.transactions.delete(txId));

    // 3. Delete Associated Holdings
    const holdingsPath = path.join(vaultPath, 'holdings.json');
    if (await fs.pathExists(holdingsPath)) {
        try {
            const data = await fs.readJson(holdingsPath);
            const parsed = HoldingsFileSchema.safeParse(data);
            if (parsed.success) {
                const newHoldings = parsed.data.holdings.filter(h => h.accountId !== id);
                if (newHoldings.length !== parsed.data.holdings.length) {
                    await this.atomicWriteJson(holdingsPath, { ...parsed.data, holdings: newHoldings });
                    this.vaultState.holdings = newHoldings;
                }
            }
        } catch (e) {
            console.warn('Failed to clean up holdings', e);
        }
    }

    // 4. Delete Associated Trades
    const tradesPath = path.join(vaultPath, 'trades.json');
    if (await fs.pathExists(tradesPath)) {
        try {
            const data = await fs.readJson(tradesPath);
            const parsed = TradesFileSchema.safeParse(data);
            if (parsed.success) {
                const newTrades = parsed.data.trades.filter(t => t.accountId !== id);
                if (newTrades.length !== parsed.data.trades.length) {
                    await this.atomicWriteJson(tradesPath, { ...parsed.data, trades: newTrades });
                    this.vaultState.trades = newTrades;
                }
            }
        } catch (e) {
             console.warn('Failed to clean up trades', e);
        }
    }

    // 5. Delete Associated Dividends
    const dividendsPath = path.join(vaultPath, 'dividends.json');
    if (await fs.pathExists(dividendsPath)) {
        try {
            const data = await fs.readJson(dividendsPath);
            const parsed = DividendsFileSchema.safeParse(data);
            if (parsed.success) {
                const newDividends = parsed.data.dividends.filter(d => d.accountId !== id);
                if (newDividends.length !== parsed.data.dividends.length) {
                    await this.atomicWriteJson(dividendsPath, { ...parsed.data, dividends: newDividends });
                    this.vaultState.dividends = newDividends;
                }
            }
        } catch (e) {
            console.warn('Failed to clean up dividends', e);
        }
    }

    this.calculateBalances();
  }

  /**
   * Set or clear manual balance for an account
   * @param accountId - Account ID
   * @param balance - Balance in cents, or null to clear manual balance
   * @param date - Date when balance was set (ISO string)
   */
  async setAccountManualBalance(accountId: string, balance: number | null, date: string): Promise<Account> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE);
    
    // Read existing
    let accountsFile = { version: 1 as const, accounts: [] as Account[] };
    if (await fs.pathExists(filePath)) {
      const existing = await fs.readJson(filePath);
      const parsed = AccountsFileSchema.safeParse(existing);
      if (parsed.success) {
        accountsFile = parsed.data;
      }
    }

    // Find account
    const accountIndex = accountsFile.accounts.findIndex(a => a.id === accountId);
    if (accountIndex < 0) {
      throw new Error(`Account ${accountId} not found`);
    }

    const now = new Date().toISOString();
    const updatedAccount: Account = {
      ...accountsFile.accounts[accountIndex],
      manualBalance: balance !== null ? balance : undefined,
      manualBalanceDate: balance !== null ? date : undefined,
      updatedAt: now,
    };

    accountsFile.accounts[accountIndex] = updatedAccount;

    await this.atomicWriteJson(filePath, accountsFile);

    // Update in-memory state
    this.vaultState.accounts.set(accountId, updatedAccount);
    this.calculateBalances();

    return updatedAccount;
  }

  /**
   * Save a category to disk
   */
  async saveCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Category> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const now = new Date().toISOString();
    const fullCategory: Category = {
      ...category,
      id: category.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Category;

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE);
    
    // Read existing
    let categoriesFile = { version: 1 as const, categories: [] as Category[] };
    if (await fs.pathExists(filePath)) {
      const existing = await fs.readJson(filePath);
      const parsed = CategoriesFileSchema.safeParse(existing);
      if (parsed.success) {
        categoriesFile = parsed.data;
      }
    }

    // Update or add
    const existingIndex = categoriesFile.categories.findIndex(c => c.id === fullCategory.id);
    if (existingIndex >= 0) {
      categoriesFile.categories[existingIndex] = {
        ...fullCategory,
        createdAt: categoriesFile.categories[existingIndex].createdAt,
      };
    } else {
      categoriesFile.categories.push(fullCategory);
    }

    await this.atomicWriteJson(filePath, categoriesFile);

    // Update in-memory state
    this.vaultState.categories.set(fullCategory.id, fullCategory);

    return fullCategory;
  }

  /**
   * Delete a category from disk
   */
  async deleteCategory(id: string): Promise<void> {
    if (!this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE);
    
    // Read existing
    if (await fs.pathExists(filePath)) {
      try {
        const existing = await fs.readJson(filePath);
        const parsed = CategoriesFileSchema.safeParse(existing);
        
        if (parsed.success) {
          const newCategories = parsed.data.categories.filter(c => c.id !== id);
          
          const newFileContent = {
            ...parsed.data,
            categories: newCategories
          };
          
          await this.atomicWriteJson(filePath, newFileContent);
        }
      } catch (e) {
        throw new Error(`Failed to delete category from file: ${e}`);
      }
    }

    // Update in-memory state
    this.vaultState.categories.delete(id);
  }

  /**
   * Atomic write: write to temp file, then rename
   * Prevents data corruption if app crashes mid-write
   */
  private async atomicWriteJson(filePath: string, data: unknown): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    
    try {
      await fs.writeJson(tempPath, data, { spaces: 2 });
      await fs.rename(tempPath, filePath);
      
      // Trigger intelligent backup after successful write
      await this.triggerBackup();
    } catch (error) {
      // Clean up temp file if rename failed
      await fs.remove(tempPath).catch(() => {});
      throw error;
    }
  }

  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  /**
   * Save settings to disk
   */
  // ==========================================================================
  // SETTINGS
  // ==========================================================================

  /**
   * Get current app settings
   */
  getSettings(): AppSettings | null {
    return this.settings;
  }

  /**
   * Update app settings
   */
  async updateSettings(settings: AppSettings): Promise<void> {
    await this.saveSettings(settings);
  }

  /**
   * Save settings to disk (private)
   */
  private async saveSettings(settings: AppSettings): Promise<void> {
    const validated = AppSettingsSchema.parse(settings);
    
    await fs.ensureDir(path.dirname(this.settingsPath));
    await fs.writeJson(this.settingsPath, validated, { spaces: 2 });
    
    this.settings = validated;
  }

  // ==========================================================================
  // INVESTMENTS - ASSETS & HOLDINGS
  // ==========================================================================

  /**
   * Save an asset to disk
   */
  async saveAsset(asset: Asset): Promise<Asset> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    // Load existing assets file
    // We store all assets in a single file assets.json for simplicity
    // (similar to accounts/categories)
    const filePath = path.join(this.settings.vaultPath, 'assets.json');
    let assets = [] as Asset[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        // Basic validation or schema check here (omitted for brevity)
        if (Array.isArray(data.assets)) {
            assets = data.assets;
        }
      } catch (e) {
        console.warn('Failed to read assets.json', e);
      }
    }

    // Update or Add
    const index = assets.findIndex(a => a.id === asset.id);
    if (index >= 0) {
      assets[index] = asset;
    } else {
      assets.push(asset);
    }

    // Save
    await this.atomicWriteJson(filePath, { version: 1, assets });
    
    // Update memory
    // Note: VaultState needs to use Map instead of Array for better access?
    // Current VaultState uses Array for assets/holdings in schema default, 
    // but typically we want Map for O(1) access. 
    // Let's stick to update logic if we change VaultState structure.
    // For now, let's keep it simple: VaultState update isn't implemented fully 
    // for assets in this class yet because we need to update VaultState type 
    // to include assets map in VaultManager instance.
    
    // REVISIT: We need to update loadVault to read assets.json too.
    return asset;
  }

  /**
   * Delete an asset from disk
   */
  async deleteAsset(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'assets.json');
    let assets = [] as Asset[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.assets)) {
          assets = data.assets;
        }
      } catch (e) {
        console.warn('Failed to read assets.json', e);
      }
    }

    // Filter out
    const initialLength = assets.length;
    assets = assets.filter(a => a.id !== id);

    if (assets.length === initialLength) return;

    await this.atomicWriteJson(filePath, { version: 1, assets });
    
    // Update memory
    // TODO: Ideally VaultState should use Map for assets too
    this.vaultState.assets = assets;
  }

  /**
   * Save a holding to disk
   */
  async saveHolding(holding: Holding): Promise<Holding> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'holdings.json');
    let holdings = [] as Holding[];

    if (await fs.pathExists(filePath)) {
        try {
            const data = await fs.readJson(filePath);
            if (Array.isArray(data.holdings)) {
                holdings = data.holdings;
            }
        } catch (e) {
            console.warn('Failed to read holdings.json', e);
        }
    }

    // Update or Add
    const index = holdings.findIndex(h => h.id === holding.id);
    if (index >= 0) {
        holdings[index] = holding;
    } else {
        holdings.push(holding);
    }

    await this.atomicWriteJson(filePath, { version: 1, holdings });
    return holding;
  }

  /**
   * Delete a holding from disk
   */
  async deleteHolding(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'holdings.json');
    let holdings: Holding[] = [];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.holdings)) {
          holdings = data.holdings;
        }
      } catch (e) {
        console.warn('Failed to read holdings.json', e);
      }
    }

    // Filter out
    const initialLength = holdings.length;
    holdings = holdings.filter(h => h.id !== id);

    if (holdings.length === initialLength) return;

    await this.atomicWriteJson(filePath, { version: 1, holdings });
    this.vaultState.holdings = holdings;
  }

  // ==========================================================================
  // INVESTMENT TRADES & DIVIDENDS
  // ==========================================================================

  /**
   * Save an investment trade to disk
   */
  async saveTrade(trade: InvestmentTrade): Promise<InvestmentTrade> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'trades.json');
    let trades = [] as InvestmentTrade[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.trades)) {
          trades = data.trades;
        }
      } catch (e) {
        console.warn('Failed to read trades.json', e);
      }
    }

    // Update or Add
    const index = trades.findIndex(t => t.id === trade.id);
    if (index >= 0) {
      trades[index] = trade;
    } else {
      trades.push(trade);
    }

    await this.atomicWriteJson(filePath, { version: 1, trades });
    
    // Update in-memory state
    this.vaultState.trades = trades;
    
    return trade;
  }

  /**
   * Save a dividend to disk
   */
  async saveDividend(dividend: Dividend): Promise<Dividend> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'dividends.json');
    let dividends = [] as Dividend[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.dividends)) {
          dividends = data.dividends;
        }
      } catch (e) {
        console.warn('Failed to read dividends.json', e);
      }
    }

    // Update or Add
    const index = dividends.findIndex(d => d.id === dividend.id);
    if (index >= 0) {
      dividends[index] = dividend;
    } else {
      dividends.push(dividend);
    }

    await this.atomicWriteJson(filePath, { version: 1, dividends });
    
    // Update in-memory state
    this.vaultState.dividends = dividends;
    
    return dividend;
  }

  /**
   * Delete a dividend from disk
   */
  async deleteDividend(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'dividends.json');
    let dividends = [] as Dividend[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.dividends)) {
          dividends = data.dividends;
        }
      } catch (e) {
        console.warn('Failed to read dividends.json', e);
      }
    }

    const initialLength = dividends.length;
    dividends = dividends.filter(d => d.id !== id);

    if (dividends.length === initialLength) return;

    await this.atomicWriteJson(filePath, { version: 1, dividends });
    this.vaultState.dividends = dividends;
  }

  // ==========================================================================
  // REAL ESTATE - PROPERTIES
  // ==========================================================================

  /**
   * Save a property to disk
   */
  async saveProperty(property: Property): Promise<Property> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'properties.json');
    let properties = [] as Property[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.properties)) {
          properties = data.properties;
        }
      } catch (e) {
        console.warn('Failed to read properties.json', e);
      }
    }

    // Update or Add
    const index = properties.findIndex(p => p.id === property.id);
    if (index >= 0) {
      properties[index] = property;
    } else {
      properties.push(property);
    }

    await this.atomicWriteJson(filePath, { version: 1, properties });
    
    // Update in-memory state
    this.vaultState.properties = properties;
    
    return property;
  }

  /**
   * Delete a property from disk
   */
  async deleteProperty(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'properties.json');
    let properties = [] as Property[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.properties)) {
          properties = data.properties;
        }
      } catch (e) {
        console.warn('Failed to read properties.json', e);
      }
    }

    // Filter out the property
    const initialLength = properties.length;
    properties = properties.filter(p => p.id !== id);

    if (properties.length === initialLength) {
      // Property not found, nothing to do
      return;
    }

    await this.atomicWriteJson(filePath, { version: 1, properties });
    
    // Update in-memory state
    this.vaultState.properties = properties;
  }

  /**
   * Get properties array
   */
  get properties(): Property[] {
    return this.vaultState.properties;
  }

  // ==========================================================================
  // COLLECTIBLES
  // ==========================================================================

  /**
   * Save a collectible to disk
   */
  async saveCollectible(collectible: Collectible): Promise<Collectible> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'collectibles.json');
    let collectibles = [] as Collectible[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.collectibles)) {
          collectibles = data.collectibles;
        }
      } catch (e) {
        console.warn('Failed to read collectibles.json', e);
      }
    }

    // Update or Add
    const index = collectibles.findIndex(c => c.id === collectible.id);
    if (index >= 0) {
      collectibles[index] = collectible;
    } else {
      collectibles.push(collectible);
    }

    await this.atomicWriteJson(filePath, { version: 1, collectibles });
    
    // Update in-memory state
    this.vaultState.collectibles = collectibles;
    
    return collectible;
  }

  /**
   * Delete a collectible from disk
   */
  async deleteCollectible(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, 'collectibles.json');
    let collectibles = [] as Collectible[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.collectibles)) {
          collectibles = data.collectibles;
        }
      } catch (e) {
        console.warn('Failed to read collectibles.json', e);
      }
    }

    // Filter out the collectible
    const initialLength = collectibles.length;
    collectibles = collectibles.filter(c => c.id !== id);

    if (collectibles.length === initialLength) {
      // Collectible not found, nothing to do
      return;
    }

    await this.atomicWriteJson(filePath, { version: 1, collectibles });
    
    // Update in-memory state
    this.vaultState.collectibles = collectibles;
  }

  /**
   * Get collectibles array
   */
  get collectibles(): Collectible[] {
    return this.vaultState.collectibles;
  }
  
  // ==========================================================================
  // INSURANCE
  // ==========================================================================

  /**
   * Save an insurance policy to disk
   */
  async saveInsurance(policy: InsurancePolicy): Promise<InsurancePolicy> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.INSURANCE_FILE);
    let policies = [] as InsurancePolicy[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.policies)) {
          policies = data.policies;
        }
      } catch (e) {
        console.warn('Failed to read insurance.json', e);
      }
    }

    // Validate with Zod before saving
    const validated = InsurancePolicySchema.parse(policy);

    // Update or Add
    const index = policies.findIndex(p => p.id === validated.id);
    if (index >= 0) {
      policies[index] = validated;
    } else {
      policies.push(validated);
    }

    await this.atomicWriteJson(filePath, { version: 1, policies });
    
    // Update in-memory state
    this.vaultState.insurance = policies;
    
    return policy;
  }

  /**
   * Delete an insurance policy from disk
   */
  async deleteInsurance(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.INSURANCE_FILE);
    let policies = [] as InsurancePolicy[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.policies)) {
          policies = data.policies;
        }
      } catch (e) {
        console.warn('Failed to read insurance.json', e);
      }
    }

    const initialLength = policies.length;
    policies = policies.filter(p => p.id !== id);

    if (policies.length === initialLength) return;

    await this.atomicWriteJson(filePath, { version: 1, policies });
    this.vaultState.insurance = policies;
  }

  // ==========================================================================
  // DEPOSIT ACCOUNTS (Conti Deposito)
  // ==========================================================================

  /**
   * Save a deposit account to disk
   */
  async saveDeposit(deposit: DepositAccount): Promise<DepositAccount> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.DEPOSITS_FILE);
    let deposits = [] as DepositAccount[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.deposits)) {
          deposits = data.deposits;
        }
      } catch (e) {
        console.warn('Failed to read deposits.json', e);
      }
    }

    // Validate with Zod before saving
    const validated = DepositAccountSchema.parse(deposit);

    // Update or Add
    const index = deposits.findIndex(d => d.id === validated.id);
    if (index >= 0) {
      deposits[index] = validated;
    } else {
      deposits.push(validated);
    }

    await this.atomicWriteJson(filePath, { version: 1, deposits });
    
    // Update in-memory state
    this.vaultState.deposits = deposits;
    
    return deposit;
  }

  /**
   * Delete a deposit account from disk
   */
  async deleteDeposit(id: string): Promise<void> {
    if (!this.settings?.vaultPath) throw new Error('No vault initialized');

    const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.DEPOSITS_FILE);
    let deposits = [] as DepositAccount[];

    if (await fs.pathExists(filePath)) {
      try {
        const data = await fs.readJson(filePath);
        if (Array.isArray(data.deposits)) {
          deposits = data.deposits;
        }
      } catch (e) {
        console.warn('Failed to read deposits.json', e);
      }
    }

    const initialLength = deposits.length;
    deposits = deposits.filter(d => d.id !== id);

    if (deposits.length !== initialLength) {
      await this.atomicWriteJson(filePath, { version: 1, deposits });
      this.vaultState.deposits = deposits;
    }
  }

  /**
   * Get insurance array
   */
  get insurance(): InsurancePolicy[] {
    return this.vaultState.insurance;
  }
  
  // ==========================================================================
  // BROKER OPERATIONS
  // ==========================================================================

  async saveBroker(broker: Broker): Promise<Broker> {
    if (!this.vaultState.vaultPath) throw new Error('Vault not loaded');

    // Update state
    const existingIndex = this.vaultState.brokers.findIndex(b => b.id === broker.id);
    if (existingIndex >= 0) {
      this.vaultState.brokers[existingIndex] = broker;
    } else {
      this.vaultState.brokers.push(broker);
    }

    // Persist to disk
    const brokersPath = path.join(this.vaultState.vaultPath, VAULT_STRUCTURE.BROKERS_FILE);
    await this.atomicWriteJson(brokersPath, {
      version: 1,
      brokers: this.vaultState.brokers,
    });

    return broker;
  }

  async deleteBroker(brokerId: string): Promise<void> {
    if (!this.vaultState.vaultPath) throw new Error('Vault not loaded');

    // Update state
    this.vaultState.brokers = this.vaultState.brokers.filter(b => b.id !== brokerId);
    
    // Also remove brokerId from associated accounts and holdings
    // Note: We don't delete the account/holding, just unlink the broker
    for (const [id, account] of this.vaultState.accounts) {
        if (account.brokerId === brokerId) {
            const updatedAccount = { ...account, brokerId: undefined };
            this.vaultState.accounts.set(id, updatedAccount);
            await this.saveAccount(updatedAccount); 
        }
    }
    
    let holdingsChanged = false;
    this.vaultState.holdings = this.vaultState.holdings.map(h => {
        if (h.brokerId === brokerId) {
            holdingsChanged = true;
            return { ...h, brokerId: undefined };
        }
        return h;
    });

    if (holdingsChanged) {
        const holdingsPath = path.join(this.vaultState.vaultPath, 'holdings.json');
        if (await fs.pathExists(holdingsPath)) {
             await this.atomicWriteJson(holdingsPath, {
                version: 1,
                holdings: this.vaultState.holdings,
            });
        }
    }

    // Persist to disk
    const brokersPath = path.join(this.vaultState.vaultPath, VAULT_STRUCTURE.BROKERS_FILE);
    await this.atomicWriteJson(brokersPath, {
      version: 1,
      brokers: this.vaultState.brokers,
    });
  }

  /**
   * Get the path for a specific vault file
   */
  getFilePath(relativePath: string): string | null {
    if (!this.settings?.vaultPath) return null;
    return path.join(this.settings.vaultPath, relativePath);
  }

  /**
   * Create a Net Worth Snapshot
   */
  // ==========================================================================
  // BACKUP MANAGEMENT
  // ==========================================================================

  /**
   * Trigger an intelligent backup (respects 30-min interval)
   */
  private async triggerBackup(): Promise<void> {
    if (!this.backupService || !this.settings?.vaultPath) {
      return;
    }

    try {
      // Create a consolidated vault snapshot for backup
      const vaultSnapshot = path.join(this.settings.vaultPath, '.vault-snapshot.json');
      await fs.writeJson(vaultSnapshot, this.getSerializableState(), { spaces: 2 });
      
      await this.backupService.createBackup(vaultSnapshot);
      await this.backupService.cleanOldBackups();
    } catch (error) {
      console.error('[VaultManager] Backup failed:', error);
      // Don't throw - backup failure shouldn't prevent normal operation
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<import('../shared/types').BackupInfo[]> {
    if (!this.backupService) {
      return [];
    }
    return this.backupService.listBackups();
  }

  /**
   * Restore vault from a backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    if (!this.backupService || !this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const vaultSnapshot = path.join(this.settings.vaultPath, '.vault-snapshot.json');
    await this.backupService.restoreBackup(backupId, vaultSnapshot);
    
    // Reload vault after restore
    await this.loadVault();
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    if (!this.backupService) {
      throw new Error('No vault initialized');
    }
    await this.backupService.deleteBackup(backupId);
  }

  /**
   * Create a manual backup now (bypasses 30-min interval)
   */
  async createManualBackup(): Promise<void> {
    if (!this.backupService || !this.settings?.vaultPath) {
      throw new Error('No vault initialized');
    }

    const vaultSnapshot = path.join(this.settings.vaultPath, '.vault-snapshot.json');
    await fs.writeJson(vaultSnapshot, this.getSerializableState(), { spaces: 2 });
    
    // Temporarily create a new backup service instance without interval check
    const tempBackupService = new BackupService(vaultSnapshot, 10);
    // Force backup by clearing existing backups check
    const backups = await tempBackupService.listBackups();
    if (backups.length > 0) {
      // Manually trigger backup
      await tempBackupService.createBackup(vaultSnapshot);
    }
    
    await this.backupService.cleanOldBackups();
  }

  // ==========================================================================
  // SNAPSHOTS
  // ==========================================================================

  async createSnapshot(): Promise<Snapshot> {
      if (!this.settings?.vaultPath) {
          throw new Error('No vault initialized');
      }

      const now = new Date().toISOString();

      // 1. Calculate Cash (Accounts)
      let cashTotal = 0;
      for (const balance of this.vaultState.accountBalances.values()) {
        cashTotal += balance;
      }

      // 2. Calculate Investments (Holdings * Current Price)
      let investmentsTotal = 0;
      for (const holding of this.vaultState.holdings) {
          // Find asset price
          const asset = this.vaultState.assets.find(a => a.id === holding.assetId);
          if (asset) {
              investmentsTotal += holding.quantity * asset.currentPrice; 
          }
      }

      // 3. Calculate Real Estate
      let realEstateTotal = 0;
      for (const property of this.vaultState.properties) {
          realEstateTotal += property.currentValue;
      }

      // 4. Calculate Collectibles
      let collectiblesTotal = 0;
      for (const collectible of this.vaultState.collectibles) {
          collectiblesTotal += collectible.currentValue;
      }

      // 5. Calculate Insurance (Current Value)
      let insuranceTotal = 0;
      for (const policy of this.vaultState.insurance) {
          insuranceTotal += policy.currentValue;
      }

      // 6. Calculate Deposits (Principal)
      let depositsTotal = 0;
      for (const deposit of this.vaultState.deposits) {
          depositsTotal += deposit.principal;
      }

      // 7. Calculate Unrealized Tax
      let totalUnrealizedTax = 0;
      const ws = this.vaultState.workspace;

      // Holdings Tax
      for (const holding of this.vaultState.holdings) {
          const asset = this.vaultState.assets.find(a => a.id === holding.assetId);
          if (asset) {
              const marketValue = holding.quantity * asset.currentPrice;
              const costBasis = holding.quantity * holding.averageBuyPrice;
              const gain = marketValue - costBasis;
              if (gain > 0) {
                  const rate = holding.taxRate ?? ws?.taxDefaults?.[asset.type] ?? 26;
                  const tax = gain * (rate / 100);
                  totalUnrealizedTax += tax;
              }
          }
      }

      // Properties Tax
      for (const p of this.vaultState.properties) {
          const gain = p.currentValue - (p.purchasePrice || 0);
          if (gain > 0) {
              const rate = p.taxRate ?? ws?.taxDefaults?.[p.type] ?? 0;
              const tax = gain * (rate / 100);
              totalUnrealizedTax += tax;
          }
      }

      // Collectibles Tax
      for (const c of this.vaultState.collectibles) {
           const gain = c.currentValue - (c.purchasePrice || 0);
           if (gain > 0) {
               const rate = c.taxRate ?? ws?.taxDefaults?.['collectible'] ?? 0;
               const tax = gain * (rate / 100);
               totalUnrealizedTax += tax;
           }
      }

      const totalNetWorth = cashTotal + investmentsTotal + realEstateTotal + collectiblesTotal + insuranceTotal + depositsTotal;

      const snapshot: Snapshot = {
          id: randomUUID(),
          date: now,
          totalNetWorth: Math.round(totalNetWorth),
          unrealizedTax: Math.round(totalUnrealizedTax),
          currency: 'EUR', // Hardcoded base currency for now, or use settings
          breakdown: {
              cash: Math.round(cashTotal),
              investments: Math.round(investmentsTotal),
              realEstate: Math.round(realEstateTotal),
              collectibles: Math.round(collectiblesTotal),
              insurance: Math.round(insuranceTotal),
              deposits: Math.round(depositsTotal),
          }
      };

      // Save to disk
      const filePath = path.join(this.settings.vaultPath, VAULT_STRUCTURE.SNAPSHOTS_FILE);
      
      let snapshotsFile: SnapshotsFile = { version: 1, snapshots: [] };
      if (await fs.pathExists(filePath)) {
          try {
              const data = await fs.readJson(filePath);
              const parsed = SnapshotsFileSchema.safeParse(data);
              if (parsed.success) {
                  snapshotsFile = parsed.data;
              }
          } catch (e) {
              console.warn('Failed to read existing snapshots, starting fresh', e);
          }
      }

      snapshotsFile.snapshots.push(snapshot);
      // Sort by date 
      snapshotsFile.snapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      await this.atomicWriteJson(filePath, snapshotsFile);

      // Update memory
      this.vaultState.snapshots = snapshotsFile.snapshots;

      return snapshot;
  }

  /**
   * Create automatic snapshot for analytics (uses SnapshotService)
   * Called after transactions to ensure performance metrics have current data
   */
  async createAutoSnapshot(): Promise<void> {
    if (!this.snapshotService) {
      console.warn('SnapshotService not initialized, skipping auto snapshot');
      return;
    }

    // Check if snapshot already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingSnapshots = this.snapshotService.getSnapshots(today, tomorrow);
    if (existingSnapshots.length > 0) {
      // Snapshot already exists for today, skip
      return;
    }

    // Calculate total portfolio value
    const totalValue = this.calculateTotalPortfolioValue();

    // Get account snapshots for SnapshotService
    const accountSnapshots = this.getAccountSnapshotsForAnalytics();

    // Create snapshot via SnapshotService
    await this.snapshotService.createSnapshot(
      totalValue,
      0, // cashFlow - could be calculated from recent transactions
      accountSnapshots
    );

    console.log('[VaultManager] Auto snapshot created', { totalValue });
  }

  /**
   * Calculate total portfolio value across all asset types
   */
  private calculateTotalPortfolioValue(): number {
    let total = 0;

    // Cash accounts
    for (const balance of this.vaultState.accountBalances.values()) {
      total += balance;
    }

    // Investments
    for (const holding of this.vaultState.holdings.values()) {
      const asset = Array.from(this.vaultState.assets.values()).find(a => a.id === holding.assetId);
      if (asset) {
        total += holding.quantity * asset.currentPrice;
      }
    }

    // Properties
    for (const property of this.vaultState.properties.values()) {
      total += property.currentValue || property.purchasePrice || 0;
    }

    // Collectibles
    for (const collectible of this.vaultState.collectibles.values()) {
      total += collectible.currentValue || collectible.purchasePrice || 0;
    }

    // Insurance
    for (const policy of this.vaultState.insurance.values()) {
      total += policy.currentValue || 0;
    }

    // Deposits
    for (const deposit of this.vaultState.deposits.values()) {
      total += deposit.principal;
    }

    return total;
  }

  /**
   * Get account snapshots in SnapshotService format
   */
  private getAccountSnapshotsForAnalytics(): Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    balance: number;
    holdings: Array<{
      investmentId: string;
      ticker: string;
      quantity: number;
      currentPrice: number;
      marketValue: number;
      costBasis: number;
    }>;
  }> {
    const snapshots: Array<{
      accountId: string;
      accountName: string;
      accountType: string;
      balance: number;
      holdings: Array<{
        investmentId: string;
        ticker: string;
        quantity: number;
        currentPrice: number;
        marketValue: number;
        costBasis: number;
      }>;
    }> = [];

    for (const [id, balance] of this.vaultState.accountBalances) {
      const account = this.vaultState.accounts.get(id);
      if (account) {
        // Get holdings for this account
        const accountHoldings = Array.from(this.vaultState.holdings.values())
          .filter(h => h.accountId === id)
          .map(h => {
            const asset = Array.from(this.vaultState.assets.values()).find(a => a.id === h.assetId);
            const currentPrice = asset?.currentPrice || 0;
            const marketValue = h.quantity * currentPrice;
            const costBasis = h.quantity * h.averageBuyPrice;
            
            return {
              investmentId: h.assetId,
              ticker: asset?.symbol || 'UNKNOWN',
              quantity: h.quantity,
              currentPrice,
              marketValue,
              costBasis,
            };
          });

        snapshots.push({
          accountId: id,
          accountName: account.name,
          accountType: account.type,
          balance,
          holdings: accountHoldings,
        });
      }
    }

    return snapshots;
  }

  // ========== ANALYTICS METHODS (STUB) ==========
  // TODO: Full integration with SnapshotService, PortfolioAnalyzer, DividendPredictor

  async refreshInvestmentPrices(): Promise<{ updated: number; failed: number; total: number }> {
    return getInvestmentManager().refreshAllPrices();
  }

  async getPerformanceMetrics(period: 'YTD' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'): Promise<{
    twr: number;
    mwr: number;
    startValue: number;
    endValue: number;
    totalCashFlow: number;
    absoluteGain: number;
    period: string;
  }> {
    if (!this.performanceCalculator || !this.snapshotService) {
      throw new Error('Analytics services not initialized');
    }

    // Calculate date range based on period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'YTD':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case '1M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
        break;
      case '3M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate());
        break;
      case '6M':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 6, endDate.getDate());
        break;
      case '1Y':
        startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());
        break;
      case '3Y':
        startDate = new Date(endDate.getFullYear() - 3, endDate.getMonth(), endDate.getDate());
        break;
      case 'ALL':
        startDate = new Date(2000, 0, 1); // Far past date
        break;
    }

    // Get snapshots from SnapshotService
    const snapshots = this.snapshotService.getSnapshots(startDate, endDate);
    
    // Calculate metrics using PerformanceCalculator
    const metrics = this.performanceCalculator.getMetrics(snapshots, period);
    
    return {
      ...metrics,
      period,
    };
  }

  async getPortfolioComposition(): Promise<{
    totalValue: number;
    sectors: Array<{ name: string; value: number; percentage: number; count: number }>;
    geographies: Array<{ name: string; value: number; percentage: number; count: number }>;
    assetClasses: Array<{ name: string; value: number; percentage: number; count: number }>;
    topHoldings: Array<{ assetId: string; symbol: string; name: string; value: number; percentage: number }>;
    diversificationScore: number;
    warnings: string[];
  }> {
    if (!this.portfolioAnalyzer) {
      throw new Error('PortfolioAnalyzer not initialized');
    }

    // Get current holdings and assets from vault state
    const holdings = Array.from(this.vaultState.holdings.values());
    
    // Convert assets array to Map for PortfolioAnalyzer
    const assetsMap = new Map(
      Array.from(this.vaultState.assets.values()).map(asset => [asset.id, asset])
    );
    
    // Analyze portfolio composition
    const composition = this.portfolioAnalyzer.analyzePortfolio(holdings, assetsMap);
    
    // Calculate diversification score and warnings
    const diversificationScore = this.portfolioAnalyzer.calculateDiversificationScore(composition);
    const warnings = this.portfolioAnalyzer.getConcentrationWarnings(composition);
    
    return {
      ...composition,
      diversificationScore,
      warnings,
    };
  }

  async getDividendPredictions(): Promise<Array<{
    month: string;
    totalIncome: number;
    payments: Array<{
      assetId: string;
      symbol: string;
      name: string;
      expectedDate: string;
      estimatedAmount: number;
      amountPerShare: number;
      confidence: 'high' | 'medium' | 'low';
    }>;
  }>> {
    if (!this.dividendPredictor) {
      throw new Error('DividendPredictor not initialized');
    }

    // Get current holdings, assets, and dividend history from vault state
    const holdings = Array.from(this.vaultState.holdings.values());
    const assets = Array.from(this.vaultState.assets.values());
    const dividends = Array.from(this.vaultState.dividends.values());
    
    // Predict dividends for next 12 months
    const allPredictions: Array<{
      assetId: string;
      symbol: string;
      name: string;
      expectedDate: string;
      estimatedAmount: number;
      amountPerShare: number;
      confidence: 'high' | 'medium' | 'low';
    }> = [];
    
    for (const holding of holdings) {
      const asset = assets.find(a => a.id === holding.assetId);
      if (!asset) continue;
      
      const predictions = this.dividendPredictor.predictDividends(
        holding,
        asset,
        dividends,
        12 // months ahead
      );
      
      allPredictions.push(...predictions);
    }
    
    // Group by month
    const byMonth = new Map<string, typeof allPredictions>();
    
    for (const pred of allPredictions) {
      const month = pred.expectedDate.substring(0, 7); // YYYY-MM
      if (!byMonth.has(month)) {
        byMonth.set(month, []);
      }
      byMonth.get(month)!.push(pred);
    }
    
    // Convert to required format
    const result = Array.from(byMonth.entries())
      .map(([month, payments]) => ({
        month,
        totalIncome: payments.reduce((sum, p) => sum + p.estimatedAmount, 0),
        payments,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    return result;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let vaultManager: VaultManager | null = null;

/**
 * Get the VaultManager singleton instance
 */
export function getVaultManager(): VaultManager {
  if (!vaultManager) {
    vaultManager = new VaultManager();
  }
  return vaultManager;
}

