import { contextBridge, ipcRenderer } from 'electron';
import type { SqlParams } from './db/database';

const api = {
  db: {
    run: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:run', sql, params),
    get: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:get', sql, params),
    all: (sql: string, params: SqlParams = []) => ipcRenderer.invoke('db:all', sql, params),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
