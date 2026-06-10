export const migrations = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      password_hash   TEXT    NOT NULL,
      business_type   TEXT    NOT NULL DEFAULT 'general',
      avatar_initials TEXT    NOT NULL DEFAULT '',
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS category_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      icon        TEXT    NOT NULL DEFAULT 'package',
      attributes  TEXT    NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS products (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name                TEXT    NOT NULL,
      category            TEXT    NOT NULL DEFAULT 'other',
      description         TEXT    NOT NULL DEFAULT '',
      cost_price          REAL    NOT NULL DEFAULT 0,
      sell_price          REAL    NOT NULL DEFAULT 0,
      unit                TEXT    NOT NULL DEFAULT 'piece',
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      is_archived         INTEGER NOT NULL DEFAULT 0,
      archived_at         TEXT,
      archived_reason     TEXT    NOT NULL DEFAULT '',
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_archived ON products(is_archived);

    CREATE TABLE IF NOT EXISTS product_variants (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku          TEXT    NOT NULL UNIQUE,
      attributes   TEXT    NOT NULL DEFAULT '{}',
      qr_code_data TEXT    NOT NULL DEFAULT '',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

    CREATE TABLE IF NOT EXISTS stock (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE CASCADE,
      quantity   INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id      INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type            TEXT    NOT NULL,
      quantity_delta  INTEGER NOT NULL,
      quantity_before INTEGER NOT NULL,
      quantity_after  INTEGER NOT NULL,
      buyer_name      TEXT,
      note            TEXT    NOT NULL DEFAULT '',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_movements_variant ON stock_movements(variant_id);
    CREATE INDEX IF NOT EXISTS idx_movements_user ON stock_movements(user_id);
    CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(type);
    CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(created_at);

    CREATE TABLE IF NOT EXISTS sales (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quantity   INTEGER NOT NULL DEFAULT 1,
      unit_price REAL    NOT NULL,
      total      REAL    NOT NULL,
      buyer_name TEXT,
      sold_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sales_variant ON sales(variant_id);
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sold_at);
    CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sales(buyer_name);

    CREATE TABLE IF NOT EXISTS archives (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id       INTEGER NOT NULL,
      product_snapshot TEXT    NOT NULL,
      deleted_by       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason           TEXT    NOT NULL DEFAULT '',
      archived_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_archives_date ON archives(archived_at);

    CREATE TABLE IF NOT EXISTS app_settings (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key     TEXT    NOT NULL,
      value   TEXT    NOT NULL DEFAULT '',
      UNIQUE(user_id, key)
    );

    CREATE TABLE IF NOT EXISTS buyers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT    NOT NULL,
      total_purchases INTEGER NOT NULL DEFAULT 0,
      total_spent     REAL    NOT NULL DEFAULT 0,
      last_purchase   TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_buyers_user ON buyers(user_id);
    CREATE INDEX IF NOT EXISTS idx_buyers_spent ON buyers(total_spent DESC);
  `,
];

export const categoryTemplateSeeds = [
  ['clothing', 'shirt', '[{"key":"size","type":"multi","options":["XS","S","M","L","XL","XXL","XXXL"]},{"key":"color","type":"multi","options":[]}]'],
  ['shoes', 'footprints', '[{"key":"size","type":"multi","options":["35","36","37","38","39","40","41","42","43","44","45","46"]},{"key":"color","type":"multi","options":[]}]'],
  ['food', 'utensils', '[{"key":"expiry_date","type":"date"},{"key":"weight_g","type":"number"}]'],
  ['beverage', 'coffee', '[{"key":"volume_ml","type":"number"},{"key":"expiry_date","type":"date"}]'],
  ['electronics', 'cpu', '[{"key":"warranty_months","type":"number"},{"key":"brand","type":"text"}]'],
  ['cosmetics', 'sparkles', '[{"key":"expiry_date","type":"date"},{"key":"shade","type":"multi","options":[]}]'],
  ['pharmacy', 'pill', '[{"key":"expiry_date","type":"date"},{"key":"dosage","type":"text"}]'],
  ['furniture', 'armchair', '[{"key":"material","type":"text"},{"key":"color","type":"multi","options":[]}]'],
  ['books', 'book', '[{"key":"author","type":"text"},{"key":"isbn","type":"text"}]'],
  ['other', 'package', '[]'],
] as const;

export const defaultSettings = [
  ['currency', 'DZD'],
  ['language', 'en'],
  ['low_stock_alert', '1'],
  ['scan_auto_confirm', '0'],
  ['date_format', 'DD/MM/YYYY'],
] as const;
