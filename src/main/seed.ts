/**
 * MyWealth Desktop - Seed Script
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * DEV-ONLY: Generates realistic demo data for testing
 */

import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs-extra';
import { VAULT_STRUCTURE } from '../shared/types';
import type { 
  Account, Category, Transaction, Asset, Holding, Property, Collectible,
  AccountsFile, CategoriesFile, TransactionsFile 
} from '../shared/schemas';

// ============================================================================
// DEMO DATA CONFIGURATION
// ============================================================================

const DEMO_ACCOUNTS: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Cash Wallet',
    type: 'cash',
    currency: 'EUR',
    initialBalance: 15000, // €150.00
    color: '#10b981',
    icon: 'banknote',
    isArchived: false,
    sortOrder: 0,
  },
  {
    name: 'Main Bank Account',
    type: 'checking',
    currency: 'EUR',
    initialBalance: 350000, // €3,500.00
    color: '#3b82f6',
    icon: 'building',
    isArchived: false,
    sortOrder: 1,
  },
  {
    name: 'Savings Account',
    type: 'savings',
    currency: 'EUR',
    initialBalance: 1500000, // €15,000.00
    color: '#8b5cf6',
    icon: 'piggy-bank',
    isArchived: false,
    sortOrder: 2,
  },
];

const DEMO_CATEGORIES: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Income
  { name: 'Salary', type: 'income', parentId: null, icon: 'briefcase', color: '#10b981', sortOrder: 0 },
  { name: 'Freelance', type: 'income', parentId: null, icon: 'laptop', color: '#22c55e', sortOrder: 1 },
  { name: 'Investments', type: 'income', parentId: null, icon: 'trending-up', color: '#14b8a6', sortOrder: 2 },
  
  // Expenses
  { name: 'Food & Dining', type: 'expense', parentId: null, icon: 'utensils', color: '#f97316', sortOrder: 3 },
  { name: 'Rent', type: 'expense', parentId: null, icon: 'home', color: '#ef4444', sortOrder: 4 },
  { name: 'Utilities', type: 'expense', parentId: null, icon: 'zap', color: '#eab308', sortOrder: 5 },
  { name: 'Transportation', type: 'expense', parentId: null, icon: 'car', color: '#6366f1', sortOrder: 6 },
  { name: 'Entertainment', type: 'expense', parentId: null, icon: 'tv', color: '#ec4899', sortOrder: 7 },
  { name: 'Shopping', type: 'expense', parentId: null, icon: 'shopping-bag', color: '#8b5cf6', sortOrder: 8 },
  { name: 'Healthcare', type: 'expense', parentId: null, icon: 'heart-pulse', color: '#06b6d4', sortOrder: 9 },
];

const DEMO_PROPERTIES: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'lastValuationDate' | 'currentValue'>[] = [
  {
    name: 'Primary Residence',
    type: 'residence',
    address: 'Via Roma 123, Milan, Italy',
    purchasePrice: 45000000, // €450k
    purchaseDate: '2019-06-15T00:00:00.000Z',
    currency: 'EUR',
    squareMeters: 120,
    notes: 'Beautiful apartment in city center',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Lake House',
    type: 'vacation',
    address: 'Lake Como, Lombardy',
    purchasePrice: 28000000, // €280k
    purchaseDate: '2021-09-01T00:00:00.000Z',
    currency: 'EUR',
    squareMeters: 85,
    notes: 'Summer getaway',
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80',
  }
];

const DEMO_COLLECTIBLES: Omit<Collectible, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>[] = [
  {
    name: 'Rolex Submariner',
    type: 'watch',
    description: 'Ref. 124060, purchased new',
    purchasePrice: 915000, // €9,150
    purchaseDate: '2022-03-10T00:00:00.000Z',
    currency: 'EUR',
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Vintage Gibson Les Paul',
    type: 'other',
    description: '1970s Les Paul Custom',
    purchasePrice: 450000, // €4,500
    purchaseDate: '2018-11-20T00:00:00.000Z',
    currency: 'EUR',
    imageUrl: 'https://images.unsplash.com/photo-1550985543-f4423c8d361e?auto=format&fit=crop&w=1000&q=80',
  },
  {
    name: 'Gold Coin Collection',
    type: 'coin',
    description: 'Various sovereign gold coins',
    purchasePrice: 1200000, // €12,000
    purchaseDate: '2020-01-15T00:00:00.000Z',
    currency: 'EUR',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83648bfd149c?auto=format&fit=crop&w=1000&q=80',
  }
];

const DEMO_ASSETS: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdated'>[] = [
  {
    symbol: 'VWCE.DE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    type: 'etf',
    currency: 'EUR',
    currentPrice: 11520, // €115.20
    isin: 'IE00BK5BQT80',
    metadata: { exchange: 'XETRA', region: 'Global' }
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    currency: 'USD',
    currentPrice: 18550, // $185.50
    metadata: { exchange: 'NASDAQ', sector: 'Technology' }
  },
  {
    symbol: 'BTC-EUR',
    name: 'Bitcoin EUR',
    type: 'crypto',
    currency: 'EUR',
    currentPrice: 4250000, // €42,500.00
    metadata: { exchange: 'Coinbase' }
  }
];

const EXPENSE_PAYEES = [
  'Supermarket', 'Restaurant', 'Gas Station', 'Amazon', 'Netflix', 
  'Electricity Co', 'Water Services', 'Phone Provider', 'Gym Membership',
  'Coffee Shop', 'Pharmacy', 'Doctor Visit', 'Public Transit', 'Uber',
  'Spotify', 'Apple Store', 'IKEA', 'H&M', 'Zara'
];

const INCOME_PAYEES = [
  'ACME Corp', 'Client Payment', 'Freelance Project', 'Dividend', 
  'Interest', 'Refund', 'Bonus'
];

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================

export interface SeedResult {
  accounts: number;
  categories: number;
  transactions: number;
  properties: number;
  collectibles: number;
  assets: number;
}

/**
 * Generate demo data for the vault
 * @param vaultPath - Path to the vault directory
 * @returns Number of generated items
 */
export async function generateDemoData(vaultPath: string): Promise<SeedResult> {
  const now = new Date();
  const nowISO = now.toISOString();

  // Generate accounts with IDs
  const accounts: Account[] = DEMO_ACCOUNTS.map((acc) => ({
    ...acc,
    id: randomUUID(),
    createdAt: nowISO,
    updatedAt: nowISO,
  }));



  // Create an Investment Account specifically for holdings
  const investmentAccount: Account = {
    id: randomUUID(),
    name: 'Trade Republic',
    type: 'investment',
    currency: 'EUR',
    initialBalance: 0,
    color: '#000000',
    icon: 'candlestick-chart',
    isArchived: false,
    sortOrder: 3,
    createdAt: nowISO,
    updatedAt: nowISO
  };
  accounts.push(investmentAccount);

  // Generate categories with IDs
  const categories: Category[] = DEMO_CATEGORIES.map((cat) => ({
    ...cat,
    id: randomUUID(),
    createdAt: nowISO,
    updatedAt: nowISO,
  }));

  // Separate income and expense categories for transaction generation
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Generate transactions spanning 2 years
  const transactions: Transaction[] = [];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  for (let i = 0; i < 500; i++) {
    // Random date within the last 2 years
    const txDate = faker.date.between({ from: twoYearsAgo, to: now });
    
    // Determine transaction type (70% expense, 25% income, 5% transfer)
    const rand = Math.random();
    let type: 'income' | 'expense' | 'transfer';
    let category: Category;
    let payee: string;
    let amount: number;

    if (rand < 0.70 && expenseCategories.length > 0) {
      // Expense
      type = 'expense';
      category = faker.helpers.arrayElement(expenseCategories);
      payee = faker.helpers.arrayElement(EXPENSE_PAYEES);
      amount = generateExpenseAmount(category.name);
    } else if (rand < 0.95 && incomeCategories.length > 0) {
      // Income
      type = 'income';
      category = faker.helpers.arrayElement(incomeCategories);
      payee = faker.helpers.arrayElement(INCOME_PAYEES);
      amount = generateIncomeAmount(category.name);
    } else {
      // Transfer (or fallback if categories empty)
      type = 'transfer';
      category = incomeCategories[0] || categories[0]; // Fallback
      payee = 'Transfer';
      amount = faker.number.int({ min: 5000, max: 50000 }); // €50 - €500
    }

    // Pick random accounts
    const primaryAccount = faker.helpers.arrayElement(accounts);
    let toAccount: Account | null = null;
    
    if (type === 'transfer') {
      toAccount = faker.helpers.arrayElement(accounts.filter(a => a.id !== primaryAccount.id));
    }

    const transaction: Transaction = {
      id: randomUUID(),
      type,
      date: txDate.toISOString(),
      payee,
      amount,
      currency: 'EUR',
      accountId: primaryAccount.id,
      categoryId: type === 'transfer' ? null : category.id,
      toAccountId: toAccount?.id ?? null,
      splits: [],
      status: 'cleared',
      notes: Math.random() > 0.8 ? faker.lorem.sentence() : '',
      tags: [],
      isReconciled: Math.random() > 0.5,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    transactions.push(transaction);
  }

  // ===========================================
  // GENERATE ADDITIONAL ENTITIES
  // ===========================================

  // 1. Properties
  const properties: Property[] = DEMO_PROPERTIES.map(p => ({
    ...p,
    id: randomUUID(),
    currentValue: Math.round((p.purchasePrice || 0) * 1.15), // +15% appreciation
    lastValuationDate: nowISO,
    createdAt: nowISO,
    updatedAt: nowISO
  }));

  // 2. Collectibles
  const collectibles: Collectible[] = DEMO_COLLECTIBLES.map(c => ({
    ...c,
    id: randomUUID(),
    currentValue: Math.round((c.purchasePrice || 0) * 1.20), // +20% appreciation
    createdAt: nowISO,
    updatedAt: nowISO
  }));

  // 3. Assets & Holdings
  const assets: Asset[] = DEMO_ASSETS.map(a => ({
    ...a,
    id: randomUUID(),
    lastUpdated: nowISO,
    createdAt: nowISO,
    updatedAt: nowISO
  }));

  const holdings: Holding[] = [];
  
  // Create holdings for the investment account
  assets.forEach(asset => {
    // Generate random quantity
    const quantity = asset.type === 'crypto' 
      ? faker.number.float({ min: 0.1, max: 2.5, fractionDigits: 4 })
      : faker.number.int({ min: 10, max: 100 });
      
    // Generate somewhat realistic buy price (current price +/- 20%)
    const variation = faker.number.float({ min: 0.8, max: 1.2 });
    const averageBuyPrice = Math.round(asset.currentPrice * variation);

    const holding: Holding = {
      id: randomUUID(),
      accountId: investmentAccount.id,
      assetId: asset.id,
      quantity,
      averageBuyPrice,
      createdAt: nowISO,
      updatedAt: nowISO
    };
    holdings.push(holding);

    // Also generate the initial "Buy" transaction for this holding
    // Placed randomly in the past
    const buyDate = faker.date.past({ years: 1 });
    const totalCost = Math.round(quantity * averageBuyPrice);

    transactions.push({
      id: randomUUID(),
      type: 'expense',
      date: buyDate.toISOString(),
      payee: `Buy ${asset.name}`,
      amount: totalCost,
      currency: asset.currency,
      accountId: investmentAccount.id,
      categoryId: null,
      toAccountId: null,
      splits: [],
      status: 'cleared',
      notes: `Seed generated buy order`,
      tags: ['investment'],
      isReconciled: true,
      createdAt: nowISO,
      updatedAt: nowISO,
    });
  });

  // Write accounts.json
  const accountsFile: AccountsFile = {
    version: 1,
    accounts,
  };
  await fs.writeJson(
    path.join(vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE),
    accountsFile,
    { spaces: 2 }
  );

  // Write categories.json
  const categoriesFile: CategoriesFile = {
    version: 1,
    categories,
  };
  await fs.writeJson(
    path.join(vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE),
    categoriesFile,
    { spaces: 2 }
  );

  // Group transactions by year/month and write to separate files
  const transactionsByMonth = new Map<string, Transaction[]>();
  
  for (const tx of transactions) {
    const date = new Date(tx.date);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const key = `${year}/${month}`;
    
    if (!transactionsByMonth.has(key)) {
      transactionsByMonth.set(key, []);
    }
    transactionsByMonth.get(key)!.push(tx);
  }

  // Write each month's transactions
  for (const [key, monthTransactions] of transactionsByMonth) {
    const [year, month] = key.split('/');
    const monthDir = path.join(
      vaultPath,
      VAULT_STRUCTURE.TRANSACTIONS_DIR,
      year,
      month
    );
    
    await fs.ensureDir(monthDir);
    
    const txFile: TransactionsFile = {
      version: 1,
      year: parseInt(year),
      month: parseInt(month),
      transactions: monthTransactions,
    };
    
    await fs.writeJson(
      path.join(monthDir, 'transactions.json'),
      txFile,
      { spaces: 2 }
    );
  }

  // Write properties.json
  await fs.writeJson(
    path.join(vaultPath, 'properties.json'),
    { version: 1, properties },
    { spaces: 2 }
  );

  // Write collectibles.json
  await fs.writeJson(
    path.join(vaultPath, 'collectibles.json'),
    { version: 1, collectibles },
    { spaces: 2 }
  );

  // Write assets.json
  await fs.writeJson(
    path.join(vaultPath, 'assets.json'),
    { version: 1, assets },
    { spaces: 2 }
  );

  // Write holdings.json
  await fs.writeJson(
    path.join(vaultPath, 'holdings.json'),
    { version: 1, holdings },
    { spaces: 2 }
  );

  return {
    accounts: accounts.length,
    categories: categories.length,
    transactions: transactions.length,
    properties: properties.length,
    collectibles: collectibles.length,
    assets: assets.length
  };
}

// ============================================================================
// AMOUNT GENERATORS
// ============================================================================

function generateExpenseAmount(categoryName: string): number {
  // Returns amount in cents
  switch (categoryName) {
    case 'Rent':
      return faker.number.int({ min: 80000, max: 150000 }); // €800 - €1500
    case 'Food & Dining':
      return faker.number.int({ min: 500, max: 12000 }); // €5 - €120
    case 'Utilities':
      return faker.number.int({ min: 3000, max: 20000 }); // €30 - €200
    case 'Transportation':
      return faker.number.int({ min: 500, max: 15000 }); // €5 - €150
    case 'Entertainment':
      return faker.number.int({ min: 1000, max: 8000 }); // €10 - €80
    case 'Shopping':
      return faker.number.int({ min: 2000, max: 30000 }); // €20 - €300
    case 'Healthcare':
      return faker.number.int({ min: 2000, max: 25000 }); // €20 - €250
    default:
      return faker.number.int({ min: 1000, max: 10000 }); // €10 - €100
  }
}

function generateIncomeAmount(categoryName: string): number {
  // Returns amount in cents
  switch (categoryName) {
    case 'Salary':
      return faker.number.int({ min: 250000, max: 500000 }); // €2500 - €5000
    case 'Freelance':
      return faker.number.int({ min: 50000, max: 200000 }); // €500 - €2000
    case 'Investments':
      return faker.number.int({ min: 10000, max: 100000 }); // €100 - €1000
    default:
      return faker.number.int({ min: 5000, max: 50000 }); // €50 - €500
  }
}

/**
 * Clear all data from the vault (for testing)
 */
export async function clearVaultData(vaultPath: string): Promise<void> {
  // Reset accounts
  await fs.writeJson(
    path.join(vaultPath, VAULT_STRUCTURE.ACCOUNTS_FILE),
    { version: 1, accounts: [] },
    { spaces: 2 }
  );

  // Reset categories
  await fs.writeJson(
    path.join(vaultPath, VAULT_STRUCTURE.CATEGORIES_FILE),
    { version: 1, categories: [] },
    { spaces: 2 }
  );

  // Clear transactions folder
  const txDir = path.join(vaultPath, VAULT_STRUCTURE.TRANSACTIONS_DIR);
  if (await fs.pathExists(txDir)) {
    await fs.emptyDir(txDir);
  }

  // Clear new files
  await fs.remove(path.join(vaultPath, 'properties.json'));
  await fs.remove(path.join(vaultPath, 'collectibles.json'));
  await fs.remove(path.join(vaultPath, 'assets.json'));
  await fs.remove(path.join(vaultPath, 'holdings.json'));
}
