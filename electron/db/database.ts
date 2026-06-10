import { app } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { categoryTemplateSeeds, defaultSettings, migrations } from './migrations';

export type SqlParams = unknown[] | Record<string, unknown>;
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

let db: Database.Database | null = null;

const getDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const dbPath = join(app.getPath('userData'), 'stockflow.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const migrate = db.transaction(() => {
    for (const migration of migrations) {
      db?.exec(migration);
    }

    seedCategoryTemplates();
  });

  migrate();

  return db;
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

export const getAllUsers = () => {
  return all('SELECT * FROM users ORDER BY created_at DESC');
};

export const getUserById = (id: number) => {
  return get('SELECT * FROM users WHERE id = ?', [id]);
};

export const createUser = (input: CreateUserInput) => {
  const create = getDatabase().transaction(() => {
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

  const insertProduct = database.transaction(() => {
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
  const remove = getDatabase().transaction(() => {
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
  const apply = getDatabase().transaction(() => {
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

  const record = getDatabase().transaction(() => {
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

export const getArchives = (limit = 50, offset = 0) => {
  return all('SELECT * FROM archives ORDER BY archived_at DESC LIMIT ? OFFSET ?', [limit, offset]);
};

export const restoreArchive = (archiveId: number) => {
  return get('SELECT * FROM archives WHERE id = ?', [archiveId]);
};

export const getSetting = (userId: number, key: string) => {
  return get('SELECT value FROM app_settings WHERE user_id = ? AND key = ?', [userId, key]);
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
