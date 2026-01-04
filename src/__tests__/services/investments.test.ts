/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvestmentManager } from '../../main/investments';
import * as VaultModule from '../../main/vault';

// Mock Yahoo Finance
vi.mock('yahoo-finance2', () => ({
  default: {
    search: vi.fn().mockResolvedValue({ quotes: [] }),
    quoteCombine: vi.fn().mockResolvedValue([])
  }
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    readJson: vi.fn().mockResolvedValue([]),
    ensureDir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  }
}));

describe('InvestmentManager Flows', () => {
  let investmentManager: InvestmentManager;
  let mockVaultManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Create the Mock VaultManager instance
    mockVaultManager = {
      getVaultPath: vi.fn().mockReturnValue('/tmp/test-vault'),
      // Data Stores
      holdings: [],
      assets: [],
      categories: [
        { id: 'cat-inc-1', name: 'Investment Income', type: 'income' },
        { id: 'cat-exp-1', name: 'Fees', type: 'expense' }
      ],
      accounts: [
        { id: 'acc-1', name: 'Test Bank', brokerId: 'broker-1' }
      ],
      // Methods
      saveHolding: vi.fn().mockImplementation((h: any) => {
        // Simple in-memory update for logic testing
        const idx = mockVaultManager.holdings.findIndex((x: any) => x.id === h.id);
        if (idx >= 0) mockVaultManager.holdings[idx] = h;
        else mockVaultManager.holdings.push(h);
        return Promise.resolve(h);
      }),
      deleteHolding: vi.fn().mockImplementation((id: string) => {
        mockVaultManager.holdings = mockVaultManager.holdings.filter((h: any) => h.id !== id);
        return Promise.resolve();
      }),
      saveTransaction: vi.fn().mockResolvedValue(true),
      saveTrade: vi.fn().mockResolvedValue(true),
      saveAsset: vi.fn().mockImplementation((a: any) => {
        mockVaultManager.assets.push(a);
        return Promise.resolve(a);
      }),
    };

    // 2. Mock `getVaultManager` to return our instance
    vi.spyOn(VaultModule, 'getVaultManager').mockReturnValue(mockVaultManager);

    // 3. Initialize InvestmentManager
    investmentManager = new InvestmentManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Buy Flow', () => {
    it('should create new holding and expense transaction', async () => {
      // Act
      const result = await investmentManager.buyManual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        accountId: 'acc-1',
        quantity: 10,
        price: 15000, // $150.00
        date: '2024-01-01',
        fees: 500 // $5.00
      });

      // Assert
      expect(result.holding).toBeDefined();
      expect(result.holding.quantity).toBe(10);
      expect(result.holding.averageBuyPrice).toBe(15000);
      
      // Verify Transaction
      expect(mockVaultManager.saveTransaction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'expense',
        amount: 150000 + 500, // (10 * 15000) + 500 = 150500
        notes: expect.stringContaining('Bought 10 of AAPL'),
        tags: expect.arrayContaining(['investment', 'imported']) // Bypass check
      }));

      // Verify Trade
      expect(mockVaultManager.saveTrade).toHaveBeenCalled();
    });

    it('should update existing holding and average execution price', async () => {
      // Setup existing holding
      const existingHolding = {
        id: 'hold-1',
        assetId: 'asset-aapl',
        accountId: 'acc-1',
        quantity: 10,
        averageBuyPrice: 10000, // $100.00
        taxRate: 26,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      };
      
      const existingAsset = {
        id: 'asset-aapl',
        symbol: 'AAPL',
        currency: 'USD',
        currentPrice: 16000
      };

      mockVaultManager.holdings = [existingHolding];
      mockVaultManager.assets = [existingAsset];

      // Act: Buy 10 more at $200.00
      await investmentManager.buyManual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        accountId: 'acc-1',
        quantity: 10,
        price: 20000, // $200.00
        date: '2024-02-01',
        fees: 0
      });

      // Assert
      // Old Total: 10 * 100 = 1000
      // New Total: 10 * 200 = 2000
      // Total Qty: 20
      // New Avg: 3000 / 20 = 150 ($150.00 = 15000 cents)
      
      // We need to check the last call to saveHolding or inspect state
      const updatedHolding = mockVaultManager.holdings.find((h: any) => h.id === 'hold-1');
      expect(updatedHolding.quantity).toBe(20);
      expect(updatedHolding.averageBuyPrice).toBe(15000);
    });
  });

  describe('Sell Flow', () => {
    const setupSellScenario = () => {
       const asset = {
        id: 'asset-btc',
        symbol: 'BTC',
        name: 'Bitcoin',
        type: 'crypto',
        currency: 'EUR',
        currentPrice: 5000000, // €50,000
      };
      const holding = {
        id: 'hold-btc',
        assetId: 'asset-btc',
        accountId: 'acc-1',
        quantity: 1.0, // 1 BTC
        averageBuyPrice: 2000000, // Bought at €20,000
        taxRate: 26 // 26% Tax
      };
      
      mockVaultManager.assets = [asset];
      mockVaultManager.holdings = [holding];
      
      return { asset, holding };
    };

    it('should calculate tax correctly and deduct from net proceeds', async () => {
      setupSellScenario();

      // Sell 0.5 BTC at €60,000
      // Cost Basis: 0.5 * €20,000 = €10,000
      // Proceeds: 0.5 * €60,000 = €30,000
      // Gross Gain: €20,000
      // Tax (26%): €5,200
      // Net Proceeds: €30,000 - €5,200 = €24,800
      
      await investmentManager.sell({
        holdingId: 'hold-btc',
        quantity: 0.5,
        price: 6000000, // €60,000
        fees: 0,
        date: '2024-06-01',
        taxRate: 26
      });

      // Verify Transaction
      expect(mockVaultManager.saveTransaction).toHaveBeenCalledWith(expect.objectContaining({
        type: 'income',
        amount: 2480000, // €24,800
        categoryId: 'cat-inc-1', // Should auto-select Investment Income
        notes: expect.stringContaining('Tax Paid: 5200 (26%)'), // €5,200
      }));

      // Verify Trade History
      expect(mockVaultManager.saveTrade).toHaveBeenCalledWith(expect.objectContaining({
        type: 'sell',
        realizedGain: 2000000, // Gross Gain €20,000
        tax: 520000 // Tax €5,200
      }));

      // Verify Holding Updated
      const updatedHolding = mockVaultManager.holdings.find((h: any) => h.id === 'hold-btc');
      expect(updatedHolding.quantity).toBe(0.5); // 1.0 - 0.5
    });

    it('should delete holding on full sell', async () => {
      setupSellScenario();

      // Sell ALL 1.0 BTC
      await investmentManager.sell({
        holdingId: 'hold-btc',
        quantity: 1.0,
        price: 6000000,
        fees: 0,
        date: '2024-06-01'
      });

      expect(mockVaultManager.deleteHolding).toHaveBeenCalledWith('hold-btc');
    });

    it('should handle tax override', async () => {
      setupSellScenario();

      // Sell with 0% tax override
      await investmentManager.sell({
        holdingId: 'hold-btc',
        quantity: 0.1,
        price: 3000000,
        fees: 0,
        date: '2024-06-01',
        taxRate: 0 // Override to 0%
      });

      expect(mockVaultManager.saveTransaction).toHaveBeenCalledWith(expect.objectContaining({
        notes: expect.stringContaining('Tax Paid: 0 (0%)')
      }));
    });
  });
});
