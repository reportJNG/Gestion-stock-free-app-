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
      getBySku: (sku: string) => ipcRenderer.invoke('db:variants:getBySku', sku),
      getByProduct: (productId: number) => ipcRenderer.invoke('db:variants:getByProduct', productId),
      addQty: (variantId: number, userId: number, quantity: number, note?: string) => ipcRenderer.invoke('db:variants:addQty', variantId, userId, quantity, note),
    },
    sales: {
      record: (input: unknown) => ipcRenderer.invoke('db:sales:record', input),
      getRecent: (limit?: number) => ipcRenderer.invoke('db:sales:getRecent', limit),
      getByRange: (from: string, to: string) => ipcRenderer.invoke('db:sales:getByRange', from, to),
    },
    stock: {
      getAll: () => ipcRenderer.invoke('db:stock:getAll'),
      getLow: () => ipcRenderer.invoke('db:stock:getLow'),
      getMovements: (variantId: number) => ipcRenderer.invoke('db:stock:getMovements', variantId),
    },
    reports: {
      dailySummary: (from?: string, to?: string) => ipcRenderer.invoke('db:reports:dailySummary', from, to),
      weeklySummary: (from?: string, to?: string) => ipcRenderer.invoke('db:reports:weeklySummary', from, to),
      topProducts: (limit?: number) => ipcRenderer.invoke('db:reports:topProducts', limit),
      topBuyers: (limit?: number) => ipcRenderer.invoke('db:reports:topBuyers', limit),
    },
    archives: {
      getAll: (limit?: number, offset?: number) => ipcRenderer.invoke('db:archives:getAll', limit, offset),
      restore: (archiveId: number) => ipcRenderer.invoke('db:archives:restore', archiveId),
    },
    settings: {
      get: (userId: number, key: string) => ipcRenderer.invoke('db:settings:get', userId, key),
      set: (userId: number, key: string, value: string) => ipcRenderer.invoke('db:settings:set', userId, key, value),
    },
    categoryTemplates: {
      getAll: () => ipcRenderer.invoke('db:categoryTemplates:getAll'),
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  file: {
    saveCsv: (filename: string, content: string) => ipcRenderer.invoke('file:saveCsv', filename, content),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
