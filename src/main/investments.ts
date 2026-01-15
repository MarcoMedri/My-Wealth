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
    const total = assets.length;

    logger.info('[InvestmentManager] Starting price refresh', { total });
    
    // Check if rate limited
    if (yahooService.isRateLimited()) {
      const remainingSeconds = yahooService.getRateLimitRemainingSeconds();
      logger.warn('[InvestmentManager] Yahoo Finance rate limited', { remainingSeconds });
      throw new Error(`Yahoo Finance rate limited. Try again in ${remainingSeconds} seconds.`);
    }

    // Process assets one by one (YahooService handles rate limiting internally)
    for (const asset of assets) {
      // Skip assets with autoRefresh disabled
      if (asset.autoRefresh === false) {
        logger.info(`[InvestmentManager] Skipping ${asset.symbol} (autoRefresh disabled)`);
        continue;
      }
      
      try {
        // Check if we have a valid cached price first
        const cachedEntry = yahooService.getCachedPrice(asset.symbol);
        
        if (cachedEntry) {
          // Use cached price, update asset
          let cachedPrice = cachedEntry.price;
          let cachedPreviousClose = cachedEntry.previousClose;
          
          // Currency conversion if needed (cached prices include their original currency)
          const cachedCurrency = cachedEntry.currency || 'USD';
          if (cachedCurrency !== asset.currency) {
            try {
              const rates = await exchangeRateManager.getExchangeRates(cachedCurrency);
              const conversionRate = rates[asset.currency] || 1;
              
              cachedPrice = Math.round(cachedPrice * conversionRate);
              cachedPreviousClose = Math.round(cachedPreviousClose * conversionRate);
              
              logger.info(`[InvestmentManager] Converted cached ${asset.symbol} from ${cachedCurrency} to ${asset.currency}`, {
                originalPrice: cachedEntry.price / 100,
                convertedPrice: cachedPrice / 100,
                rate: conversionRate
              });
            } catch (convError) {
              logger.warn(`[InvestmentManager] Failed to convert cached currency for ${asset.symbol}`, {
                from: cachedCurrency,
                to: asset.currency
              });
            }
          }
          
          asset.currentPrice = cachedPrice;
          asset.previousClose = cachedPreviousClose;
          asset.lastUpdated = new Date(cachedEntry.timestamp).toISOString();
          cached++;
          logger.info(`[InvestmentManager] Using cached price for ${asset.symbol}`, { 
            price: cachedPrice / 100,
            currency: asset.currency,
            age: Math.round((Date.now() - cachedEntry.timestamp) / 1000 / 60) + ' min'
          });
        } else {
          // Need to fetch from Yahoo
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let quote: any;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let profile: any;

          const needsMetadata = !asset.metadata?.sector || asset.metadata?.sector === 'Unknown';

          if (needsMetadata) {
             try {
                const summary = await yahooService.getAssetProfile(asset.symbol);
                quote = summary.price;
                profile = summary.assetProfile;
                logger.info(`[InvestmentManager] Backfilled metadata for ${asset.symbol}`);
             } catch (e) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                quote = await yahooService.quote(asset.symbol) as any;
             }
          } else {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             quote = await yahooService.quote(asset.symbol) as any;
          }
          
          if (quote && quote.regularMarketPrice) {
            let newPrice = Math.round(quote.regularMarketPrice * 100);
            let previousClose = Math.round((quote.regularMarketPreviousClose || 0) * 100);
            
            // Currency conversion if needed
            const quoteCurrency = quote.currency || 'USD';
            if (quoteCurrency !== asset.currency) {
              try {
                // Get exchange rate from quote currency to asset currency
                const rates = await exchangeRateManager.getExchangeRates(quoteCurrency);
                const conversionRate = rates[asset.currency] || 1;
                
                newPrice = Math.round(newPrice * conversionRate);
                previousClose = Math.round(previousClose * conversionRate);
                
                logger.info(`[InvestmentManager] Converted ${asset.symbol} from ${quoteCurrency} to ${asset.currency}`, {
                  originalPrice: quote.regularMarketPrice,
                  convertedPrice: newPrice / 100,
                  rate: conversionRate
                });
              } catch (convError) {
                logger.warn(`[InvestmentManager] Failed to convert currency for ${asset.symbol}, using original price`, {
                  from: quoteCurrency,
                  to: asset.currency
                });
              }
            }
            
            if (profile) {
                asset.metadata = {
                    ...asset.metadata,
                    sector: profile.sector,
                    industry: profile.industry,
                    country: profile.country,
                };
            }
            asset.currentPrice = newPrice;
            asset.previousClose = previousClose;
            asset.lastUpdated = new Date().toISOString();
            
            updated++;
            logger.info(`[InvestmentManager] Updated ${asset.symbol}`, { 
              price: newPrice / 100,
              currency: asset.currency,
              fromCache: !!quote._fromCache
            });
          } else {
            failed++;
            logger.warn(`[InvestmentManager] No price data for ${asset.symbol}`);
          }
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[InvestmentManager] Failed to refresh ${asset.symbol}`, { error: errorMessage });
        
        // If rate limited, stop processing
        if (errorMessage.includes('rate limit')) {
          logger.warn('[InvestmentManager] Rate limit hit, stopping refresh');
          break;
        }
      }
    }

    // Save updated assets
    if (updated > 0 || cached > 0) {
      for (const asset of assets) {
        await this.vaultManager.saveAsset(asset);
      }
    }

    logger.info('[InvestmentManager] Price refresh complete', { 
      updated, 
      failed, 
      cached,
      total 
    });

    return { updated, failed, total, cached };
  }

  /**
   * Delete a holding without creating a transaction (Snapshot Mode)
   * Use this when user just wants to remove a holding without tracking the sale
   */
  async deleteHolding(holdingId: string): Promise<void> {
    await this.vaultManager.deleteHolding(holdingId);
    // If we're updating a snapshot, we just remove the holding from the list
  }
}

/**
 * Singleton instance
 */
export function getInvestmentManager(): InvestmentManager {
  const vaultManager = getVaultManager();
  return new InvestmentManager(vaultManager);
}
