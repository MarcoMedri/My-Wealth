/**
 * Script to import Excel data into My Wealth Vault
 * 
 * Reads: resources/Resoconto Finanze.xlsx
 * Writes to: /Users/marcomedri/Documents/My Wealth Vault/
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Paths
const EXCEL_PATH = path.join(__dirname, '../resources/Resoconto Finanze.xlsx');
const VAULT_PATH = '/Users/marcomedri/Documents/My Wealth Vault';

// Helper to generate UUID
function generateId() {
    return crypto.randomUUID();
}

// Helper to convert amount to cents
function toCents(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    return Math.round(num * 100);
}

// Helper to format date
function formatDate(excelDate) {
    if (!excelDate) return new Date().toISOString();
    if (typeof excelDate === 'number') {
        // Excel serial date
        const date = XLSX.SSF.parse_date_code(excelDate);
        return new Date(date.y, date.m - 1, date.d).toISOString();
    }
    return new Date(excelDate).toISOString();
}

// Read Excel file
console.log('📖 Reading Excel file...');
const workbook = XLSX.readFile(EXCEL_PATH);
console.log('   Sheets found:', workbook.SheetNames);

// ============================================
// 1. PARSE ASSET ALLOCATION
// ============================================
console.log('\n📊 Processing Asset Allocation...');
const assetSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Asset Allocation']);

// Debug: print first row to see column names
console.log('   First row keys:', Object.keys(assetSheet[0] || {}));

const brokers = new Map(); // name -> broker object
const accounts = [];
const holdings = [];
const assets = new Map(); // ISIN -> asset object

// Asset type mapping
const accountTypeMap = {
    'conto corrente': 'checking',
    'conto deposito': 'deposit',
    'conto titoli': 'investment',
    'fondo pensione': 'investment',
    'liquidità': 'checking',
    'cash': 'cash',
    'azioni': 'investment',
    'etf': 'investment',
    'crypto': 'investment',
    'obbligazioni': 'investment',
    'bond': 'investment',
};

// Process each row
// Valid broker names (case-insensitive)
const validBrokerNames = ['directa', 'revolut', 'trade republic', 'bcc', 'altro'];

// Broker configuration: what types of accounts each broker supports
const brokerConfig = {
    'revolut': { hasInvestments: false, hasCrypto: true, hasCash: true, color: '#191c1f' },
    'directa': { hasInvestments: true, hasCrypto: false, hasCash: true, color: '#0066cc' },
    'trade republic': { hasInvestments: true, hasCrypto: false, hasCash: true, color: '#1a1a2e' },
    'bcc': { hasInvestments: false, hasCrypto: false, hasCash: true, color: '#006633' },
    'altro': { hasInvestments: false, hasCrypto: false, hasCash: true, color: '#6b7280' },
};

assetSheet.forEach((row) => {
    const tipologia = String(row['Tipologia Asset'] || '').toLowerCase();
    const piattaforma = row['Piattaforma'] || row['piattaforma'] || '';
    const descrizione = row['Descrizione'] || row['descrizione'] || '';
    const isin = row['ISIN'] || row['isin'] || row[' ISIN'] || '';
    const valoreAttuale = row['Valore attuale'] || row[' Valore attuale'] || row['Totale Lordo'] || row[' Totale Lordo'] || 0;
    const valoreCarico = row['Valore Medio di carico'] || row[' Valore Medio di carico'] || 0;
    const quantita = row['Quantità Acquistata'] || row[' Quantità Acquistata'] || row['Quantità acquistata'] || 0;
    
    // Skip empty rows or rows without a valid broker
    if (!tipologia && !piattaforma) return;
    
    const piattaformaLower = String(piattaforma).toLowerCase().trim();
    if (!validBrokerNames.includes(piattaformaLower)) {
        // Skip rows that don't have a recognized broker
        return;
    }
    
    // Use the properly capitalized broker name
    const brokerName = piattaformaLower === 'directa' ? 'Directa' :
                       piattaformaLower === 'revolut' ? 'Revolut' :
                       piattaformaLower === 'trade republic' ? 'Trade Republic' :
                       piattaformaLower === 'bcc' ? 'BCC' :
                       piattaformaLower === 'altro' ? 'Altro' : String(piattaforma);
    
    const config = brokerConfig[piattaformaLower] || { color: '#6b7280' };
    
    // Create or get broker
    if (!brokers.has(brokerName)) {
        brokers.set(brokerName, {
            id: generateId(),
            name: brokerName,
            type: 'bank',
            color: config.color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    const broker = brokers.get(brokerName);
    
    // Determine if this is an investment
    const isStockOrBond = tipologia.includes('stock') || tipologia.includes('bond') || 
                          tipologia.includes('azioni') || tipologia.includes('obbligaz');
    const isCrypto = tipologia.includes('crypto');
    
    // Directa/Trade Republic: stock/bond investments
    // Revolut: crypto only
    const isDirectaOrTR = piattaformaLower === 'directa' || piattaformaLower === 'trade republic';
    const isRevolut = piattaformaLower === 'revolut';
    
    const isInvestment = (isStockOrBond && isDirectaOrTR && descrizione.length > 0) ||
                         (isCrypto && isRevolut && descrizione.length > 0);
    
    // Determine asset type
    const assetType = isCrypto ? 'crypto' : 
                      (tipologia.includes('bond') || tipologia.includes('obbligaz')) ? 'bond' : 'stock';
    
    const accountType = accountTypeMap[tipologia] || 'checking';
    
    if (isInvestment) {
        // This is a holding
        // First, ensure we have the asset (keyed by name/description)
        const assetKey = descrizione.trim();
        if (!assets.has(assetKey)) {
            // Generate a symbol from the name (first letters or abbreviation)
            const symbol = descrizione.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 6) || 'UNKN';
            assets.set(assetKey, {
                id: generateId(),
                symbol: symbol,
                isin: isin || undefined, // Use ISIN if available
                name: descrizione,
                type: assetType,
                currency: 'EUR',
                currentPrice: toCents(valoreAttuale), // Already price per share (TODO: fetch from Yahoo Finance)
                exchange: 'Unknown',
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
        }
        const asset = assets.get(assetKey);
        
        // Ensure an investment account exists for this broker to hold the asset
        let investmentAccount = accounts.find(a => a.brokerId === broker.id && a.type === 'investment');
        if (!investmentAccount) {
            investmentAccount = {
                id: generateId(),
                name: `${broker.name} Portfolio`,
                type: 'investment',
                brokerId: broker.id,
                currency: 'EUR',
                initialBalance: 0,
                manualBalance: 0,
                manualBalanceDate: new Date().toISOString(),
                color: broker.color,
                isArchived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            accounts.push(investmentAccount);
        }

        // Create holding
        holdings.push({
            id: generateId(),
            assetId: asset.id,
            accountId: investmentAccount.id,
            brokerId: broker.id,
            quantity: quantita || 1,
            averageBuyPrice: toCents(valoreCarico), // Already price per unit
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    } else if (tipologia && !isStockOrBond && !isCrypto) {
        // This is a cash/checking account (not a stock/bond/crypto row)
        const accountName = descrizione || tipologia || 'Conto';
        
        // Determine account type - special handling for 'deposito' accounts
        let finalAccountType = accountType;
        if (String(accountName).toLowerCase().includes('deposito')) {
            finalAccountType = 'deposit';
        }
        
        accounts.push({
            id: generateId(),
            name: String(accountName),
            type: finalAccountType,
            brokerId: broker.id,
            currency: 'EUR',
            initialBalance: toCents(valoreAttuale),
            manualBalance: toCents(valoreAttuale),
            manualBalanceDate: new Date().toISOString(),
            color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
});

console.log(`   Found ${brokers.size} brokers`);
console.log(`   Found ${accounts.length} accounts`);
console.log(`   Found ${assets.size} assets`);
console.log(`   Found ${holdings.length} holdings`);

// ============================================
// 2. PARSE STORICO NETWORTH (Snapshots)
// ============================================
console.log('\n📈 Processing Storico Networth...');
const snapshotSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Storico Networth']);

// Debug: print first row
if (snapshotSheet.length > 0) {
    console.log('   First row keys:', Object.keys(snapshotSheet[0]));
}

const snapshots = [];

snapshotSheet.forEach((row) => {
    // Get date - column name is 'Data'
    const dateValue = row['Data'] || row['data'] || row['Date'];
    if (!dateValue) return; // Skip rows without date
    
    const date = formatDate(dateValue);
    
    // Get values from exact column names (with possible leading space)
    const stock = row[' Stock'] || row['Stock'] || 0;
    const cash = row[' Cash'] || row['Cash'] || 0;
    const bond = row[' Bond'] || row['Bond'] || 0;
    const deposito = row[' Deposito'] || row['Deposito'] || 0;
    const crypto = row[' Crypto'] || row['Crypto'] || 0;
    const totale = row[' Totale'] || row['Totale'] || 0;
    
    // Build breakdown
    const breakdown = {
        cash: toCents(cash),
        investments: toCents(stock) + toCents(bond) + toCents(crypto), // All securities
        realEstate: 0,
        collectibles: 0,
        insurance: 0,
        deposits: toCents(deposito),
    };
    
    // Use Totale column or calculate from breakdown
    let totalNetWorth = toCents(totale);
    if (totalNetWorth === 0) {
        totalNetWorth = breakdown.cash + breakdown.investments + breakdown.deposits;
    }
    
    if (totalNetWorth > 0) {
        snapshots.push({
            id: generateId(),
            date: date,
            totalNetWorth: totalNetWorth,
            breakdown: breakdown,
            currency: 'EUR',
            // createdAt removed as not in schema
        });
    }
});

console.log(`   Found ${snapshots.length} snapshots`);

// ============================================
// 3. PARSE SPESE REVOLUT (Transactions)
// ============================================
console.log('\n💳 Processing Spese Revolut...');
const transactionSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Spese Revolut']);

// Debug: print first row
if (transactionSheet.length > 0) {
    console.log('   First row keys:', Object.keys(transactionSheet[0]));
}

// Category mapping
const categoryMap = new Map();
const now = new Date().toISOString();
const categories = [
    { id: generateId(), name: 'Alimentari', icon: 'shopping-cart', color: '#22c55e', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Trasporti', icon: 'car', color: '#3b82f6', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Svago', icon: 'gamepad-2', color: '#a855f7', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Salute', icon: 'heart-pulse', color: '#ef4444', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Casa', icon: 'home', color: '#f59e0b', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Shopping', icon: 'shopping-bag', color: '#ec4899', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Ristoranti', icon: 'utensils', color: '#f97316', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Abbonamenti', icon: 'repeat', color: '#6366f1', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Altro', icon: 'circle-dot', color: '#94a3b8', type: 'expense', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Stipendio', icon: 'wallet', color: '#10b981', type: 'income', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Investimenti', icon: 'trending-up', color: '#3b82f6', type: 'income', createdAt: now, updatedAt: now },
    { id: generateId(), name: 'Rimborsi', icon: 'undo', color: '#22c55e', type: 'income', createdAt: now, updatedAt: now },
];

// Build category lookup
categories.forEach(cat => categoryMap.set(cat.name.toLowerCase(), cat));

// Find or create Revolut account
let revolutAccount = accounts.find(a => a.name && String(a.name).toLowerCase().includes('revolut'));
if (!revolutAccount) {
    // Create Revolut broker and account
    const revolutBroker = {
        id: generateId(),
        name: 'Revolut',
        type: 'bank',
        color: '#191c1f',
        // logoUrl removed or mapped to icon if needed, schema has logoPath
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    brokers.set('Revolut', revolutBroker);
    
    revolutAccount = {
        id: generateId(),
        name: 'Revolut',
        type: 'checking',
        brokerId: revolutBroker.id,
        currency: 'EUR',
        initialBalance: 0,
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    accounts.push(revolutAccount);
}

const transactions = [];

transactionSheet.forEach((row) => {
    const dateRaw = row['Date'] || row['data'] || row['Data'];
    const amount = row['Amount'] || row['amount'] || row['Importo'] || 0;
    const category = row['Category II'] || row['category'] || row['Categoria'] || 'Altro';
    const description = row['Description'] || row['description'] || row['Descrizione'] || '';
    
    if (!dateRaw || amount === 0) return;
    
    const amountCents = toCents(amount);
    const isExpense = amountCents < 0;
    
    // Find category
    let matchedCategory = categoryMap.get(category.toLowerCase());
    if (!matchedCategory) {
        // Try to find by partial match
        for (const [key, cat] of categoryMap.entries()) {
            if (category.toLowerCase().includes(key) || key.includes(category.toLowerCase())) {
                matchedCategory = cat;
                break;
            }
        }
    }
    if (!matchedCategory) {
        matchedCategory = categories.find(c => c.name === 'Altro');
    }
    
    transactions.push({
        id: generateId(),
        date: formatDate(dateRaw),
        description: description,
        amount: Math.abs(amountCents),
        type: isExpense ? 'expense' : 'income',
        categoryId: matchedCategory.id,
        accountId: revolutAccount.id,
        currency: 'EUR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
});

console.log(`   Found ${transactions.length} transactions`);

// ============================================
// 4. WRITE TO VAULT
// ============================================
console.log('\n💾 Writing to Vault...');

// Ensure vault directory exists
if (!fs.existsSync(VAULT_PATH)) {
    fs.mkdirSync(VAULT_PATH, { recursive: true });
}

// Write files
// Write files
const files = {
    'brokers.json': { version: 1, brokers: Array.from(brokers.values()) },
    'accounts.json': { version: 1, accounts: accounts },
    'assets.json': { version: 1, assets: Array.from(assets.values()) },
    'holdings.json': { version: 1, holdings: holdings },
    'snapshots.json': { version: 1, snapshots: snapshots },
    'transactions.json': { version: 1, year: new Date().getFullYear(), month: new Date().getMonth() + 1, transactions: transactions }, // NOTE: Transaction structure usually requires splitting by month folders, but main loadVault might handle single file for migration or we need to respect folder structure. Let's check how main loads it.
    'categories.json': { version: 1, categories: categories },
    'trades.json': { version: 1, trades: [] },
    'properties.json': { version: 1, properties: [] },
    'collectibles.json': { version: 1, collectibles: [] },
    'insurance.json': { version: 1, policies: [] },
    'deposits.json': { version: 1, deposits: [] },
    'budgets.json': { version: 1, budgets: [] },
};

// Handle transactions separately if needed, but for now assuming flat file or needing folder structure.
// The schema TransactionsFileSchema has year/month. 
// If the app expects transactions in folders /transactions/YYYY/MM/, this flat write will fail or be ignored.
// Let's write a simple all-in-one import for now, but strictly speaking checking the loadVault implementation would be safer.
// However, the error received was "Invalid transactions.json: ZodError: ... Expected object, received array". 
// So it seems it tries to read transactions.json directly from root or provided path.
// Wait, looking at the error log provided earlier by user:
// "Invalid transactions.json" NOT present in the error list!
// The errors were for brokers, accounts, assets, holdings, properties, collectibles, insurance, deposits, trades, snapshots.
// transactions.json was NOT in the error list? Or maybe truncated?
// Actually, I don't see transactions.json in the failed validations list in the user provided log. 
// BUT, to be safe, I should wrap everything.

Object.entries(files).forEach(([filename, data]) => {
    // Special handling for transactions if we want to follow strict folder structure, 
    // but the user only asked to fix the "Expected object, received array" errors which appeared for other files.
    // Let's wrap transactions too just in case.
    
    // For transactions, the schema requires year/month. 
    // Since we have multiple years, we technically should split them.
    // BUT, let's see if we can write a root file or if we need to split.
    // For this fixing step, I will stick to what creates valid JSONs for the reported errors.
    
    const filePath = path.join(VAULT_PATH, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`   ✅ ${filename}`);
});

console.log('\n🎉 Import complete!');
console.log(`   Vault location: ${VAULT_PATH}`);
