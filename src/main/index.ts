import { app, shell, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getVaultManager } from './vault'
import { IPC_CHANNELS, type ColumnMapping } from '../shared/types'
import type { Transaction, Account, Category, Broker, DepositAccount } from '../shared/schemas'
import * as fs from 'fs'
import * as path from 'path'

async function createWindow(): Promise<void> {
  const vaultManager = getVaultManager();
  
  // Load saved window bounds
  const settings = vaultManager.getSettings();
  const savedBounds = settings?.windowBounds;
  
  const mainWindow = new BrowserWindow({
    width: savedBounds?.width || 1200,
    height: savedBounds?.height || 800,
    x: savedBounds?.x,
    y: savedBounds?.y,
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
  });

  // Restore maximized state
  if (savedBounds?.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Save window bounds on resize/move (debounced)
  let saveTimeout: NodeJS.Timeout;
  const saveBounds = async () => {
    if (mainWindow.isDestroyed()) return;
    
    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();
    
    const currentSettings = vaultManager.getSettings();
    if (!currentSettings) return; // Can't save if no settings exist
    
    await vaultManager.updateSettings({
      ...currentSettings,
      windowBounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      }
    });
  };

  mainWindow.on('resize', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveBounds, 500);
  });

  mainWindow.on('move', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveBounds, 500);
  });

  // Save immediately on close
  mainWindow.on('close', () => {
    clearTimeout(saveTimeout);
    saveBounds();
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// Register IPC handlers
function registerIpcHandlers(): void {
  const vaultManager = getVaultManager()

  // ========== VAULT STATUS ==========
  
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_STATUS, async () => {
    return vaultManager.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_SELECT_FILE, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })

    if (canceled || filePaths.length === 0) {
      return null
    }

    try {
      const content = fs.readFileSync(filePaths[0], 'utf-8')
      return {
        name: path.basename(filePaths[0]),
        content,
        path: filePaths[0]
      }
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_SELECT_PATH, async () => {
    return vaultManager.selectVaultPath()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_INITIALIZE, async (_event, vaultPath: string) => {
    await vaultManager.initializeVault(vaultPath)
    return vaultManager.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_RESET, async () => {
    await vaultManager.resetVaultPath();
  })

  // ========== VAULT DATA ==========
  
  ipcMain.handle(IPC_CHANNELS.VAULT_LOAD, async () => {
    return vaultManager.loadVault()
  })

  ipcMain.handle(IPC_CHANNELS.VAULT_CREATE_SNAPSHOT, async () => {
    return vaultManager.createSnapshot();
  });

  ipcMain.handle(IPC_CHANNELS.WORKSPACE_SAVE, async (_event, settings) => {
    return vaultManager.saveWorkspace(settings);
  });

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

  ipcMain.handle(IPC_CHANNELS.ACCOUNT_SET_MANUAL_BALANCE, async (_event, accountId: string, balance: number | null, date: string) => {
    return vaultManager.setAccountManualBalance(accountId, balance, date)
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

  ipcMain.handle(IPC_CHANNELS.BROKER_DOWNLOAD_LOGO, async (_event, domain: string, brokerId: string) => {
    return vaultManager.downloadBrokerLogo(domain, brokerId)
  })

  ipcMain.handle(IPC_CHANNELS.BROKER_SELECT_LOGO, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }
      ]
    })
    
    if (result.canceled || !result.filePaths[0]) {
      return null
    }
    
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.BROKER_GET_PRESET_LOGO, async (_event, brokerName: string) => {
    const extensions = ['.jpeg', '.png', '.jpg', '.svg']
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../resources')
    const iconsPath = path.join(resourcesPath, 'asset-icons')
    
    for (const ext of extensions) {
      const logoPath = path.join(iconsPath, `${brokerName}${ext}`)
      if (fs.existsSync(logoPath)) {
        // Return asset:// protocol URL for Electron
        return `asset://${brokerName}${ext}`
      }
    }
    
    return null
  })

  ipcMain.handle(IPC_CHANNELS.BROKER_SAVE_LOGO, async (_event, sourcePath: string, brokerId: string) => {
    return vaultManager.saveBrokerLogo(sourcePath, brokerId)
  })

  // ========== LOGO REGISTRY ==========

  ipcMain.handle(IPC_CHANNELS.LOGO_GET_REGISTRY, async () => {
    // In dev mode, resources are in the project root
    // In production, they're in app.asar or process.resourcesPath
    const isDev = !app.isPackaged
    const resourcesPath = isDev 
      ? path.join(app.getAppPath(), 'resources')
      : (process.resourcesPath || path.join(__dirname, '../../resources'))
    
    const registryPath = path.join(resourcesPath, 'logo-registry.json')
    
    console.log('Loading logo registry from:', registryPath)
    console.log('File exists:', fs.existsSync(registryPath))
    
    try {
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf-8')
        const parsed = JSON.parse(content)
        console.log('Logo registry loaded successfully:', parsed.logos?.length || 0, 'logos')
        return parsed
      } else {
        console.error('Logo registry file not found at:', registryPath)
      }
    } catch (error) {
      console.error('Failed to load logo registry:', error)
    }
    
    // Return empty registry if file not found or error
    return { version: '1.0.0', logos: [] }
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

  ipcMain.handle(IPC_CHANNELS.IMPORT_CSV_EXECUTE, async (_event, content: string, mapping: ColumnMapping, accountId: string) => {
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

  ipcMain.handle(IPC_CHANNELS.INVESTMENT_BUY, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.buy(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENT_BUY_MANUAL, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.buyManual(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENT_SELL, async (_event, params) => {
    const { investmentManager } = await import('./investments');
    return investmentManager.sell(params);
  });

  ipcMain.handle(IPC_CHANNELS.INVESTMENT_REFRESH_PRICES, async () => {
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

  // ========== INSURANCE ==========
  ipcMain.handle(IPC_CHANNELS.INSURANCE_SAVE, async (_event, policy) => {
    return vaultManager.saveInsurance(policy);
  });

  ipcMain.handle(IPC_CHANNELS.INSURANCE_DELETE, async (_event, id) => {
    return vaultManager.deleteInsurance(id);
  });

  // ========== DEPOSIT ACCOUNTS ==========
  ipcMain.handle(IPC_CHANNELS.DEPOSIT_SAVE, async (_event, deposit: DepositAccount) => {
    return vaultManager.saveDeposit(deposit);
  });

  ipcMain.handle(IPC_CHANNELS.DEPOSIT_DELETE, async (_event, id: string) => {
    return vaultManager.deleteDeposit(id);
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

  // Register custom protocol to serve asset icons
  protocol.handle('asset', (request) => {
    const url = request.url.replace('asset://', '')
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../resources')
    const filePath = path.join(resourcesPath, 'asset-icons', url)
    
    return net.fetch(`file://${filePath}`)
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
