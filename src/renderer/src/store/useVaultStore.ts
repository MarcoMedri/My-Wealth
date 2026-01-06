/**
 * MyWealth Desktop - Vault Store
 * Zustand store for managing vault state in the renderer
 */

import { create } from 'zustand';
import type { Account, Category, Transaction, SerializableVaultState, Asset, Holding, Property, Collectible, InsurancePolicy, DepositAccount, InvestmentTrade, Dividend, Broker, Snapshot, WorkspaceSettings } from '../../../shared/schemas';
import { toast } from 'sonner';
import { formatMoney } from '../../../shared/schemas';
import i18n from '../i18n';

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface VaultStore {
  // ========== STATE ==========
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  vaultPath: string | null;
  
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  assets: Asset[];
  holdings: Holding[];
  properties: Property[];
  collectibles: Collectible[];
  insurance: InsurancePolicy[];
  deposits: DepositAccount[];
  trades: InvestmentTrade[];
  dividends: Dividend[];
  brokers: Broker[];
  snapshots: Snapshot[];
  accountBalances: Record<string, number>;
  loadedMonths: string[];
  workspace: WorkspaceSettings;

  // Navigation
  activeView: string;
  setActiveView: (view: string) => void;

  // ========== DERIVED STATE ==========
  /** Total net worth (sum of all account balances) in cents */
  netWorth: number;
  
  // ========== ACTIONS ==========
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  /** Load initial vault data from main process */
  refreshData: () => Promise<void>;
  
  /** Set all vault data at once */
  setVaultData: (data: SerializableVaultState) => void;
  
  /** Save workspace settings */
  setWorkspaceSettings: (settings: Partial<WorkspaceSettings>) => Promise<void>;

  // Transaction Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (transaction: Transaction) => void;
  deleteTransaction: (transactionId: string) => void;

  // Investment Actions
  refreshInvestments: () => Promise<void>; // Re-fetches prices? For now just reloads vault data
  refreshAllPrices: () => Promise<{ updated: number; failed: number; total: number }>; // Batch update all asset prices from Yahoo
  sellInvestment: (holdingId: string, quantity: number, price: number, fees: number, date: string, taxRate?: number, buyPrice?: number) => Promise<void>;
  deleteHolding: (holdingId: string) => Promise<void>; // Snapshot mode
  
  // Collectible Actions
  saveCollectible: (collectible: Collectible) => Promise<void>;
  deleteCollectible: (collectibleId: string) => Promise<void>;

  // Insurance Actions
  saveInsurance: (policy: InsurancePolicy) => Promise<void>;
  deleteInsurance: (policyId: string) => Promise<void>;

  // Deposit Actions
  saveDeposit: (deposit: DepositAccount) => Promise<void>;
  deleteDeposit: (depositId: string) => Promise<void>;
  
  // Broker Actions
  saveBroker: (broker: Broker) => Promise<void>;
  deleteBroker: (brokerId: string) => Promise<void>;
  
  // Account Actions
  deleteAccount: (accountId: string) => Promise<void>;

  // Category Actions
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string) => void;
  getCategoriesByType: (type: 'income' | 'expense') => Category[];

  // Getters
  getAccount: (id: string) => Account | undefined;
  getCategory: (id: string) => Category | undefined;
  getAsset: (id: string) => Asset | undefined;
  getBroker: (id: string) => Broker | undefined;
  /** Get formatted balance for an account */
  getFormattedBalance: (accountId: string) => string;
  
  // UI Actions
  setSidebarCollapsed: (side: 'left' | 'right', collapsed: boolean) => Promise<void>;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useVaultStore = create<VaultStore>((set, get) => ({
  // Initial state
  isLoading: false,
  isLoaded: false,
  error: null,
  vaultPath: null,
  
  accounts: [],
  categories: [],
  transactions: [],
  assets: [],
  holdings: [],
  properties: [],
  collectibles: [],
  insurance: [],
  deposits: [],
  trades: [],
  dividends: [],
  brokers: [],
  snapshots: [],
  accountBalances: {},
  loadedMonths: [],
  workspace: { taxDefaults: {} },
  netWorth: 0,

  // ========== BASIC SETTERS ==========
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // ========== DATA LOADING ==========
  
  refreshData: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const data = await window.api.getVaultData();
      get().setVaultData(data);
    } catch (error) {
      console.error('[Store] refreshData failed:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load vault data',
        isLoading: false 
      });
    }
  },

  setVaultData: (data) => {
    const netWorth = calculateNetWorth(data.accountBalances);
    
    set({
      isLoaded: data.isLoaded,
      vaultPath: data.vaultPath,
      accounts: data.accounts,
      categories: data.categories,
      transactions: data.transactions,
      assets: data.assets,
      holdings: data.holdings,
      properties: data.properties,
      collectibles: data.collectibles,
      insurance: data.insurance,
      deposits: data.deposits,
      trades: data.trades,
      dividends: data.dividends,
      brokers: data.brokers,
      snapshots: data.snapshots,
      accountBalances: data.accountBalances,
      loadedMonths: data.loadedMonths,
      workspace: data.workspace || {},
      netWorth,
      isLoading: false,
      error: null,
    });
  },

  setWorkspaceSettings: async (settings) => {
    // Optimistic update
    set((state) => ({
      workspace: { ...state.workspace, ...settings }
    }));
    
    // Persist
    try {
      await window.api.saveWorkspaceSettings(settings);
    } catch (error) {
      console.error('Failed to save workspace settings:', error);
      // Revert not implemented for simplicity, relying on eventual consistency
    }
  },

  setSidebarCollapsed: async (side, collapsed) => {
    const { workspace, setWorkspaceSettings } = get();
    // Default values if layout is undefined
    const currentLayout = workspace.layout || {
        leftSidebarCollapsed: false,
        rightSidebarCollapsed: false
    };
    
    // Check if value is actually changing to avoid infinite loops or unnecessary updates
    const currentVal = side === 'left' ? currentLayout.leftSidebarCollapsed : currentLayout.rightSidebarCollapsed;
    // Handle undefined cases safely
    if (!!currentVal === collapsed) return;

    const newLayout = {
        ...currentLayout,
        [side === 'left' ? 'leftSidebarCollapsed' : 'rightSidebarCollapsed']: collapsed
    };

    await setWorkspaceSettings({
        layout: newLayout
    });
  },

  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  refreshInvestments: async () => {
    // Just alias to refreshData for now as loadVault fetches everything
    await get().refreshData();
  },

  refreshAllPrices: async () => {
    set({ isLoading: true });
    try {
      const result = await window.api.refreshInvestmentPrices();
      await get().refreshData();
      
      // Show success toast with statistics
      if (result.failed === 0) {
        toast.success(i18n.t('investments.refreshSuccess', { count: result.updated, defaultValue: `✅ ${result.updated} prices updated successfully` }));
      } else {
        toast.warning(i18n.t('investments.refreshPartial', { updated: result.updated, failed: result.failed, defaultValue: `⚠️ Updated ${result.updated} prices (${result.failed} failed)` }));
      }
      
      return result;
    } catch (error) {
       console.error('Failed to refresh prices:', error);
       toast.error(i18n.t('investments.refreshError', { defaultValue: '❌ Failed to update prices' }));
       return { updated: 0, failed: 0, total: 0 };
    } finally {
      set({ isLoading: false });
    }
  },

  sellInvestment: async (holdingId, quantity, price, fees, date, taxRate, buyPrice) => {
    set({ isLoading: true });
    try {
      await window.api.sellInvestment({ holdingId, quantity, price, fees, date, taxRate, buyPrice });
      await get().refreshData(); // Reload to get updated holdings
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to sell investment' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteHolding: async (holdingId) => {
    set({ isLoading: true });
    try {
      await window.api.deleteHolding(holdingId);
      await get().refreshData(); // Reload to get updated holdings
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete holding' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ========== COLLECTIBLE ACTIONS ==========

  saveCollectible: async (collectible) => {
      set({ isLoading: true });
      try {
        await window.api.saveCollectible(collectible);
        await get().refreshData();
      } catch (error) {
         set({ error: error instanceof Error ? error.message : 'Failed to save collectible' });
         throw error;
      } finally {
        set({ isLoading: false });
      }
  },

  deleteCollectible: async (collectibleId) => {
      set({ isLoading: true });
      try {
        await window.api.deleteCollectible(collectibleId);
        await get().refreshData();
      } catch (error) {
         set({ error: error instanceof Error ? error.message : 'Failed to delete collectible' });
         throw error;
      } finally {
        set({ isLoading: false });
      }
  },

  // ========== INSURANCE ACTIONS ==========

  saveInsurance: async (policy) => {
    set({ isLoading: true });
    try {
      await window.api.saveInsurance(policy);
      await get().refreshData();
    } catch (error) {
       set({ error: error instanceof Error ? error.message : 'Failed to save insurance' });
       throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteInsurance: async (policyId) => {
    set({ isLoading: true });
    try {
      await window.api.deleteInsurance(policyId);
      await get().refreshData();
    } catch (error) {
       set({ error: error instanceof Error ? error.message : 'Failed to delete insurance' });
       throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ========== DEPOSIT ACTIONS ==========

  saveDeposit: async (deposit) => {
    set({ isLoading: true });
    try {
      await window.api.saveDeposit(deposit);
      await get().refreshData();
    } catch (error) {
       set({ error: error instanceof Error ? error.message : 'Failed to save deposit' });
       throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDeposit: async (depositId) => {
    set({ isLoading: true });
    try {
      await window.api.deleteDeposit(depositId);
      await get().refreshData();
    } catch (error) {
       set({ error: error instanceof Error ? error.message : 'Failed to delete deposit' });
       throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ========== BROKER ACTIONS ==========

  saveBroker: async (broker) => {
    set({ isLoading: true });
    try {
      await window.api.saveBroker(broker); 
      await get().refreshData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save broker' });
      throw error;
    } finally {
        set({ isLoading: false });
    }
  },

  deleteBroker: async (brokerId) => {
    set({ isLoading: true });
    try {
      await window.api.deleteBroker(brokerId); 
      await get().refreshData();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete broker' });
      throw error;
    } finally {
        set({ isLoading: false });
    }
  },

  deleteAccount: async (accountId) => {
    set({ isLoading: true });
    try {
      await window.api.deleteAccount(accountId);
      await get().refreshData();
    } catch (error) {
       set({ error: error instanceof Error ? error.message : 'Failed to delete account' });
       throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // ========== TRANSACTIONS ==========
  
  setTransactions: (transactions) => {
    set({ transactions });
  },

  addTransaction: (transaction) => {
    const { transactions, accountBalances } = get();
    
    // Optimistic update: add transaction to list
    const newTransactions = [transaction, ...transactions];
    
    // Update account balance based on transaction type
    const newBalances = { ...accountBalances };
    const currentBalance = newBalances[transaction.accountId] ?? 0;
    
    switch (transaction.type) {
      case 'income':
        newBalances[transaction.accountId] = currentBalance + transaction.amount;
        break;
      case 'expense':
        newBalances[transaction.accountId] = currentBalance - transaction.amount;
        break;
      case 'transfer':
        newBalances[transaction.accountId] = currentBalance - transaction.amount;
        if (transaction.toAccountId) {
          const destBalance = newBalances[transaction.toAccountId] ?? 0;
          newBalances[transaction.toAccountId] = destBalance + transaction.amount;
        }
        break;
    }
    
    set({
      transactions: newTransactions,
      accountBalances: newBalances,
      netWorth: calculateNetWorth(newBalances),
    });
  },

  updateTransaction: (transaction) => {
    const { transactions } = get();
    const newTransactions = transactions.map(t => 
      t.id === transaction.id ? transaction : t
    );
    set({ transactions: newTransactions });
  },

  deleteTransaction: (transactionId) => {
    const { transactions } = get();
    const newTransactions = transactions.filter(t => t.id !== transactionId);
    set({ transactions: newTransactions });
    // Note: We'll assume the caller also handles the backend call or refreshes data
  },

  // ========== CATEGORY ACTIONS ==========
  
  addCategory: (category) => {
    set((state) => ({ categories: [...state.categories, category] }));
  },

  updateCategory: (category) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === category.id ? category : c)),
    }));
  },

  deleteCategory: (categoryId) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== categoryId),
    }));
  },

  getCategoriesByType: (type) => {
    return get().categories.filter((c) => c.type === type);
  },

  // ========== GETTERS ==========
  
  getAccount: (id) => {
    return get().accounts.find(a => a.id === id);
  },

  getCategory: (id) => {
    return get().categories.find(c => c.id === id);
  },

  getAsset: (id) => {
    return get().assets.find(a => a.id === id);
  },

  getBroker: (id) => {
    return get().brokers.find(b => b.id === id);
  },

  getFormattedBalance: (accountId) => {
    const { accountBalances, accounts } = get();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return '$0.00';
    
    const balance = accountBalances[accountId] ?? 0;
    return formatMoney(balance, account.currency);
  },
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateNetWorth(balances: Record<string, number>): number {
  return Object.values(balances).reduce((sum, balance) => sum + balance, 0);
}

// ============================================================================
// SELECTORS (for optimized re-renders)
// ============================================================================

export const selectAccounts = (state: VaultStore) => state.accounts;
export const selectCategories = (state: VaultStore) => state.categories;
export const selectTransactions = (state: VaultStore) => state.transactions;
export const selectNetWorth = (state: VaultStore) => state.netWorth;
export const selectIsLoading = (state: VaultStore) => state.isLoading;
export const selectIsLoaded = (state: VaultStore) => state.isLoaded;
