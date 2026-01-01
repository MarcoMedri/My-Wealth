import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { VaultStatus, ImportPreset, ColumnMapping, ImportResult, InvestmentSearchResult } from '../shared/types'
import { IPC_CHANNELS } from '../shared/types'
import type { Transaction, Account, Category, SerializableVaultState, Property, Collectible, Asset, Holding, Broker, Snapshot } from '../shared/schemas'

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

  // ========== IMPORT ==========

  // Import
  getImportPresets: (): Promise<ImportPreset[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_GET_PRESETS)
  },
  previewCSV: (content: string): Promise<{ headers: string[], preview: Record<string, string>[] }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CSV_PREVIEW, content)
  },
  executeImport: (content: string, mapping: ColumnMapping, accountId: string): Promise<ImportResult> => {
    return ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CSV_EXECUTE, { content, mapping, accountId })
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
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENTS_BUY, params)
  },
  sellInvestment: (params: { holdingId: string, quantity: number, price: number, fees: number, date: string }): Promise<{ updatedHolding: Holding | null, realizedGain: number }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENTS_SELL, params)
  },
  refreshInvestmentPrices: (): Promise<Asset[]> => {
    return ipcRenderer.invoke(IPC_CHANNELS.INVESTMENTS_REFRESH_PRICES)
  },
  deleteAsset: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.ASSET_DELETE, id)
  },
  deleteHolding: (id: string): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HOLDING_DELETE, id)
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
