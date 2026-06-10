import { app } from 'electron';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { categoryTemplateSeeds, defaultSettings, migrations } from './migrations';

type SqlParam = SQLInputValue | undefined;
export type SqlParams = SqlParam[] | Record<string, SqlParam>;
export type StockMovementType = 'sale' | 'restock' | 'adjustment' | 'loss' | 'return';

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface CreateUserInput {
  name: string;
  passwordHash: string;
  businessType?: string;
  avatarInitials?: string;
}

export interface UpdateUserInput {
  name?: string;
  businessType?: string;
  avatarInitials?: string;
  isActive?: number;
}

export interface ProductFilter {
  userId: number;
  search?: string;
  category?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateProductInput {
  userId: number;
  name: string;
  category?: string;
  description?: string;
  costPrice?: number;
  sellPrice?: number;
  unit?: string;
  lowStockThreshold?: number;
  variants?: Array<{ attributes: Record<string, string>; initialQuantity?: number } | Record<string, string>>;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  description?: string;
  costPrice?: number;
  sellPrice?: number;
  unit?: string;
  lowStockThreshold?: number;
  isArchived?: number;
  archivedReason?: string;
}

export interface RecordSaleInput {
  variantId: number;
  userId: number;
  quantity?: number;
  buyerName?: string;
  note?: string;
}

let db: DatabaseSync | null = null;

const getDatabase = (): DatabaseSync => {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath('userData'), 'stockflow.db');
  mkdirSync(app.getPath('userData'), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA synchronous = NORMAL');

  const migrate = transaction(() => {
    for (const migration of migrations) {
      db?.exec(migration);
    }

    seedCategoryTemplates();
  });

  migrate();

  return db;
};

const toSqlInput = (value: SqlParam): SQLInputValue => value ?? null;

const bindParams = (params: SqlParams): SQLInputValue[] | [Record<string, SQLInputValue>] => {
  if (Array.isArray(params)) {
    return params.map(toSqlInput);
  }

  return [
    Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, toSqlInput(value)]),
    ),
  ];
};

const transaction = <T>(callback: () => T): (() => T) => {
  return () => {
    const database = getDatabase();
    database.exec('BEGIN');
    try {
      const result = callback();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  };
};

const seedCategoryTemplates = (): void => {
  const database = db;
  if (!database) {
    return;
  }

  const insert = database.prepare(`
    INSERT OR IGNORE INTO category_templates (name, icon, attributes)
    VALUES (?, ?, ?)
  `);

  for (const template of categoryTemplateSeeds) {
    insert.run(...template);
  }
};

const seedDefaultSettings = (userId: number): void => {
  const insert = getDatabase().prepare(`
    INSERT OR IGNORE INTO app_settings (user_id, key, value)
    VALUES (?, ?, ?)
  `);

  for (const [key, value] of defaultSettings) {
    insert.run(userId, key, value);
  }
};

const skuFor = (productId: number, variantId: number): string => {
  return `PID${productId.toString().padStart(6, '0')}V${variantId.toString().padStart(4, '0')}`;
};

const qrFor = (sku: string): Promise<string> => {
  return QRCode.toDataURL(sku, {
    width: 256,
    margin: 1,
    color: { dark: '#ffffff', light: '#00000000' },
  });
};

export const initDatabase = (): void => {
  getDatabase();
};

export const run = (sql: string, params: SqlParams = []): RunResult => {
  const result = getDatabase().prepare(sql).run(...(bindParams(params) as [SQLInputValue, ...SQLInputValue[]]));

  return {
    changes: Number(result.changes),
    lastInsertRowid: result.lastInsertRowid,
  };
};

export const get = <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): T | undefined => {
  return getDatabase().prepare(sql).get(...(bindParams(params) as [SQLInputValue, ...SQLInputValue[]])) as T | undefined;
};

export const all = <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): T[] => {
  return getDatabase().prepare(sql).all(...(bindParams(params) as [SQLInputValue, ...SQLInputValue[]])) as T[];
};

export const getAllUsers = () => {
  return all('SELECT * FROM users ORDER BY created_at DESC');
};

export const getUserById = (id: number) => {
  return get('SELECT * FROM users WHERE id = ?', [id]);
};

export const createUser = (input: CreateUserInput) => {
  const create = transaction(() => {
    const result = run(
      `
        INSERT INTO users (name, password_hash, business_type, avatar_initials)
        VALUES (?, ?, ?, ?)
      `,
      [
        input.name,
        input.passwordHash,
        input.businessType ?? 'general',
        input.avatarInitials ?? input.name.slice(0, 2).toUpperCase(),
      ],
    );
    const userId = Number(result.lastInsertRowid);
    seedDefaultSettings(userId);
    return getUserById(userId);
  });

  return create();
};

export const updateUserPassword = (userId: number, passwordHash: string) => {
  return run('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?', [passwordHash, userId]);
};

export const updateUserSettings = (userId: number, input: UpdateUserInput) => {
  return run(
    `
      UPDATE users
      SET
        name = COALESCE(?, name),
        business_type = COALESCE(?, business_type),
        avatar_initials = COALESCE(?, avatar_initials),
        is_active = COALESCE(?, is_active),
        updated_at = datetime('now')
      WHERE id = ?
    `,
    [input.name, input.businessType, input.avatarInitials, input.isActive, userId],
  );
};

export const getProducts = (filter: ProductFilter) => {
  const clauses = ['p.user_id = ?'];
  const params: Array<string | number> = [filter.userId];

  if (!filter.includeArchived) {
    clauses.push('p.is_archived = 0');
  }

  if (filter.category) {
    clauses.push('p.category = ?');
    params.push(filter.category);
  }

  if (filter.search) {
    clauses.push('(p.name LIKE ? OR p.description LIKE ? OR CAST(p.id AS TEXT) LIKE ?)');
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }

  params.push(filter.limit ?? 50, filter.offset ?? 0);

  return all(
    `
      SELECT p.*, COALESCE(SUM(s.quantity), 0) AS total_quantity, COUNT(v.id) AS variant_count
      FROM products p
      LEFT JOIN product_variants v ON v.product_id = p.id
      LEFT JOIN stock s ON s.variant_id = v.id
      WHERE ${clauses.join(' AND ')}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `,
    params,
  );
};

export const getProductById = (productId: number) => {
  const product = get('SELECT * FROM products WHERE id = ?', [productId]);
  if (!product) {
    return undefined;
  }

  const variants = all(
    `
      SELECT v.*, COALESCE(s.quantity, 0) AS quantity
      FROM product_variants v
      LEFT JOIN stock s ON s.variant_id = v.id
      WHERE v.product_id = ?
      ORDER BY v.id ASC
    `,
    [productId],
  );

  return { ...product, variants };
};

export const createProduct = async (input: CreateProductInput) => {
  const variantInputs = input.variants?.length ? input.variants : [{ attributes: {}, initialQuantity: 0 }];
  const database = getDatabase();

  const insertProduct = transaction(() => {
    const result = run(
      `
        INSERT INTO products (
          user_id, name, category, description, cost_price, sell_price, unit, low_stock_threshold
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.name,
        input.category ?? 'other',
        input.description ?? '',
        input.costPrice ?? 0,
        input.sellPrice ?? 0,
        input.unit ?? 'piece',
        input.lowStockThreshold ?? 5,
      ],
    );

    const productId = Number(result.lastInsertRowid);
    const variantIds: number[] = [];

    for (const variantInput of variantInputs) {
      const attributes =
        'attributes' in variantInput && typeof variantInput.attributes === 'object'
          ? variantInput.attributes
          : (variantInput as Record<string, string>);
      const initialQuantity =
        'initialQuantity' in variantInput && typeof variantInput.initialQuantity === 'number'
          ? Math.max(0, variantInput.initialQuantity)
          : 0;
      const variant = run(
        `
          INSERT INTO product_variants (product_id, sku, attributes)
          VALUES (?, ?, ?)
        `,
        [productId, `PENDING-${productId}-${Date.now()}-${variantIds.length}`, JSON.stringify(attributes)],
      );
      const variantId = Number(variant.lastInsertRowid);
      const sku = skuFor(productId, variantId);
      run('UPDATE product_variants SET sku = ? WHERE id = ?', [sku, variantId]);
      run('INSERT INTO stock (variant_id, quantity) VALUES (?, ?)', [variantId, initialQuantity]);
      if (initialQuantity > 0) {
        run(
          `
            INSERT INTO stock_movements (
              variant_id, user_id, type, quantity_delta, quantity_before, quantity_after, note
            )
            VALUES (?, ?, 'restock', ?, 0, ?, 'Initial stock')
          `,
          [variantId, input.userId, initialQuantity, initialQuantity],
        );
      }
      variantIds.push(variantId);
    }

    return { productId, variantIds };
  });

  const { productId, variantIds } = insertProduct();
  for (const variantId of variantIds) {
    const sku = skuFor(productId, variantId);
    const qrCodeData = await qrFor(sku);
    run('UPDATE product_variants SET qr_code_data = ? WHERE id = ?', [qrCodeData, variantId]);
  }

  return getProductById(productId);
};

export const updateProduct = (productId: number, input: UpdateProductInput) => {
  return run(
    `
      UPDATE products
      SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        cost_price = COALESCE(?, cost_price),
        sell_price = COALESCE(?, sell_price),
        unit = COALESCE(?, unit),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        is_archived = COALESCE(?, is_archived),
        archived_reason = COALESCE(?, archived_reason),
        archived_at = CASE WHEN ? = 1 THEN datetime('now') ELSE archived_at END,
        updated_at = datetime('now')
      WHERE id = ?
    `,
    [
      input.name,
      input.category,
      input.description,
      input.costPrice,
      input.sellPrice,
      input.unit,
      input.lowStockThreshold,
      input.isArchived,
      input.archivedReason,
      input.isArchived,
      productId,
    ],
  );
};

export const deleteProduct = (productId: number, deletedBy: number, reason = '') => {
  const remove = transaction(() => {
    const snapshot = getProductById(productId);
    if (!snapshot) {
      return { changes: 0, lastInsertRowid: 0 };
    }

    run(
      'INSERT INTO archives (product_id, product_snapshot, deleted_by, reason) VALUES (?, ?, ?, ?)',
      [productId, JSON.stringify(snapshot), deletedBy, reason],
    );

    return run('DELETE FROM products WHERE id = ?', [productId]);
  });

  return remove();
};

export const getVariantBySku = (sku: string) => {
  return get(
    `
      SELECT v.*, p.name AS product_name, p.sell_price, COALESCE(s.quantity, 0) AS quantity
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      LEFT JOIN stock s ON s.variant_id = v.id
      WHERE v.sku = ?
    `,
    [sku],
  );
};

export const getVariantsByProduct = (productId: number) => {
  return all(
    `
      SELECT v.*, COALESCE(s.quantity, 0) AS quantity
      FROM product_variants v
      LEFT JOIN stock s ON s.variant_id = v.id
      WHERE v.product_id = ?
      ORDER BY v.id ASC
    `,
    [productId],
  );
};

export const addVariantQuantity = (variantId: number, userId: number, quantity: number, note = '') => {
  return applyStockMovement(variantId, userId, 'restock', Math.abs(quantity), undefined, note);
};

const applyStockMovement = (
  variantId: number,
  userId: number,
  type: StockMovementType,
  quantityDelta: number,
  buyerName?: string,
  note = '',
) => {
  const apply = transaction(() => {
    const stock = get<{ quantity: number }>('SELECT quantity FROM stock WHERE variant_id = ?', [variantId]);
    if (!stock) {
      throw new Error(`Stock row not found for variant ${variantId}`);
    }

    const quantityBefore = stock.quantity;
    const quantityAfter = quantityBefore + quantityDelta;
    if (quantityAfter < 0) {
      throw new Error('Stock quantity cannot go below zero');
    }

    run('UPDATE stock SET quantity = ?, updated_at = datetime(\'now\') WHERE variant_id = ?', [quantityAfter, variantId]);
    return run(
      `
        INSERT INTO stock_movements (
          variant_id, user_id, type, quantity_delta, quantity_before, quantity_after, buyer_name, note
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [variantId, userId, type, quantityDelta, quantityBefore, quantityAfter, buyerName, note],
    );
  });

  return apply();
};

export const recordSale = (input: RecordSaleInput) => {
  const quantity = input.quantity ?? 1;

  const record = transaction(() => {
    const variant = get<{ sell_price: number }>(
      `
        SELECT p.sell_price
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ?
      `,
      [input.variantId],
    );

    if (!variant) {
      throw new Error(`Variant ${input.variantId} not found`);
    }

    const unitPrice = variant.sell_price;
    const total = unitPrice * quantity;
    const sale = run(
      `
        INSERT INTO sales (variant_id, user_id, quantity, unit_price, total, buyer_name)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [input.variantId, input.userId, quantity, unitPrice, total, input.buyerName],
    );

    const stock = get<{ quantity: number }>('SELECT quantity FROM stock WHERE variant_id = ?', [input.variantId]);
    if (!stock) {
      throw new Error(`Stock row not found for variant ${input.variantId}`);
    }
    const quantityBefore = stock.quantity;
    const quantityAfter = quantityBefore - quantity;
    run('UPDATE stock SET quantity = ?, updated_at = datetime(\'now\') WHERE variant_id = ?', [quantityAfter, input.variantId]);
    run(
      `
        INSERT INTO stock_movements (
          variant_id, user_id, type, quantity_delta, quantity_before, quantity_after, buyer_name, note
        )
        VALUES (?, ?, 'sale', ?, ?, ?, ?, ?)
      `,
      [input.variantId, input.userId, -quantity, quantityBefore, quantityAfter, input.buyerName, input.note ?? ''],
    );

    if (input.buyerName?.trim()) {
      run(
        `
          INSERT INTO buyers (user_id, name, total_purchases, total_spent, last_purchase)
          VALUES (?, ?, 1, ?, datetime('now'))
          ON CONFLICT(user_id, name) DO UPDATE SET
            total_purchases = total_purchases + 1,
            total_spent = total_spent + excluded.total_spent,
            last_purchase = datetime('now')
        `,
        [input.userId, input.buyerName.trim(), total],
      );
    }

    return get('SELECT * FROM sales WHERE id = ?', [sale.lastInsertRowid]);
  });

  return record();
};

export const getRecentSales = (limit = 20) => {
  return all(
    `
      SELECT
        s.*,
        p.id AS product_id,
        p.name AS product_name,
        p.cost_price,
        v.sku,
        v.attributes
      FROM sales s
      JOIN product_variants v ON v.id = s.variant_id
      JOIN products p ON p.id = v.product_id
      ORDER BY s.sold_at DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const getSalesByRange = (from: string, to: string) => {
  return all('SELECT * FROM sales WHERE sold_at BETWEEN ? AND ? ORDER BY sold_at DESC', [from, to]);
};

export const getAllStock = () => {
  return all(`
    SELECT
      v.id AS variant_id,
      p.id AS product_id,
      p.name AS product_name,
      p.category,
      v.sku,
      v.attributes,
      v.qr_code_data,
      COALESCE(s.quantity, 0) AS quantity,
      p.low_stock_threshold,
      p.cost_price,
      p.sell_price
      ,s.updated_at AS last_updated
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN stock s ON s.variant_id = v.id
    WHERE p.is_archived = 0
    ORDER BY p.name ASC, v.id ASC
  `);
};

export const getLowStock = () => {
  return all(`
    SELECT
      v.id AS variant_id,
      p.id AS product_id,
      p.name AS product_name,
      p.category,
      v.sku,
      v.attributes,
      v.qr_code_data,
      COALESCE(s.quantity, 0) AS quantity,
      p.low_stock_threshold,
      p.cost_price,
      p.sell_price,
      s.updated_at AS last_updated
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    LEFT JOIN stock s ON s.variant_id = v.id
    WHERE p.is_archived = 0 AND COALESCE(s.quantity, 0) <= p.low_stock_threshold
    ORDER BY s.quantity ASC
  `);
};

export const getDailySummary = (from?: string, to?: string) => {
  return summaryBy("strftime('%Y-%m-%d', sold_at)", from, to);
};

export const getWeeklySummary = (from?: string, to?: string) => {
  return summaryBy("strftime('%Y-W%W', sold_at)", from, to);
};

const summaryBy = (periodExpression: string, from?: string, to?: string) => {
  const params: string[] = [];
  const where = from && to ? 'WHERE sold_at BETWEEN ? AND ?' : '';
  if (from && to) {
    params.push(from, to);
  }

  return all(
    `
      SELECT
        ${periodExpression} AS period,
        COUNT(s.id) AS sale_count,
        COUNT(DISTINCT v.product_id) AS unique_products,
        COALESCE(SUM(s.quantity), 0) AS quantity,
        COALESCE(SUM(s.total), 0) AS total,
        COALESCE(SUM((s.unit_price - p.cost_price) * s.quantity), 0) AS profit,
        COALESCE(SUM(p.cost_price * s.quantity), 0) AS cost
      FROM sales s
      JOIN product_variants v ON v.id = s.variant_id
      JOIN products p ON p.id = v.product_id
      ${where}
      GROUP BY period
      ORDER BY period DESC
    `,
    params,
  );
};

export const getTopProducts = (limit = 10) => {
  return all(
    `
      SELECT p.id, p.name, SUM(s.quantity) AS quantity_sold, SUM(s.total) AS total
      FROM sales s
      JOIN product_variants v ON v.id = s.variant_id
      JOIN products p ON p.id = v.product_id
      GROUP BY p.id
      ORDER BY quantity_sold DESC
      LIMIT ?
    `,
    [limit],
  );
};

export const getTopBuyers = (limit = 10) => {
  return all('SELECT * FROM buyers ORDER BY total_spent DESC LIMIT ?', [limit]);
};

export const getSummaryByRange = (userId: number, startDate: string, endDate: string) => {
  return all(
    `
      SELECT
        DATE(s.sold_at) as day,
        COUNT(*) as total_sales,
        COALESCE(SUM(s.quantity), 0) as total_units,
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(SUM(s.total - (s.quantity * p.cost_price)), 0) as profit,
        COUNT(DISTINCT p.id) as unique_products
      FROM sales s
      JOIN product_variants v ON s.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE s.user_id = ? AND s.sold_at BETWEEN ? AND ?
      GROUP BY day
      ORDER BY day ASC
    `,
    [userId, startDate, endDate],
  );
};

export const getHourlyPattern = (userId: number, startDate: string, endDate: string) => {
  return all(
    `
      SELECT CAST(strftime('%H', sold_at) AS INTEGER) as hour, COUNT(*) as sales_count
      FROM sales
      WHERE user_id = ? AND sold_at BETWEEN ? AND ?
      GROUP BY hour
      ORDER BY hour ASC
    `,
    [userId, startDate, endDate],
  );
};

export const getCategoryBreakdown = (userId: number, startDate: string, endDate: string) => {
  return all(
    `
      SELECT p.category, COUNT(*) as sales_count, COALESCE(SUM(s.total), 0) as revenue, COALESCE(SUM(s.quantity), 0) as units
      FROM sales s
      JOIN product_variants v ON s.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE p.user_id = ? AND s.sold_at BETWEEN ? AND ?
      GROUP BY p.category
      ORDER BY revenue DESC
    `,
    [userId, startDate, endDate],
  );
};

export const getPeriodComparison = (
  userId: number,
  currentStart: string,
  currentEnd: string,
  prevStart: string,
  prevEnd: string,
) => {
  const current = getSummaryByRange(userId, currentStart, currentEnd);
  const previous = getSummaryByRange(userId, prevStart, prevEnd);
  return { current, previous };
};

export const getSalesLogByRange = (userId: number, startDate: string, endDate: string) => {
  return all(
    `
      SELECT
        s.*,
        p.name AS product_name,
        v.attributes,
        v.sku
      FROM sales s
      JOIN product_variants v ON s.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE s.user_id = ? AND s.sold_at BETWEEN ? AND ?
      ORDER BY s.sold_at DESC
    `,
    [userId, startDate, endDate],
  );
};

const economyDateClause = (alias: string, startDate?: string, endDate?: string) => {
  return startDate && endDate ? `AND ${alias}.sold_at BETWEEN ? AND ?` : '';
};

const economyParams = (userId: number, limitOrStart?: number | string, startOrEnd?: string, maybeEnd?: string) => {
  if (typeof limitOrStart === 'number') {
    return startOrEnd && maybeEnd ? [userId, startOrEnd, maybeEnd, limitOrStart] : [userId, limitOrStart];
  }
  return limitOrStart && startOrEnd ? [userId, limitOrStart, startOrEnd] : [userId];
};

export const getEconomyTopProducts = (userId: number, limit = 20, startDate?: string, endDate?: string) => {
  return all(
    `
      SELECT
        p.id, p.name, p.category, p.sell_price, p.cost_price,
        COALESCE(SUM(s.quantity), 0) as units_sold,
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(SUM(s.total - (s.quantity * p.cost_price)), 0) as profit,
        COUNT(DISTINCT s.id) as transaction_count
      FROM sales s
      JOIN product_variants v ON s.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE p.user_id = ? ${economyDateClause('s', startDate, endDate)}
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT ?
    `,
    economyParams(userId, limit, startDate, endDate),
  );
};

export const getEconomyTopBuyers = (userId: number, limit = 20, startDate?: string, endDate?: string) => {
  if (startDate && endDate) {
    return all(
      `
        SELECT
          b.id, b.name,
          COUNT(s.id) as total_purchases,
          COALESCE(SUM(s.total), 0) as total_spent,
          MAX(s.sold_at) as last_purchase,
          COALESCE(SUM(s.total) / NULLIF(COUNT(s.id), 0), 0) as avg_order_value
        FROM sales s
        JOIN buyers b ON b.user_id = s.user_id AND b.name = s.buyer_name
        WHERE s.user_id = ? AND s.buyer_name IS NOT NULL AND s.sold_at BETWEEN ? AND ?
        GROUP BY b.id, b.name
        ORDER BY total_spent DESC
        LIMIT ?
      `,
      [userId, startDate, endDate, limit],
    );
  }

  return all(
    `
      SELECT
        id, name, total_purchases, total_spent, last_purchase,
        (total_spent / NULLIF(total_purchases, 0)) as avg_order_value
      FROM buyers
      WHERE user_id = ?
      ORDER BY total_spent DESC
      LIMIT ?
    `,
    [userId, limit],
  );
};

export const getEconomyCategoryPerformance = (userId: number, startDate?: string, endDate?: string) => {
  return all(
    `
      SELECT
        p.category,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(s.quantity), 0) as units_sold,
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(SUM(s.total - (s.quantity * p.cost_price)), 0) as profit,
        COALESCE(AVG(p.sell_price - p.cost_price), 0) as avg_margin
      FROM sales s
      JOIN product_variants v ON s.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE p.user_id = ? ${economyDateClause('s', startDate, endDate)}
      GROUP BY p.category
      ORDER BY revenue DESC
    `,
    economyParams(userId, startDate, endDate),
  );
};

export const getEconomySlowMovers = (userId: number, dayThreshold = 30) => {
  return all(
    `
      SELECT
        p.id, p.name, p.category,
        MAX(s.sold_at) as last_sale,
        COALESCE(SUM(st.quantity), 0) as current_stock,
        COALESCE(SUM(st.quantity * p.cost_price), 0) as tied_capital
      FROM products p
      JOIN product_variants v ON p.id = v.product_id
      JOIN stock st ON v.id = st.variant_id
      LEFT JOIN sales s ON v.id = s.variant_id
      WHERE p.user_id = ? AND p.is_archived = 0
      GROUP BY p.id
      HAVING current_stock > 0 AND (last_sale IS NULL OR last_sale < datetime('now', ?))
      ORDER BY tied_capital DESC
    `,
    [userId, `-${dayThreshold} days`],
  );
};

export const getEconomyProfitableVariants = (userId: number) => {
  return all(
    `
      SELECT
        v.id as variant_id, v.sku, v.attributes,
        p.id as product_id, p.name, p.category, p.sell_price, p.cost_price,
        CASE WHEN p.cost_price = 0 THEN 0 ELSE ((p.sell_price - p.cost_price) / p.cost_price) * 100 END as margin_percent,
        (p.sell_price - p.cost_price) as profit_per_unit
      FROM product_variants v
      JOIN products p ON v.product_id = p.id
      WHERE p.user_id = ? AND p.is_archived = 0
      ORDER BY margin_percent DESC
    `,
    [userId],
  );
};

export const getArchives = (userId?: number, limit = 50, offset = 0, query = '', from?: string, to?: string) => {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (userId) {
    clauses.push("(json_extract(a.product_snapshot, '$.user_id') = ? OR json_extract(a.product_snapshot, '$.userId') = ?)");
    params.push(userId, userId);
  }
  if (query) {
    clauses.push('a.product_snapshot LIKE ?');
    params.push(`%${query}%`);
  }
  if (from) {
    clauses.push('a.archived_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('a.archived_at <= ?');
    params.push(to);
  }

  params.push(limit, offset);

  return all(
    `
      SELECT
        a.id,
        a.product_id,
        a.product_snapshot,
        a.reason,
        a.archived_at,
        u.name as deleted_by_name
      FROM archives a
      JOIN users u ON a.deleted_by = u.id
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY a.archived_at DESC
      LIMIT ? OFFSET ?
    `,
    params,
  );
};

export const getArchiveCount = (userId: number, query = '', from?: string, to?: string) => {
  const clauses = ["(json_extract(product_snapshot, '$.user_id') = ? OR json_extract(product_snapshot, '$.userId') = ?)"];
  const params: Array<string | number> = [userId, userId];
  if (query) {
    clauses.push('product_snapshot LIKE ?');
    params.push(`%${query}%`);
  }
  if (from) {
    clauses.push('archived_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('archived_at <= ?');
    params.push(to);
  }
  return get<{ total: number }>(`SELECT COUNT(*) as total FROM archives WHERE ${clauses.join(' AND ')}`, params);
};

export const restoreArchive = async (archiveId: number) => {
  const archive = get<{ product_snapshot: string }>('SELECT product_snapshot FROM archives WHERE id = ?', [archiveId]);
  if (!archive) {
    return undefined;
  }

  const snapshot = JSON.parse(archive.product_snapshot) as {
    user_id?: number;
    userId?: number;
    name: string;
    category: string;
    description?: string;
    cost_price?: number;
    sell_price?: number;
    unit?: string;
    low_stock_threshold?: number;
    variants?: Array<{ attributes: string | Record<string, string> }>;
  };

  const created = await createProduct({
    userId: Number(snapshot.user_id ?? snapshot.userId),
    name: snapshot.name,
    category: snapshot.category,
    description: snapshot.description ?? '',
    costPrice: snapshot.cost_price ?? 0,
    sellPrice: snapshot.sell_price ?? 0,
    unit: snapshot.unit ?? 'piece',
    lowStockThreshold: snapshot.low_stock_threshold ?? 5,
    variants: (snapshot.variants?.length ? snapshot.variants : [{ attributes: {} }]).map((variant) => ({
      attributes: typeof variant.attributes === 'string' ? JSON.parse(variant.attributes || '{}') : variant.attributes,
      initialQuantity: 0,
    })),
  });

  run('DELETE FROM archives WHERE id = ?', [archiveId]);
  return created;
};

export const getSetting = (userId: number, key: string) => {
  return get('SELECT value FROM app_settings WHERE user_id = ? AND key = ?', [userId, key]);
};

export const getAllSettings = (userId: number) => {
  seedDefaultSettings(userId);
  return all('SELECT key, value FROM app_settings WHERE user_id = ? ORDER BY key', [userId]);
};

export const setSetting = (userId: number, key: string, value: string) => {
  return run(
    `
      INSERT INTO app_settings (user_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `,
    [userId, key, value],
  );
};

export const getProfileStats = (userId: number) => {
  return get(
    `
      SELECT
        (SELECT COUNT(*) FROM products WHERE user_id = ? AND is_archived = 0) AS products,
        (SELECT COUNT(*) FROM sales WHERE user_id = ?) AS total_sales,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE user_id = ?) AS total_revenue
    `,
    [userId, userId, userId],
  );
};

export const getCategoryTemplates = () => {
  return all('SELECT * FROM category_templates ORDER BY name ASC');
};

export const getStockMovements = (variantId: number) => {
  return all(
    `
      SELECT *
      FROM stock_movements
      WHERE variant_id = ?
      ORDER BY created_at DESC
    `,
    [variantId],
  );
};
