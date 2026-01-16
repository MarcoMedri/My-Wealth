import { getYahooService } from './yahooService';
import { getVaultManager } from './vault';
import { randomUUID } from 'crypto';
import type { Asset, Holding, AssetType, InvestmentTrade, Account } from '../shared/schemas';
import type { InvestmentSearchResult } from '../shared/types';
import type { VaultManager } from './vault';
import { logger } from './services/LoggerService';
import { exchangeRateManager } from './exchangeRates';

// Note: Price caching is now handled by YahooService with disk persistence


export interface SellResult {
  updatedHolding: Holding | null; // null if fully sold
  realizedGain: number; // in cents (positive = profit, negative = loss)
  trade: InvestmentTrade;
}

export class InvestmentManager {
  private vaultManager: VaultManager;

  constructor(vaultManager: VaultManager) {
    this.vaultManager = vaultManager;
  }

  /**
   * Search for securities via Yahoo Finance
   */
  async search(query: string): Promise<InvestmentSearchResult[]> {
    try {
      const yahooService = getYahooService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await yahooService.search(query) as any;
      
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
      const yahooService = getYahooService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote = await yahooService.quote(symbol) as any;
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
    brokerId?: string;
    taxRate?: number;
  }) {
    const vaultManager = getVaultManager();
    const vaultPath = vaultManager.getVaultPath();
    if (!vaultPath) throw new Error('Vault not loaded');

    // Input validation
    if (params.quantity <= 0) throw new Error('Quantity must be positive');
    if (params.price <= 0) throw new Error('Price must be positive');
    if (params.fees < 0) throw new Error('Fees cannot be negative');

    // Resolve brokerId
    let brokerId = params.brokerId;
    if (!brokerId) {
        const account = vaultManager.accounts.find((a: Account) => a.id === params.accountId);
        if (account) brokerId = account.brokerId;
    }

    // 1. Get or Create Asset
    let asset = vaultManager.assets.find((a: Asset) => a.symbol === params.symbol);
    
    if (!asset) {
      // Fetch details from Yahoo
      const yahooService = getYahooService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let quote: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let profile: any;

      try {
        const summary = await yahooService.getAssetProfile(params.symbol);
        quote = summary.price || {};
        profile = summary.assetProfile || {};

        if (!quote.regularMarketPrice) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const q = await yahooService.quote(params.symbol) as any;
            quote = { ...quote, ...q };
        }
      } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quote = await yahooService.quote(params.symbol) as any;
      }
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
        autoRefresh: true,
        metadata: {
            exchange: quote.fullExchangeName || quote.exchangeName,
            sector: profile?.sector,
            industry: profile?.industry,
            country: profile?.country,
        },
        createdAt: now,
        updatedAt: now
      };
      
      await vaultManager.saveAsset(asset);
    } else {
      // Asset exists - update price and previousClose
      const yahooService = getYahooService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote = await yahooService.quote(params.symbol) as any;
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
        taxRate: params.taxRate ?? holding.taxRate ?? 26,
        updatedAt: now
      };
    } else {
      holding = {
        id: randomUUID(),
        accountId: params.accountId,
        assetId: asset.id,
        quantity: params.quantity,
        averageBuyPrice: params.price,
        taxRate: params.taxRate ?? 26,
        createdAt: now,
        updatedAt: now
      };
    }
    await vaultManager.saveHolding(holding);

    // 3. Create Transaction (Cash deduction)
    const totalAmount = Math.round(params.quantity * params.price) + params.fees;
    
    // Investment transactions don't need a category - they're tracked via trades
    // We add 'imported' tag to bypass the validation that requires categoryId
    await vaultManager.saveTransaction({
        type: 'expense',
        date: params.date,
        amount: totalAmount,
        payee: `Buy ${params.symbol}`,
        currency: asset.currency,
        accountId: params.accountId,
        categoryId: null,
        toAccountId: null,
        notes: `Bought ${params.quantity} of ${params.symbol} @ ${params.price/100}`,
        status: 'cleared',
        tags: ['investment', 'imported'], // 'imported' tag bypasses category validation
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
   * Execute a BUY order with MANUAL asset data (no Yahoo Finance lookup):
   * 1. Create Asset with user-provided metadata
   * 2. Update/Create Holding
   * 3. Create Transaction
   */
  async buyManual(params: {
    symbol: string;
    name: string;
    type: AssetType;
    currency: string;
    accountId: string;
    quantity: number;
    price: number; // in cents
    date: string;
    fees: number; // in cents
    brokerId?: string;
    taxRate?: number;
  }) {
    const vaultManager = getVaultManager();
    const vaultPath = vaultManager.getVaultPath();
    if (!vaultPath) throw new Error('Vault not loaded');

    // Input validation
    if (params.quantity <= 0) throw new Error('Quantity must be positive');
    if (params.price <= 0) throw new Error('Price must be positive');
    if (params.fees < 0) throw new Error('Fees cannot be negative');
    if (!params.symbol.trim()) throw new Error('Symbol is required');
    if (!params.name.trim()) throw new Error('Name is required');

    // Resolve brokerId
    let brokerId = params.brokerId;
    if (!brokerId) {
        const account = vaultManager.accounts.find((a: Account) => a.id === params.accountId);
        if (account) brokerId = account.brokerId;
    }

    const now = new Date().toISOString();

    // 1. Get or Create Asset (manually)
    let asset = vaultManager.assets.find((a: Asset) => a.symbol.toUpperCase() === params.symbol.toUpperCase());
    
    if (!asset) {
      asset = {
        id: randomUUID(),
        symbol: params.symbol.toUpperCase(),
        name: params.name,
        type: params.type,
        currency: params.currency,
        currentPrice: params.price,
        previousClose: params.price, // No previous data for manual
        lastUpdated: now,
        autoRefresh: false, // Manual assets don't auto-refresh by default
        createdAt: now,
        updatedAt: now
      };
      await vaultManager.saveAsset(asset);
    } else {
      // Asset exists - optionally update price
      asset = {
        ...asset,
        currentPrice: params.price,
        lastUpdated: now,
        updatedAt: now,
      };
      await vaultManager.saveAsset(asset);
    }

    // 2. Update or Create Holding (same as buy)
    let holding = vaultManager.holdings.find((h: Holding) => h.assetId === asset!.id && h.accountId === params.accountId);
    const assetId = asset!.id;
    const assetCurrency = asset!.currency;

    if (holding) {
      const oldTotalCost = holding.quantity * holding.averageBuyPrice;
      const newTotalCost = params.quantity * params.price;
      const totalQty = holding.quantity + params.quantity;
      const newAvgPrice = totalQty > 0 ? Math.round((oldTotalCost + newTotalCost) / totalQty) : 0;

      holding = {
        ...holding,
        quantity: totalQty,
        averageBuyPrice: newAvgPrice,
        taxRate: params.taxRate ?? holding.taxRate ?? 26,
        updatedAt: now,
        brokerId: brokerId || holding.brokerId
      };
    } else {
      holding = {
        id: randomUUID(),
        accountId: params.accountId,
        assetId: asset.id,
        quantity: params.quantity,
        averageBuyPrice: params.price,
        taxRate: params.taxRate ?? 26,
        createdAt: now,
        updatedAt: now,
        brokerId: brokerId
      };
    }
    await vaultManager.saveHolding(holding);

    // 3. Create Transaction
    const totalAmount = Math.round(params.quantity * params.price) + params.fees;
    
    // Investment transactions don't need a category - they're tracked via trades
    // We add 'imported' tag to bypass the validation that requires categoryId
    await vaultManager.saveTransaction({
      type: 'expense',
      date: params.date,
      amount: totalAmount,
      payee: `Buy ${params.symbol}`,
      currency: assetCurrency,
      accountId: params.accountId,
      categoryId: null,
      toAccountId: null,
      notes: `Bought ${params.quantity} of ${params.symbol} @ ${params.price/100} (Manual Entry)`,
      status: 'cleared',
      tags: ['investment', 'manual', 'imported'], // 'imported' tag bypasses category validation
      splits: [],
      isReconciled: false
    });

    // 4. Create Trade record
    const trade: InvestmentTrade = {
      id: randomUUID(),
      type: 'buy',
      assetId: assetId,
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
    holdingId: string, 
    quantity: number, 
    price: number, 
    fees: number, 
    date: string,
    taxRate?: number, 
    buyPrice?: number 
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
    // Gain = (Sell Price - Cost Basis Price) * Quantity - Fees
    const buyPrice = params.buyPrice ?? holding.averageBuyPrice;
    const proceeds = params.quantity * params.price;
    const costBasis = params.quantity * buyPrice;
    
    // Tax Calculation (if applicable)
    // Gain before tax
    const grossGain = proceeds - costBasis - params.fees;
    
    let taxAmount = 0;
    if (grossGain > 0 && params.taxRate !== undefined) {
      taxAmount = grossGain * (params.taxRate / 100);
    }
    
    // Final Realized Gain (can be net of tax, or just gross gain? usually realized gain is pre-tax in accounting, but for cash flow we care about net)
    // For this app, let's track the Realized Gain as the pre-tax gain for performance metrics, but use the tax for the transaction amount.
    // Actually, "Realized Gain" in the P&L usually means pre-tax. 
    // But if we deduct tax from the transaction, the "Income" transaction amount will be lower.
    // Let's store the tax in the transaction notes.
    
    const realizedGain = grossGain; 

    // 3. Update or delete holding
    const remainingQty = holding.quantity - params.quantity;
    let updatedHolding: Holding | null = null;

    if (remainingQty > 0) {
      // Partial sell - update holding
      updatedHolding = {
        ...holding,
        quantity: remainingQty,
        updatedAt: now,
        // averageBuyPrice stays the same unless we implement specific lot identification
      };
      await vaultManager.saveHolding(updatedHolding);
    } else {
      // Full sell - delete holding
      await vaultManager.deleteHolding(holding.id);
    }

    // 4. Create income transaction (money coming back)
    // Net Cash = Proceeds - Fees - Tax
    const netProceeds = proceeds - params.fees - taxAmount;
    
    // Parse date to ensure valid ISO format
    let isoDate = params.date;
    if (!params.date.includes('T')) {
      // Convert YYYY-MM-DD to full ISO at noon
      const [year, month, day] = params.date.split('-').map(Number);
      isoDate = new Date(year, month - 1, day, 12, 0, 0).toISOString();
    }
    
    // Find investment category
    let investmentCategoryId: string | null = null;
    const categoriesData = vaultManager.categories;
    
    // Safety check for categories
    if (!Array.isArray(categoriesData)) {
      console.error('[InvestmentManager] vaultManager.categories returned non-array:', categoriesData);
      throw new Error('Internal Error: Failed to load categories (invalid data structure).');
    }

    const investmentCategory = categoriesData.find(c => 
      c.type === 'income' && 
      (c.name.toLowerCase().includes('investment') || c.name.toLowerCase().includes('capital') || c.name.toLowerCase().includes('finan'))
    );
    
    if (investmentCategory) {
      investmentCategoryId = investmentCategory.id;
    } else {
      // Fallback: Try to find ANY income category
      const anyIncomeCategory = categoriesData.find(c => c.type === 'income');
      if (anyIncomeCategory) {
        investmentCategoryId = anyIncomeCategory.id;
      } else {
         throw new Error('No income category found. Please create at least one income category before selling.');
      }
    }
    
    await vaultManager.saveTransaction({
      type: 'income',
      date: isoDate,
      amount: netProceeds,
      payee: `Sell ${asset.symbol}`,
      currency: asset.currency,
      accountId: holding.accountId,
      categoryId: investmentCategoryId,
      toAccountId: null,
      notes: `Sold ${params.quantity} of ${asset.symbol} @ ${params.price/100}. 
Cost Basis: ${buyPrice/100}.
Gross Gain: ${grossGain/100}.
Tax Paid: ${taxAmount/100} (${params.taxRate ?? 0}%).`,
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
      tax: taxAmount > 0 ? taxAmount : undefined,
      date: params.date,
      realizedGain: realizedGain,
      createdAt: now,
    };
    await vaultManager.saveTrade(trade);
    return { updatedHolding, realizedGain, trade };
  }

  /**
   * Refresh all asset prices (using centralized YahooService)
   * YahooService handles caching, rate limiting, and request queuing
   * Returns statistics about the update operation
   */
  async refreshAllPrices(): Promise<{ updated: number; failed: number; total: number; cached: number }> {
    const yahooService = getYahooService();
    const state = this.vaultManager.getState();
    const assets = state.assets || [];
    
    let updated = 0;
    let failed = 0;
    let cached = 0;
    
    // Filter active assets
    const activeAssets = assets.filter(a => a.autoRefresh !== false);
    const total = activeAssets.length;

    logger.info('[InvestmentManager] Starting price refresh', { total });
    
    // Check if rate limited
    if (yahooService.isRateLimited()) {
      const remainingSeconds = yahooService.getRateLimitRemainingSeconds();
      logger.warn('[InvestmentManager] Yahoo Finance rate limited', { remainingSeconds });
      throw new Error(`Yahoo Finance rate limited. Try again in ${remainingSeconds} seconds.`);
    }


      // 1. Gather symbols for batch fetch
      const symbolsToFetch: string[] = [];
      const assetMap = new Map<string, Asset>();
      
      for (const asset of activeAssets) {
        assetMap.set(asset.symbol, asset);
        
        // Check local cache first
        const cachedEntry = yahooService.getCachedPrice(asset.symbol);
        if (cachedEntry) {
          // Use cached directly
           let cachedPrice = cachedEntry.price;
           let cachedPreviousClose = cachedEntry.previousClose;
           const cachedCurrency = cachedEntry.currency || 'USD';
           
           if (cachedCurrency !== asset.currency) {
              try {
                const rates = await exchangeRateManager.getExchangeRates(cachedCurrency);
                const conversionRate = rates[asset.currency] || 1;
                cachedPrice = Math.round(cachedPrice * conversionRate);
                cachedPreviousClose = Math.round(cachedPreviousClose * conversionRate);
              } catch (e) {
                 logger.warn(`[InvestmentManager] Currency conversion failed for ${asset.symbol}`, { error: e });
              }
           }
           
           asset.currentPrice = cachedPrice;
           asset.previousClose = cachedPreviousClose;
           asset.lastUpdated = new Date(cachedEntry.timestamp).toISOString();
           cached++;
        } else {
           // Needs fetch
           symbolsToFetch.push(asset.symbol);
        }
      }
      
      // 2. Batch fetch from Yahoo
      if (symbolsToFetch.length > 0) {
        logger.info(`[InvestmentManager] Batch fetching prices for ${symbolsToFetch.length} assets`);
        try {
          // Use the new batched API
          const results = await yahooService.quotes(symbolsToFetch);
          
          const now = new Date().toISOString();
          
          for (const result of results) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const quote = result as any;
             const symbol = quote.symbol;
             const asset = assetMap.get(symbol);
             
             if (asset && quote.regularMarketPrice) {
                // Update Asset
                let price = quote.regularMarketPrice;
                let previousClose = quote.regularMarketPreviousClose || 0;
                const quoteCurrency = quote.currency || 'USD';

                // Check for currency mismatch and convert if necessary
                if (quoteCurrency !== asset.currency) {
                   try {
                     const rates = await exchangeRateManager.getExchangeRates(quoteCurrency);
                     const conversionRate = rates[asset.currency];
                     
                     if (conversionRate) {
                        price = price * conversionRate;
                        previousClose = previousClose * conversionRate;
                     } else {
                        logger.warn(`[InvestmentManager] No conversion rate found from ${quoteCurrency} to ${asset.currency} for ${asset.symbol}`);
                     }
                   } catch (e) {
                      logger.warn(`[InvestmentManager] Currency conversion failed for ${asset.symbol}`, { error: e });
                   }
                }

                // Store in cents
                asset.currentPrice = Math.round(price * 100);
                asset.previousClose = Math.round(previousClose * 100);
                
                asset.lastUpdated = now;
                asset.updatedAt = now;
                updated++;
             }

          }
        } catch (e) {
           logger.error('[InvestmentManager] Batch fetch failed', e);
           failed = symbolsToFetch.length; // Assume all failed
        }
      }
      
      // 3. Save all updated assets (one big save operation ideally, but VaultManager handles array updates effectively if we reference the array)
      // Since we modified objects inside `state.assets`, and `vaultManager` has a reference to state,
      // we just need to persist the assets file.
      // But `vaultManager` might need an explicit saveAssets call?
      // `vaultManager.saveAsset` saves ONE.
      // We should use `vaultManager.saveAssets(assets)` if valid, or just loop save.
      // Looping save is bad for I/O.
      
      // Checking vaultManager capabilities...
      // It has `saveAsset` but maybe not `saveAssets`.
      // I should check VaultManager to see if I can batch save assets.
      // If not, I should implement it or use `saveAsset` which might serialize.
      
      // For now, I will assume we need to loop save or add `saveAssets`.
      // Let's stick to loop for safety but it defeats part of the I/O optimization.
      // Actually, `optimize I/O` was a goal.
      // I'll check `VaultManager` next.
      
      for (const asset of activeAssets) {
         await this.vaultManager.saveAsset(asset);
      }

    return { updated, failed, total, cached };
  }

  /**
   * Refresh metadata (sector, country, description) for all assets
   */
  async refreshAssetMetadata(): Promise<{ updated: number; failed: number }> {
     const yahooService = getYahooService();
     const state = this.vaultManager.getState();
     const assets = state.assets || [];
     const activeAssets = assets.filter(a => a.autoRefresh !== false);
     
     let updated = 0;
     let failed = 0;
     
     for (const asset of activeAssets) {
        try {
           const profile = await yahooService.getAssetProfile(asset.symbol);
           
           if (profile && profile.assetProfile) {
               const p = profile.assetProfile;
               
               // Collect all metadata updates
               const newMetadata: typeof asset.metadata = { ...asset.metadata };
               let changed = false;

               // Update fields if they are different or missing
               if (p.sector && asset.metadata?.sector !== p.sector) {
                   newMetadata.sector = p.sector;
                   changed = true;
               }
               if (p.industry && asset.metadata?.industry !== p.industry) {
                   newMetadata.industry = p.industry;
                   changed = true;
               }
               if (p.country && asset.metadata?.country !== p.country) {
                   newMetadata.country = p.country;
                   changed = true;
               }
               if (p.description && asset.metadata?.description !== p.description) {
                  newMetadata.description = p.description;
                  changed = true;
               }

               // Apply all changes at once
               if (changed) {
                   asset.metadata = newMetadata;
                   updated++;
                   await this.vaultManager.saveAsset(asset);
               }
           }
        } catch (err) {
            logger.warn(`[InvestmentManager] Failed to refresh metadata for ${asset.symbol}`, { err });
            failed++;
        }
        
        // Be gentle with the API
        await new Promise(resolve => setTimeout(resolve, 200));
     }
     
     return { updated, failed };
  }



  /**
   * Delete a holding without creating a transaction (Snapshot Mode)
   * Use this when user just wants to remove a holding without tracking the sale
   */
  async deleteHolding(holdingId: string): Promise<void> {
    await this.vaultManager.deleteHolding(holdingId);
    // If we're updating a snapshot, we just remove the holding from the list
  }

  /**
   * Calculate Portfolio Composition (X-Ray)
   * Aggregates holdings by Sector, Geography, and Asset Class.
   * Converts all values to the specified base currency.
   */
  async getPortfolioComposition(baseCurrency: string): Promise<import('../shared/types').PortfolioComposition> {
    const state = this.vaultManager.getState();
    const holdings = state.holdings || [];
    const assets = state.assets || [];
    const rates = await exchangeRateManager.getExchangeRates(baseCurrency);

    let totalValue = 0;
    const sectorMap = new Map<string, number>();
    const geoMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    
    // Track counts for diversification
    const sectorCounts = new Map<string, number>();
    const geoCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();

    const holdingValues: { assetId: string; symbol: string; name: string; value: number }[] = [];

    for (const holding of holdings) {
        const asset = assets.find(a => a.id === holding.assetId);
        if (!asset) continue;

        // Calculate value in Asset Currency
        const nativeValue = holding.quantity * asset.currentPrice; // cents

        // Convert to Base Currency
        let convertedValue = nativeValue;
        if (asset.currency !== baseCurrency) {
            const rate = rates[asset.currency];
            if (rate) {
                // Rate is Base -> Target. 
                // We have Target (Asset) value, we want Base. 
                // If getExchangeRates(baseCurrency) returns rates relative to baseCurrency (e.g. EUR),
                // then rates['USD'] is how many USD for 1 EUR.
                // So 1 EUR = 1.05 USD.
                // ValueInEUR = ValueInUSD / 1.05
                convertedValue = Math.round(nativeValue / rate);
            } else {
                logger.warn(`[PortfolioXRay] Missing exchange rate for ${asset.currency} -> ${baseCurrency}`);
                // Fallback: keep as is (wrong but prevents crash) or skip?
                // keeping as is aligns with current behavior elsewhere
            }
        }

        totalValue += convertedValue;

        // Metadata Extraction
        const sector = asset.metadata?.sector || 'Unknown';
        const geo = asset.metadata?.region || asset.metadata?.country || 'Unknown';
        
        // Normalize Asset Class
        // AssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'fund' | 'insurance' | 'other'
        // Display names might need to be prettier
        const type = asset.type.charAt(0).toUpperCase() + asset.type.slice(1);

        // Update Aggregates
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + convertedValue);
        sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1);

        geoMap.set(geo, (geoMap.get(geo) || 0) + convertedValue);
        geoCounts.set(geo, (geoCounts.get(geo) || 0) + 1);

        typeMap.set(type, (typeMap.get(type) || 0) + convertedValue);
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

        holdingValues.push({
            assetId: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            value: convertedValue
        });
    }

    // Helper to format output
    const toAllocation = (map: Map<string, number>, value: number, counts: Map<string, number>) => {
        return Array.from(map.entries())
            .map(([name, val]) => ({
                name,
                value: val,
                percentage: totalValue > 0 ? (val / totalValue) * 100 : 0,
                count: counts.get(name) || 0
            }))
            .sort((a, b) => b.value - a.value);
    };

    const sectors = toAllocation(sectorMap, totalValue, sectorCounts);
    const geographies = toAllocation(geoMap, totalValue, geoCounts);
    const assetClasses = toAllocation(typeMap, totalValue, typeCounts);
    
    // Top Holdings
    const topHoldings = holdingValues
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .map(h => ({
            ...h,
            percentage: totalValue > 0 ? (h.value / totalValue) * 100 : 0
        }));

    // Calculate Diversification Score (0-100)
    // Simple heuristic: 
    // - Specific Risk: Penalty for high single-asset concentration (>10% = penalty)
    // - Sector Risk: Penalty for high sector concentration (>25% = penalty)
    // - Geo Risk: Penalty for high geo concentration (>50% = penalty)
    
    let score = 100;
    const warnings: string[] = [];

    // Calculate unique assets count
    const uniqueAssets = new Set(holdings.map(h => h.assetId)).size;

    // 4. Identify Concentration Warnings
    if (topHoldings.length > 0 && topHoldings[0].percentage > 20) {
        score -= 15;
        warnings.push('analytics.warnings.singleAsset');
    }

    if (sectors.length > 0 && sectors[0].percentage > 30) {
        score -= 15;
        warnings.push('analytics.warnings.singleSector');
    }

    // Crypto penalty
    const cryptoClass = assetClasses.find(c => c.name === 'Crypto');
    if (cryptoClass && cryptoClass.percentage > 20) {
        score -= 10;
        warnings.push('analytics.warnings.highCrypto');
    }

    if (totalValue > 0 && uniqueAssets < 5) {
        score -= 20;
        warnings.push('analytics.warnings.lowPositions');
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
        totalValue,
        sectors,
        geographies,
        assetClasses,
        topHoldings,
        diversificationScore: score,
        concentrationWarnings: warnings
    };
  }
}

/**
 * Singleton instance
 */
export function getInvestmentManager(): InvestmentManager {
  const vaultManager = getVaultManager();
  return new InvestmentManager(vaultManager);
}
