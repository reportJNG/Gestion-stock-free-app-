import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { copyFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  addVariantQuantity,
  all,
  createProduct,
  createUser,
  deleteProduct,
  get,
  getAllStock,
  getAllUsers,
  getArchives,
  getCategoryTemplates,
  getDailySummary,
  getLowStock,
  getStockMovements,
  getProductById,
  getProducts,
  getRecentSales,
  getSalesByRange,
  getSetting,
  getAllSettings,
  getProfileStats,
  getTopBuyers,
  getTopProducts,
  getSummaryByRange,
  getHourlyPattern,
  getCategoryBreakdown,
  getPeriodComparison,
  getSalesLogByRange,
  getEconomyTopProducts,
  getEconomyTopBuyers,
  getEconomyCategoryPerformance,
  getEconomySlowMovers,
  getEconomyProfitableVariants,
  getUserById,
  getVariantBySku,
  getVariantsByProduct,
  getWeeklySummary,
  initDatabase,
  recordSale,
  restoreArchive,
  run,
  setSetting,
  updateProduct,
  updateUserPassword,
  updateUserSettings,
} from './db/database';

let mainWindow: BrowserWindow | null = null;

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

const registerIpcHandlers = (): void => {
  ipcMain.handle('db:run', (_event, sql: string, params = []) => run(sql, params));
  ipcMain.handle('db:get', (_event, sql: string, params = []) => get(sql, params));
  ipcMain.handle('db:all', (_event, sql: string, params = []) => all(sql, params));
  ipcMain.handle('db:users:getAll', () => getAllUsers());
  ipcMain.handle('db:users:getById', (_event, id: number) => getUserById(id));
  ipcMain.handle('db:users:create', (_event, input) => createUser(input));
  ipcMain.handle('db:users:updatePassword', (_event, userId: number, passwordHash: string) => updateUserPassword(userId, passwordHash));
  ipcMain.handle('db:users:updateSettings', (_event, userId: number, input) => updateUserSettings(userId, input));
  ipcMain.handle('db:products:getAll', (_event, filter) => getProducts(filter));
  ipcMain.handle('db:products:getById', (_event, productId: number) => getProductById(productId));
  ipcMain.handle('db:products:create', (_event, input) => createProduct(input));
  ipcMain.handle('db:products:update', (_event, productId: number, input) => updateProduct(productId, input));
  ipcMain.handle('db:products:delete', (_event, productId: number, deletedBy: number, reason?: string) => deleteProduct(productId, deletedBy, reason));
  ipcMain.handle('db:variants:getBySku', (_event, sku: string) => getVariantBySku(sku));
  ipcMain.handle('db:variants:getByProduct', (_event, productId: number) => getVariantsByProduct(productId));
  ipcMain.handle('db:variants:addQty', (_event, variantId: number, userId: number, quantity: number, note?: string) => addVariantQuantity(variantId, userId, quantity, note));
  ipcMain.handle('db:sales:record', (_event, input) => recordSale(input));
  ipcMain.handle('db:sales:getRecent', (_event, limit?: number) => getRecentSales(limit));
  ipcMain.handle('db:sales:getByRange', (_event, from: string, to: string) => getSalesByRange(from, to));
  ipcMain.handle('db:stock:getAll', () => getAllStock());
  ipcMain.handle('db:stock:getLow', () => getLowStock());
  ipcMain.handle('db:stock:getMovements', (_event, variantId: number) => getStockMovements(variantId));
  ipcMain.handle('file:saveCsv', async (_event, filename: string, content: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: filename,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await writeFile(result.filePath, content, 'utf8');
    return { canceled: false, filePath: result.filePath };
  });
  ipcMain.handle('file:exportBackup', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `stockflow-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite database', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await copyFile(join(app.getPath('userData'), 'stockflow.db'), result.filePath);
    return { canceled: false, filePath: result.filePath };
  });
  ipcMain.handle('file:importBackup', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'SQLite database', extensions: ['db'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    await copyFile(result.filePaths[0], join(app.getPath('userData'), 'stockflow.db'));
    return { canceled: false, filePath: result.filePaths[0] };
  });
  ipcMain.handle('db:reports:dailySummary', (_event, from?: string, to?: string) => getDailySummary(from, to));
  ipcMain.handle('db:reports:weeklySummary', (_event, from?: string, to?: string) => getWeeklySummary(from, to));
  ipcMain.handle('db:reports:topProducts', (_event, limit?: number) => getTopProducts(limit));
  ipcMain.handle('db:reports:topBuyers', (_event, limit?: number) => getTopBuyers(limit));
  ipcMain.handle('db:reports:summaryByRange', (_event, userId: number, start: string, end: string) => getSummaryByRange(userId, start, end));
  ipcMain.handle('db:reports:hourlyPattern', (_event, userId: number, start: string, end: string) => getHourlyPattern(userId, start, end));
  ipcMain.handle('db:reports:categoryBreakdown', (_event, userId: number, start: string, end: string) => getCategoryBreakdown(userId, start, end));
  ipcMain.handle('db:reports:periodComparison', (_event, userId: number, currentStart: string, currentEnd: string, prevStart: string, prevEnd: string) =>
    getPeriodComparison(userId, currentStart, currentEnd, prevStart, prevEnd),
  );
  ipcMain.handle('db:reports:salesLog', (_event, userId: number, start: string, end: string) => getSalesLogByRange(userId, start, end));
  ipcMain.handle('db:economy:topProducts', (_event, userId: number, limit?: number, start?: string, end?: string) => getEconomyTopProducts(userId, limit, start, end));
  ipcMain.handle('db:economy:topBuyers', (_event, userId: number, limit?: number, start?: string, end?: string) => getEconomyTopBuyers(userId, limit, start, end));
  ipcMain.handle('db:economy:categoryPerformance', (_event, userId: number, start?: string, end?: string) => getEconomyCategoryPerformance(userId, start, end));
  ipcMain.handle('db:economy:slowMovers', (_event, userId: number, dayThreshold?: number) => getEconomySlowMovers(userId, dayThreshold));
  ipcMain.handle('db:economy:profitableVariants', (_event, userId: number) => getEconomyProfitableVariants(userId));
  ipcMain.handle('db:archives:getAll', (_event, limit?: number, offset?: number) => getArchives(limit, offset));
  ipcMain.handle('db:archives:restore', (_event, archiveId: number) => restoreArchive(archiveId));
  ipcMain.handle('db:settings:get', (_event, userId: number, key: string) => getSetting(userId, key));
  ipcMain.handle('db:settings:getAll', (_event, userId: number) => getAllSettings(userId));
  ipcMain.handle('db:settings:set', (_event, userId: number, key: string, value: string) => setSetting(userId, key, value));
  ipcMain.handle('db:profile:stats', (_event, userId: number) => getProfileStats(userId));
  ipcMain.handle('db:categoryTemplates:getAll', () => getCategoryTemplates());

  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (!window) {
      return;
    }

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });
};

app.whenReady().then(async () => {
  initDatabase();
  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
