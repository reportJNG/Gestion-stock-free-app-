import { contextBridge, ipcRenderer } from 'electron';
import type { SqlParams } from './db/database';

const api = {
  db: {
    run: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:run', sql, params),
    get: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:get', sql, params),
    all: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:all', sql, params),
    users: {
      getAll: () => ipcRenderer.invoke('db:users:getAll'),
      getById: (id: number) => ipcRenderer.invoke('db:users:getById', id),
      create: (input: unknown) => ipcRenderer.invoke('db:users:create', input),
      updatePassword: (userId: number, passwordHash: string) => ipcRenderer.invoke('db:users:updatePassword', userId, passwordHash),
      updateSettings: (userId: number, input: unknown) => ipcRenderer.invoke('db:users:updateSettings', userId, input),
    },
    products: {
      getAll: (filter: unknown) => ipcRenderer.invoke('db:products:getAll', filter),
      getById: (productId: number) => ipcRenderer.invoke('db:products:getById', productId),
      create: (input: unknown) => ipcRenderer.invoke('db:products:create', input),
      update: (productId: number, input: unknown) => ipcRenderer.invoke('db:products:update', productId, input),
      delete: (productId: number, deletedBy: number, reason?: string) => ipcRenderer.invoke('db:products:delete', productId, deletedBy, reason),
    },
    variants: {
      getBySku: (sku: string, userId: number) => ipcRenderer.invoke('db:variants:getBySku', sku, userId),
      getByProduct: (productId: number) => ipcRenderer.invoke('db:variants:getByProduct', productId),
      addQty: (variantId: number, userId: number, quantity: number, note?: string) => ipcRenderer.invoke('db:variants:addQty', variantId, userId, quantity, note),
    },
    sales: {
      record: (input: unknown) => ipcRenderer.invoke('db:sales:record', input),
      getRecent: (userId: number, limit?: number) => ipcRenderer.invoke('db:sales:getRecent', userId, limit),
      getByRange: (from: string, to: string) => ipcRenderer.invoke('db:sales:getByRange', from, to),
    },
    stock: {
      getAll: (userId: number) => ipcRenderer.invoke('db:stock:getAll', userId),
      getLow: (userId: number) => ipcRenderer.invoke('db:stock:getLow', userId),
      getMovements: (variantId: number) => ipcRenderer.invoke('db:stock:getMovements', variantId),
    },
    reports: {
      dailySummary: (from?: string, to?: string) => ipcRenderer.invoke('db:reports:dailySummary', from, to),
      weeklySummary: (from?: string, to?: string) => ipcRenderer.invoke('db:reports:weeklySummary', from, to),
      topProducts: (limit?: number) => ipcRenderer.invoke('db:reports:topProducts', limit),
      topBuyers: (limit?: number) => ipcRenderer.invoke('db:reports:topBuyers', limit),
      summaryByRange: (userId: number, start: string, end: string) => ipcRenderer.invoke('db:reports:summaryByRange', userId, start, end),
      hourlyPattern: (userId: number, start: string, end: string) => ipcRenderer.invoke('db:reports:hourlyPattern', userId, start, end),
      categoryBreakdown: (userId: number, start: string, end: string) => ipcRenderer.invoke('db:reports:categoryBreakdown', userId, start, end),
      periodComparison: (userId: number, currentStart: string, currentEnd: string, prevStart: string, prevEnd: string) =>
        ipcRenderer.invoke('db:reports:periodComparison', userId, currentStart, currentEnd, prevStart, prevEnd),
      salesLog: (userId: number, start: string, end: string) => ipcRenderer.invoke('db:reports:salesLog', userId, start, end),
    },
    archives: {
      getAll: (userId?: number, limit?: number, offset?: number, query?: string, from?: string, to?: string) => ipcRenderer.invoke('db:archives:getAll', userId, limit, offset, query, from, to),
      count: (userId: number, query?: string, from?: string, to?: string) => ipcRenderer.invoke('db:archives:count', userId, query, from, to),
      restore: (archiveId: number) => ipcRenderer.invoke('db:archives:restore', archiveId),
    },
    settings: {
      get: (userId: number, key: string) => ipcRenderer.invoke('db:settings:get', userId, key),
      getAll: (userId: number) => ipcRenderer.invoke('db:settings:getAll', userId),
      set: (userId: number, key: string, value: string) => ipcRenderer.invoke('db:settings:set', userId, key, value),
    },
    categoryTemplates: {
      getAll: () => ipcRenderer.invoke('db:categoryTemplates:getAll'),
    },
  },
  economy: {
    topProducts: (userId: number, limit?: number, start?: string, end?: string) => ipcRenderer.invoke('db:economy:topProducts', userId, limit, start, end),
    topBuyers: (userId: number, limit?: number, start?: string, end?: string) => ipcRenderer.invoke('db:economy:topBuyers', userId, limit, start, end),
    categoryPerformance: (userId: number, start?: string, end?: string) => ipcRenderer.invoke('db:economy:categoryPerformance', userId, start, end),
    slowMovers: (userId: number, dayThreshold?: number) => ipcRenderer.invoke('db:economy:slowMovers', userId, dayThreshold),
    profitableVariants: (userId: number) => ipcRenderer.invoke('db:economy:profitableVariants', userId),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  file: {
    saveCsv: (filename: string, content: string) => ipcRenderer.invoke('file:saveCsv', filename, content),
    exportBackup: () => ipcRenderer.invoke('file:exportBackup'),
    importBackup: () => ipcRenderer.invoke('file:importBackup'),
  },
  profile: {
    stats: (userId: number) => ipcRenderer.invoke('db:profile:stats', userId),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
  },
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
  },
  print: {
    label: (html: string) => ipcRenderer.invoke('print:label', html),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
