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
import { randomUUID } from 'crypto';
import type { VaultStatus } from '../shared/types';
import { VAULT_STRUCTURE } from '../shared/types';
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
  BrokersFileSchema,
  SnapshotsFileSchema,
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
  type Broker,
  type Snapshot,
  type SnapshotsFile,
  type VaultState,
  type SerializableVaultState,
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
 */
export class VaultManager {
  private settingsPath: string;
  private settings: AppSettings | null = null;
  private vaultState: VaultState = createEmptyVaultState();

  constructor() {
    // Settings stored in Electron's userData directory
    // macOS: ~/Library/Application Support/my-wealth-desktop/
    // Windows: %APPDATA%/my-wealth-desktop/
    // Linux: ~/.config/my-wealth-desktop/
    this.settingsPath = path.join(app.getPath('userData'), VAULT_STRUCTURE.SETTINGS_FILE);
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
    });
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
      return this.serializeVaultState(createEmptyVaultState());
    }

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
          console.error('Invalid accounts.json:', parsed.error);
        }
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

      // Scan transactions folder
      await this.scanTransactions(vaultPath);

      // Calculate account balances
      this.calculateBalances();

      this.vaultState.isLoaded = true;
      return this.serializeVaultState(this.vaultState);
    } catch (error) {
      console.error('Failed to load vault:', error);
      return this.serializeVaultState(createEmptyVaultState());
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
   */
  private calculateBalances(): void {
    // Start with initial balances
    for (const [id, account] of this.vaultState.accounts) {
      this.vaultState.accountBalances.set(id, account.initialBalance);
    }

    // Apply transactions
    for (const [, tx] of this.vaultState.transactions) {
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
            const destBalance = this.vaultState.accountBalances.get(tx.toAccountId) ?? 0;
            this.vaultState.accountBalances.set(tx.toAccountId, destBalance + tx.amount);
          }
          break;
      }
    }
  }

  /**
   * Convert VaultState (with Maps) to serializable format (with arrays)
   */
  private serializeVaultState(state: VaultState): SerializableVaultState {
    return {
      isLoaded: state.isLoaded,
      vaultPath: state.vaultPath,
      accounts: Array.from(state.accounts.values()),
      categories: Array.from(state.categories.values()),
      transactions: Array.from(state.transactions.values()),
      assets: state.assets,
      holdings: state.holdings,
      brokers: state.brokers,
      properties: state.properties,
      collectibles: state.collectibles,
      trades: state.trades,
      dividends: state.dividends,
      snapshots: state.snapshots,
      loadedMonths: Array.from(state.loadedMonths),
      accountBalances: Object.fromEntries(state.accountBalances),
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

      const totalNetWorth = cashTotal + investmentsTotal + realEstateTotal + collectiblesTotal;

      const snapshot: Snapshot = {
          id: randomUUID(),
          date: now,
          totalNetWorth: Math.round(totalNetWorth),
          currency: 'EUR', // Hardcoded base currency for now, or use settings
          breakdown: {
              cash: Math.round(cashTotal),
              investments: Math.round(investmentsTotal),
              realEstate: Math.round(realEstateTotal),
              collectibles: Math.round(collectiblesTotal),
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

