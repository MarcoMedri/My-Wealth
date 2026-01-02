import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getVaultManager } from './vault'
import { IPC_CHANNELS, type ColumnMapping } from '../shared/types'
import type { Transaction, Account, Category, Broker } from '../shared/schemas'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register IPC handlers
function registerIpcHandlers(): void {
  const vaultManager = getVaultManager()

  // ========== VAULT STATUS ==========
  
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_STATUS, async () => {
    return vaultManager.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_SELECT_PATH, async () => {
    return vaultManager.selectVaultPath()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_INITIALIZE, async (_event, vaultPath: string) => {
    await vaultManager.initializeVault(vaultPath)
    return vaultManager.getStatus()
  })

  // ========== VAULT DATA ==========
  
  ipcMain.handle(IPC_CHANNELS.VAULT_LOAD, async () => {
    return vaultManager.loadVault()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_CREATE_SNAPSHOT, async () => {
    return vaultManager.createSnapshot()
  })

  // ========== TRANSACTIONS ==========
  
  ipcMain.handle(IPC_CHANNELS.TRANSACTION_SAVE, async (_event, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    return vaultManager.saveTransaction(transaction)
  })

  ipcMain.handle(IPC_CHANNELS.TRANSACTION_DELETE, async (_event, id: string) => {
    return vaultManager.deleteTransaction(id)
  })

  // ========== ACCOUNTS ==========
  
  ipcMain.handle(IPC_CHANNELS.ACCOUNT_SAVE, async (_event, account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    return vaultManager.saveAccount(account)
  })

  // ========== CATEGORIES ==========
  
  ipcMain.handle(IPC_CHANNELS.CATEGORY_SAVE, async (_event, category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    return vaultManager.saveCategory(category)
  })

  ipcMain.handle(IPC_CHANNELS.CATEGORY_DELETE, async (_event, id: string) => {
    return vaultManager.deleteCategory(id)
  })

  // ========== BROKERS ==========
  
  ipcMain.handle(IPC_CHANNELS.BROKER_SAVE, async (_event, broker: Broker) => {
    return vaultManager.saveBroker(broker)
  })

  ipcMain.handle(IPC_CHANNELS.BROKER_DELETE, async (_event, id: string) => {
    return vaultManager.deleteBroker(id)
  })

  // ========== CSV IMPORT ==========
  ipcMain.handle(IPC_CHANNELS.IMPORT_GET_PRESETS, async () => {
    const { IMPORT_PRESETS } = await import('./csv-importer')
    return IMPORT_PRESETS
  });
  
  ipcMain.handle(IPC_CHANNELS.IMPORT_CSV_PREVIEW, async (_event, content: string) => {
    const { getCSVPreview, getCSVHeaders } = await import('./csv-importer')
    return {
      headers: getCSVHeaders(content),
      preview: getCSVPreview(content)
    }
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_CSV_EXECUTE, async (_event, { content, mapping, accountId }: { content: string, mapping: ColumnMapping, accountId: string }) => {
    const { parseCSV } = await import('./csv-importer')
    // Just parse and return transactions. The renderer handles deduplication and saving.
    return parseCSV(content, mapping, accountId)
  })

  // ========== INVESTMENTS ==========
  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_SEARCH, async (_event, query: string) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.search(query);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_GET_QUOTE, async (_event, symbol: string) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.getQuote(symbol);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_BUY, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.buy(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_BUY_MANUAL, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.buyManual(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_SELL, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.sell(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENTS_REFRESH_PRICES, async () => {
    const { investmentManager } = await import('./investments');
    return investmentManager.refreshAllPrices();
  });

  ipcMain.handle(IPC_CHANNELS.ASSET_DELETE, async (_event, id: string) => {
    return vaultManager.deleteAsset(id);
  });

  ipcMain.handle(IPC_CHANNELS.HOLDING_DELETE, async (_event, id: string) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.deleteHolding(id);
  });

  // ========== DIVIDENDS ==========
  ipcMain.handle(IPC_CHANNELS.DIVIDEND_SAVE, async (_event, dividend) => {
    return vaultManager.saveDividend(dividend);
  });

  ipcMain.handle(IPC_CHANNELS.DIVIDEND_DELETE, async (_event, id: string) => {
    return vaultManager.deleteDividend(id);
  });

  // ========== REAL ESTATE ==========
  ipcMain.handle(IPC_CHANNELS.PROPERTY_SAVE, async (_event, property) => {
    return vaultManager.saveProperty(property);
  });

  ipcMain.handle(IPC_CHANNELS.PROPERTY_DELETE, async (_event, id) => {
    return vaultManager.deleteProperty(id);
  });

  // ========== COLLECTIBLES ==========
  ipcMain.handle(IPC_CHANNELS.COLLECTIBLE_SAVE, async (_event, collectible) => {
    return vaultManager.saveCollectible(collectible);
  });

  ipcMain.handle(IPC_CHANNELS.COLLECTIBLE_DELETE, async (_event, id) => {
    return vaultManager.deleteCollectible(id);
  });

  // ========== EXCHANGE RATES ==========
  ipcMain.handle(IPC_CHANNELS.EXCHANGE_RATES_GET, async (_event, baseCurrency: string) => {
    const { exchangeRateManager } = await import('./exchangeRates');
    return exchangeRateManager.getExchangeRates(baseCurrency);
  });

  // ========== DEVELOPER (dev-only) ==========
  
  ipcMain.handle(IPC_CHANNELS.DEV_SEED, async () => {
    const vaultPath = vaultManager.getVaultPath()
    if (!vaultPath) throw new Error('No vault initialized')
    
    // Dynamic import to avoid bundling in production
    const { generateDemoData } = await import('./seed')
    return generateDemoData(vaultPath)
  })

  ipcMain.handle(IPC_CHANNELS.DEV_CLEAR, async () => {
    const vaultPath = vaultManager.getVaultPath()
    if (!vaultPath) throw new Error('No vault initialized')
    
    const { clearVaultData } = await import('./seed')
    await clearVaultData(vaultPath)
    return { success: true }
  })
}

// Main app lifecycle
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.mywealth.desktop')

  const vaultManager = getVaultManager()
  await vaultManager.initialize()

  registerIpcHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
