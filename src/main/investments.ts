import yahooFinance from 'yahoo-finance2';
import { getVaultManager } from './vault';
import { randomUUID } from 'crypto';
import type { Asset, Holding, AssetType, InvestmentTrade } from '../shared/schemas';
import type { InvestmentSearchResult } from '../shared/types';

export interface SellResult {
  updatedHolding: Holding | null; // null if fully sold
  realizedGain: number; // in cents (positive = profit, negative = loss)
  trade: InvestmentTrade;
}

export class InvestmentManager {
  
  /**
   * Search for securities via Yahoo Finance
   */
  async search(query: string): Promise<InvestmentSearchResult[]> {
    try {
      console.log(`[InvestmentManager] Searching for: ${query}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- yahoo-finance2 dynamic API
      const results = await yahooFinance.search(query) as any;
      console.log(`[InvestmentManager] Results found:`, results?.quotes?.length || 0);
      
      if (!results.quotes) return [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Yahoo API response
      return results.quotes.map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType || 'unknown',
        currency: q.currency || 'USD', // Use actual currency from search result
        exchange: q.exchange || 'unknown'
      }));
    } catch (error) {
      console.error('[InvestmentManager] Yahoo Search failed:', error);
      return [];
    }
  }

  /**
   * Get latest quote and details
   */
  async getQuote(symbol: string) {
    try {
      const quote = await yahooFinance.quote(symbol) as any;
      return {
        symbol: quote.symbol,
        price: Math.round((quote.regularMarketPrice || 0) * 100), // to cents
        previousClose: Math.round((quote.regularMarketPreviousClose || 0) * 100),
        currency: quote.currency || 'USD',
        name: quote.shortName || quote.longName
      };
    } catch (error) {
      console.error('Yahoo Quote failed:', error);
      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  }

  /**
   * Execute a BUY order:
   * 1. Ensure Asset exists (fetch metadata if needed)
   * 2. Update/Create Holding
   * 3. Create Transaction (Expense/Transfer)
   */
  async buy(params: {
    symbol: string;
    accountId: string;
    quantity: number;
    price: number; // in cents
    date: string;
    fees: number; // in cents
  }) {
    const vaultManager = getVaultManager();
    const vaultPath = vaultManager.getVaultPath();
    if (!vaultPath) throw new Error('Vault not loaded');

    // Input validation
    if (params.quantity <= 0) throw new Error('Quantity must be positive');
    if (params.price <= 0) throw new Error('Price must be positive');
    if (params.fees < 0) throw new Error('Fees cannot be negative');

    // 1. Get or Create Asset
    let asset = vaultManager.assets.find((a: Asset) => a.symbol === params.symbol);
    
    if (!asset) {
      // Fetch details from Yahoo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote = await yahooFinance.quote(params.symbol) as any;
      const now = new Date().toISOString();
      
      // Map Yahoo types to our AssetType
      // 'EQUITY' -> 'stock', 'ETF' -> 'etf', 'CRYPTOCURRENCY' -> 'crypto'
      let type: AssetType = 'other';
      if (quote.quoteType === 'EQUITY') type = 'stock';
      if (quote.quoteType === 'ETF') type = 'etf';
      if (quote.quoteType === 'CRYPTOCURRENCY') type = 'crypto';
      if (quote.quoteType === 'MUTUALFUND') type = 'fund';

      asset = {
        id: randomUUID(),
        symbol: params.symbol,
        name: quote.shortName || quote.longName || params.symbol,
        type: type,
        currency: quote.currency || 'USD',
        currentPrice: Math.round((quote.regularMarketPrice || 0) * 100),
        previousClose: Math.round((quote.regularMarketPreviousClose || 0) * 100),
        lastUpdated: now,
        metadata: {
            exchange: quote.fullExchangeName,
            // Yahoo often requires 'quoteSummary' for sector/industry, simplistic quote has basics
        },
        createdAt: now,
        updatedAt: now
      };
      
      await vaultManager.saveAsset(asset);
    } else {
      // Asset exists - update price and previousClose
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote = await yahooFinance.quote(params.symbol) as any;
      const now = new Date().toISOString();
      asset = {
        ...asset,
        currentPrice: Math.round((quote.regularMarketPrice || 0) * 100),
        previousClose: Math.round((quote.regularMarketPreviousClose || 0) * 100),
        lastUpdated: now,
        updatedAt: now,
      };
      await vaultManager.saveAsset(asset);
    }

    // 2. Update or Create Holding
    let holding = vaultManager.holdings.find((h: Holding) => h.assetId === asset!.id && h.accountId === params.accountId);
    
    const now = new Date().toISOString();

    if (holding) {
      // Average Cost Basis Calculation
      // New Avg = ((Old Qty * Old Avg) + (New Qty * New Price)) / (Old Qty + New Qty)
      const oldTotalCost = holding.quantity * holding.averageBuyPrice;
      const newTotalCost = params.quantity * params.price;
      const totalQty = holding.quantity + params.quantity;
      
      // Avoid division by zero
      const newAvgPrice = totalQty > 0 ? Math.round((oldTotalCost + newTotalCost) / totalQty) : 0;

      holding = {
        ...holding,
        quantity: totalQty,
        averageBuyPrice: newAvgPrice,
        updatedAt: now
      };
    } else {
      holding = {
        id: randomUUID(),
        accountId: params.accountId,
        assetId: asset.id,
        quantity: params.quantity,
        averageBuyPrice: params.price,
        createdAt: now,
        updatedAt: now
      };
    }
    await vaultManager.saveHolding(holding);

    // 3. Create Transaction (Cash deduction)
    const totalAmount = Math.round(params.quantity * params.price) + params.fees;
    
    await vaultManager.saveTransaction({
        type: 'expense',
        date: params.date,
        amount: totalAmount,
        payee: `Buy ${params.symbol}`,
        currency: asset.currency, // Assuming account matches asset currency for now, or implicit conversion
        accountId: params.accountId,
        categoryId: null,
        toAccountId: null,
        notes: `Bought ${params.quantity} of ${params.symbol} @ ${params.price/100}`,
        status: 'cleared',
        tags: ['investment'],
        splits: [],
        isReconciled: false
    });

    // 4. Create Trade record for history
    const trade: InvestmentTrade = {
      id: randomUUID(),
      type: 'buy',
      assetId: asset.id,
      accountId: params.accountId,
      quantity: params.quantity,
      pricePerUnit: params.price,
      fees: params.fees,
      date: params.date,
      createdAt: now,
    };
    await vaultManager.saveTrade(trade);

    return { asset, holding, trade };
  }

  /**
   * Execute a SELL order (Tracking Mode):
   * 1. Validate holding has enough quantity
   * 2. Calculate realized gain/loss
   * 3. Update holding (or delete if fully sold)
   * 4. Create income transaction
   * 5. Create trade record
   */
  async sell(params: {
    holdingId: string;
    quantity: number;
    price: number; // in cents per unit
    date: string;
    fees: number; // in cents
  }): Promise<SellResult> {
    const vaultManager = getVaultManager();
    const vaultPath = vaultManager.getVaultPath();
    if (!vaultPath) throw new Error('Vault not loaded');

    // Input validation
    if (params.quantity <= 0) throw new Error('Quantity must be positive');
    if (params.price <= 0) throw new Error('Price must be positive');
    if (params.fees < 0) throw new Error('Fees cannot be negative');

    // 1. Find holding
    const holding = vaultManager.holdings.find((h: Holding) => h.id === params.holdingId);
    if (!holding) throw new Error('Holding not found');
    if (holding.quantity < params.quantity) throw new Error('Insufficient quantity to sell');

    // Find asset for currency info
    const asset = vaultManager.assets.find((a: Asset) => a.id === holding.assetId);
    if (!asset) throw new Error('Asset not found for holding');

    const now = new Date().toISOString();

    // 2. Calculate realized gain/loss
    // Gain = (Sell Price - Avg Buy Price) * Quantity - Fees
    const proceeds = params.quantity * params.price;
    const costBasis = params.quantity * holding.averageBuyPrice;
    const realizedGain = proceeds - costBasis - params.fees;

    // 3. Update or delete holding
    const remainingQty = holding.quantity - params.quantity;
    let updatedHolding: Holding | null = null;

    if (remainingQty > 0) {
      // Partial sell - update holding
      updatedHolding = {
        ...holding,
        quantity: remainingQty,
        updatedAt: now,
        // Note: averageBuyPrice stays the same (FIFO would require more complex logic)
      };
      await vaultManager.saveHolding(updatedHolding);
    } else {
      // Full sell - delete holding
      await vaultManager.deleteHolding(holding.id);
    }

    // 4. Create income transaction (money coming back)
    const netProceeds = proceeds - params.fees;
    await vaultManager.saveTransaction({
      type: 'income',
      date: params.date,
      amount: netProceeds,
      payee: `Sell ${asset.symbol}`,
      currency: asset.currency,
      accountId: holding.accountId,
      categoryId: null,
      toAccountId: null,
      notes: `Sold ${params.quantity} of ${asset.symbol} @ ${params.price/100}. Gain/Loss: ${realizedGain/100}`,
      status: 'cleared',
      tags: ['investment', 'sale'],
      splits: [],
      isReconciled: false
    });

    // 5. Create trade record
    const trade: InvestmentTrade = {
      id: randomUUID(),
      type: 'sell',
      assetId: asset.id,
      accountId: holding.accountId,
      quantity: params.quantity,
      pricePerUnit: params.price,
      fees: params.fees,
      date: params.date,
      realizedGain: realizedGain,
      createdAt: now,
    };
    await vaultManager.saveTrade(trade);

    return { updatedHolding, realizedGain, trade };
  }

  /**
   * Refresh all asset prices (Batch Update)
   * Fetches current price and previousClose from Yahoo Finance
   */
  async refreshAllPrices(): Promise<Asset[]> {
    const vaultManager = getVaultManager();
    const assets = vaultManager.assets;
    const updatedAssets: Asset[] = [];

    console.log(`[InvestmentManager] Refreshing prices for ${assets.length} assets`);

    for (const asset of assets) {
      try {
        const quote = await yahooFinance.quote(asset.symbol) as any;
        const now = new Date().toISOString();

        const updatedAsset: Asset = {
          ...asset,
          previousClose: Math.round((quote.regularMarketPreviousClose || 0) * 100),
          currentPrice: Math.round((quote.regularMarketPrice || 0) * 100),
          lastUpdated: now,
          updatedAt: now,
        };

        await vaultManager.saveAsset(updatedAsset);
        updatedAssets.push(updatedAsset);
        console.log(`[InvestmentManager] Updated ${asset.symbol}: ${updatedAsset.currentPrice/100}`);
      } catch (error) {
        console.error(`[InvestmentManager] Failed to refresh ${asset.symbol}:`, error);
        // Continue with other assets even if one fails
      }
    }

    return updatedAssets;
  }

  /**
   * Delete a holding without creating a transaction (Snapshot Mode)
   * Use this when user just wants to remove a holding without tracking the sale
   */
  async deleteHolding(holdingId: string): Promise<void> {
    const vaultManager = getVaultManager();
    await vaultManager.deleteHolding(holdingId);
    console.log(`[InvestmentManager] Deleted holding ${holdingId} (snapshot mode)`);
  }
}

export const investmentManager = new InvestmentManager();

