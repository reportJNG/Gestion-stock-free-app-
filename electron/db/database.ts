import { app } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { migrations } from './migrations';

export type SqlParams = unknown[] | Record<string, unknown>;

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

let db: Database.Database | null = null;

const getDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath('userData'), 'stockflow.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  for (const migration of migrations) {
    db.exec(migration);
  }

  return db;
};

export const initDatabase = (): void => {
  getDatabase();
};

export const run = (sql: string, params: SqlParams = []): RunResult => {
  const result = getDatabase().prepare(sql).run(params);

  return {
    changes: result.changes,
    lastInsertRowid: result.lastInsertRowid,
  };
};

export const get = <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): T | undefined => {
  return getDatabase().prepare(sql).get(params) as T | undefined;
};

export const all = <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): T[] => {
  return getDatabase().prepare(sql).all(params) as T[];
};
