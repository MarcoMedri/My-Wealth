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
  saveCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
  saveBroker: (broker: Broker) => Promise<Broker>
  deleteBroker: (id: string) => Promise<void>
  downloadBrokerLogo: (domain: string, brokerId: string) => Promise<string | null>
  
  // Import
  getImportPresets: () => Promise<ImportPreset[]>;
  previewCSV: (content: string) => Promise<{ headers: string[], preview: Record<string, string>[] }>;
  executeImport: (content: string, mapping: ColumnMapping, accountId: string) => Promise<ImportResult>;
  selectFile: () => Promise<{ name: string; content: string; path: string } | null>;
  
  // Investments
  searchInvestments: (query: string) => Promise<{ symbol: string, name: string, type: string, currency: string, exchange: string }[]>;
  getInvestmentQuote: (symbol: string) => Promise<{ symbol: string, price: number, currency: string, name?: string }>;
  buyInvestment: (params: { symbol: string, accountId: string, quantity: number, price: number, date: string, fees: number }) => Promise<{ asset: Asset, holding: Holding }>;
  buyInvestmentManual: (params: { symbol: string, name: string, type: 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other', currency: string, accountId: string, quantity: number, price: number, date: string, fees: number }) => Promise<{ asset: Asset, holding: Holding }>;
  sellInvestment: (params: { holdingId: string, quantity: number, price: number, fees: number, date: string }) => Promise<{ updatedHolding: Holding | null, realizedGain: number }>;
  refreshInvestmentPrices: () => Promise<Asset[]>;
  deleteAsset: (id: string) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
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
