import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { VaultStatus, ImportPreset, ColumnMapping, ImportResult, InvestmentSearchResult } from '../shared/types'
import { IPC_CHANNELS } from '../shared/types'
import type { 
  Asset, 
  Holding,  
  Property, 
  Collectible, 
  WorkspaceSettings,
  SerializableVaultState,
  Transaction,
  Account,
  Category,
  Broker,
  Snapshot,
  InsurancePolicy,
  DepositAccount
} from '../shared/schemas'

// ============================================================================
// API EXPOSED TO RENDERER
// ============================================================================

const api = {
  // ========== VAULT STATUS ==========
  
  /** Get the current vault initialization status */
  getVaultStatus: (): Promise<VaultStatus> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_STATUS)
  },

  /** Open folder picker to select vault location */
  selectVaultLocation: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_SELECT_PATH)
  },

  /** Initialize vault at the specified path */
  initializeVault: (vaultPath: string): Promise<VaultStatus> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_INITIALIZE, vaultPath)
  },

  /** Reset stored vault path to allow selecting a new one */
  resetVaultPath: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_RESET)
  },

  // ========== VAULT DATA ==========
  
  /** Load all vault data (accounts, categories, transactions) */
  getVaultData: (): Promise<SerializableVaultState> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_LOAD)
  },

  /** Create a Net Worth Snapshot */
  createSnapshot: (): Promise<Snapshot> => {
    return ipcRenderer.invoke(IPC_CHANNELS.VAULT_CREATE_SNAPSHOT)
  },

  // ========== TRANSACTIONS ==========
  
  /** Save a transaction (creates new or updates existing) */
  saveTransaction: (
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Transaction> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSACTION_SAVE, transaction)
  },

  /** Delete a transaction */
  deleteTransaction: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TRANSACTION_DELETE, id)
  },

  // ========== ACCOUNTS ==========
  
  /** Save an account (creates new or updates existing) */
  saveAccount: (
    account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Account> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_SAVE, account)
  },

  /** Delete an account */
  deleteAccount: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_DELETE, id)
  },

  /** Set or clear manual balance for an account */
  setAccountManualBalance: (accountId: string, balance: number | null, date: string): Promise<Account> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ACCOUNT_SET_MANUAL_BALANCE, accountId, balance, date)
  },

  // ========== CATEGORIES ==========
  
  /** Save a category (creates new or updates existing) */
  saveCategory: (
    category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Category> => {
    return ipcRenderer.invoke(IPC_CHANNELS.CATEGORY_SAVE, category)
  },

  // ========== BROKERS ==========

  /** Save a broker (creates new or updates existing) */
  saveBroker: (broker: Broker): Promise<Broker> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_SAVE, broker)
  },

  /** Delete a broker */
  deleteBroker: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_DELETE, id)
  },

  /** Download broker logo from domain */
  downloadBrokerLogo: (domain: string, brokerId: string): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_DOWNLOAD_LOGO, domain, brokerId)
  },
  /** Select a broker logo from file system */
  selectBrokerLogo: (): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_SELECT_LOGO)
  },

  getPresetLogoPath: (brokerName: string): Promise<string | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_GET_PRESET_LOGO, brokerName)
  },

  getLogoRegistry: (): Promise<import('../shared/types').LogoRegistry> => {
    return ipcRenderer.invoke(IPC_CHANNELS.LOGO_GET_REGISTRY)
  },
  /** Save a selected broker logo to the vault */
  saveBrokerLogo: (sourcePath: string, brokerId: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.BROKER_SAVE_LOGO, sourcePath, brokerId)
  },

  // ========== IMPORT ==========

  // Import
  getImportPresets: (): Promise<ImportPreset[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_GET_PRESETS)
  },
  previewCSV: (content: string): Promise<{ headers: string[], preview: Record<string, string>[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CSV_PREVIEW, content)
  },
  executeImport: (content: string, mapping: ColumnMapping, accountId: string): Promise<ImportResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CSV_EXECUTE, content, mapping, accountId)
  },

  /** Open native file dialog to select CSV */
  selectFile: (): Promise<{ name: string; content: string; path: string } | null> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_SELECT_FILE)
  },

  // ========== INVESTMENTS ==========
  
  // Investments
  searchInvestments: (query: string): Promise<InvestmentSearchResult[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENTS_SEARCH, query)
  },
  getInvestmentQuote: (symbol: string): Promise<{ symbol: string, price: number, currency: string, name?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENTS_GET_QUOTE, symbol)
  },
  buyInvestment: (params: { symbol: string, accountId: string, quantity: number, price: number, date: string, fees: number }): Promise<{ asset: Asset, holding: Holding }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENT_BUY, params)
  },
  buyInvestmentManual: (params: { 
    symbol: string, 
    name: string, 
    type: 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other',
    currency: string,
    accountId: string, 
    quantity: number, 
    price: number, 
    date: string, 
    fees: number 
  }): Promise<{ asset: Asset, holding: Holding }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENT_BUY_MANUAL, params)
  },
  sellInvestment: (params: { holdingId: string, quantity: number, price: number, fees: number, date: string }): Promise<{ updatedHolding: Holding | null, realizedGain: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENT_SELL, params)
  },
  refreshInvestmentPrices: (): Promise<{ updated: number, failed: number, total: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENT_REFRESH_PRICES)
  },
  deleteAsset: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ASSET_DELETE, id)
  },
  deleteHolding: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HOLDING_DELETE, id)
  },

  // ========== WORKSPACE ==========
  saveWorkspaceSettings: (settings: Partial<WorkspaceSettings>): Promise<boolean> => {
    return ipcRenderer.invoke(IPC_CHANNELS.WORKSPACE_SAVE, settings)
  },

  // ========== REAL ESTATE ==========
  
  /** Save a property (creates new or updates existing) */
  saveProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Property> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROPERTY_SAVE, property)
  },
  deleteProperty: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.PROPERTY_DELETE, id)
  },

  // ========== COLLECTIBLES ==========

  /** Save a collectible (creates new or updates existing) */
  saveCollectible: (collectible: Omit<Collectible, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Collectible> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COLLECTIBLE_SAVE, collectible)
  },
  deleteCollectible: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.COLLECTIBLE_DELETE, id)
  },

  // ========== INSURANCE ==========

  /** Save an insurance policy (creates new or updates existing) */
  saveInsurance: (policy: InsurancePolicy): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INSURANCE_SAVE, policy)
  },
  /** Delete an insurance policy */
  deleteInsurance: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INSURANCE_DELETE, id)
  },

  // ========== DEPOSIT ACCOUNTS ==========

  /** Save a deposit account (creates new or updates existing) */
  saveDeposit: (deposit: DepositAccount): Promise<DepositAccount> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEPOSIT_SAVE, deposit)
  },
  /** Delete a deposit account */
  deleteDeposit: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEPOSIT_DELETE, id)
  },

  // ========== EXCHANGE RATES ==========
  getExchangeRates: (baseCurrency: string): Promise<Record<string, number>> => {
    return ipcRenderer.invoke(IPC_CHANNELS.EXCHANGE_RATES_GET, baseCurrency)
  },

  // ========== DEVELOPER ==========
  
  /** Generate demo data (dev-only) */
  generateDemoData: (): Promise<{ accounts: number; categories: number; transactions: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEV_SEED)
  },

  /** Clear all vault data (dev-only) */
  clearVaultData: (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.DEV_CLEAR)
  },
}

// ============================================================================
// CONTEXT BRIDGE
// ============================================================================

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore -- Electron non-contextIsolated fallback for window.electron
  window.electron = electronAPI
  // @ts-ignore -- Electron non-contextIsolated fallback for window.api
  window.api = api
}
