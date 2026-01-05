import { ElectronAPI } from '@electron-toolkit/preload'
import type { 
  SerializableVaultState, 
  Account, 
  Category, 
  Transaction,
  Asset,
  Holding,
  Property,
  Collectible,
  Broker,
  Snapshot,
  WorkspaceSettings,
  InsurancePolicy,
  DepositAccount
} from '../shared/schemas';

interface API {
  // Vault status
  getVaultStatus: () => Promise<VaultStatus>
  selectVaultLocation: () => Promise<string | null>
  initializeVault: (vaultPath: string) => Promise<VaultStatus>
  resetVaultPath: () => Promise<void>
  
  // Vault data
  getVaultData: () => Promise<SerializableVaultState>
  createSnapshot: () => Promise<Snapshot>
  
  // Entities
  saveTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  saveAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Account>
  deleteAccount: (id: string) => Promise<void>
  setAccountManualBalance: (accountId: string, balance: number | null, date: string) => Promise<Account>
  saveCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  saveBroker: (broker: Broker) => Promise<Broker>
  deleteBroker: (id: string) => Promise<void>
  downloadBrokerLogo: (domain: string, brokerId: string) => Promise<string | null>
  selectBrokerLogo: () => Promise<string | null>
  getPresetLogoPath: (brokerName: string) => Promise<string | null>
  getLogoRegistry: () => Promise<import('../shared/types').LogoRegistry>
  saveBrokerLogo: (sourcePath: string, brokerId: string) => Promise<string>
  
  // Import
  getImportPresets: () => Promise<ImportPreset[]>;
  previewCSV: (content: string) => Promise<{ headers: string[], preview: Record<string, string>[] }>;
  executeImport: (content: string, mapping: ColumnMapping, accountId: string) => Promise<ImportResult>;
  selectFile: () => Promise<{ name: string; content: string; path: string } | null>;
  
  // Investments
  searchInvestments: (query: string) => Promise<{ symbol: string, name: string, type: string, currency: string, exchange: string }[]>;
  getInvestmentQuote: (symbol: string) => Promise<{ symbol: string, price: number, currency: string, name?: string }>;
  buyInvestment: (params: { symbol: string, accountId: string, quantity: number, price: number, date: string, fees: number, brokerId?: string, taxRate?: number }) => Promise<{ asset: Asset, holding: Holding }>;
  buyInvestmentManual: (params: { symbol: string, name: string, type: 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other', currency: string, accountId: string, quantity: number, price: number, date: string, fees: number, brokerId?: string, taxRate?: number }) => Promise<{ asset: Asset, holding: Holding }>;
  sellInvestment: (params: { holdingId: string, quantity: number, price: number, fees: number, date: string, taxRate?: number, buyPrice?: number }) => Promise<{ updatedHolding: Holding | null, realizedGain: number }>;
  refreshInvestmentPrices: () => Promise<{ updated: number; failed: number; total: number }>;
  deleteAsset: (id: string) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  saveHolding: (holding: Holding) => Promise<Holding>;
  saveWorkspaceSettings: (settings: Partial<WorkspaceSettings>) => Promise<boolean>;

  // Real Estate
  saveProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Property>;
  deleteProperty: (id: string) => Promise<void>;

  // Collectibles
  saveCollectible: (collectible: Omit<Collectible, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Collectible>;
  deleteCollectible: (id: string) => Promise<void>;
  
  // Insurance
  saveInsurance: (policy: InsurancePolicy) => Promise<InsurancePolicy>;
  deleteInsurance: (id: string) => Promise<void>;

  // Deposit Accounts
  saveDeposit: (deposit: DepositAccount) => Promise<DepositAccount>;
  deleteDeposit: (id: string) => Promise<void>;

  // Exchange Rates
  getExchangeRates: (baseCurrency: string) => Promise<Record<string, number>>;

  // Analytics
  getPerformanceMetrics: (period: 'YTD' | '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL') => Promise<{
    twr: number;
    mwr: number;
    startValue: number;
    endValue: number;
    totalCashFlow: number;
    absoluteGain: number;
    period: string;
  }>;
  getPortfolioComposition: () => Promise<{
    totalValue: number;
    sectors: Array<{ name: string; value: number; percentage: number; count: number }>;
    geographies: Array<{ name: string; value: number; percentage: number; count: number }>;
    assetClasses: Array<{ name: string; value: number; percentage: number; count: number }>;
    topHoldings: Array<{ assetId: string; symbol: string; name: string; value: number; percentage: number }>;
    diversificationScore: number;
    warnings: string[];
  }>;
  getDividendPredictions: (monthsAhead: number) => Promise<Array<{
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
  }>>;

  // Export
  exportData: (options: { format: 'json' | 'csv'; dataType?: 'transactions' | 'accounts' | 'holdings'; startDate?: string; endDate?: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;

  // Backups
  listBackups: () => Promise<import('../shared/types').BackupInfo[]>;
  restoreBackup: (backupId: string) => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  
  // Error logging
  logError: (errorLog: unknown) => Promise<{ success: boolean; error?: string }>;

  // Developer (dev-only)
  generateDemoData: () => Promise<{ accounts: number; categories: number; transactions: number }>
  clearVaultData: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}

export type { API }
