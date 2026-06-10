import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseAttributes } from '@/utils/productUtils';

export type StockStatusFilter = 'all' | 'in' | 'low' | 'out';
export type StockSort = 'name' | 'high' | 'low' | 'updated';

export interface StockRow {
  variantId: number;
  sku: string;
  productId: number;
  productName: string;
  category: string;
  attributes: Record<string, string>;
  qrCodeData: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice: number;
  sellPrice: number;
  lastUpdated: string;
}

interface DbStockRow {
  variant_id: number;
  sku: string;
  product_id: number;
  product_name: string;
  category: string;
  attributes: string;
  qr_code_data: string;
  quantity: number;
  low_stock_threshold: number;
  cost_price: number;
  sell_price: number;
  last_updated: string;
}

const mapRow = (row: DbStockRow): StockRow => ({
  variantId: row.variant_id,
  sku: row.sku,
  productId: row.product_id,
  productName: row.product_name,
  category: row.category,
  attributes: parseAttributes(row.attributes),
  qrCodeData: row.qr_code_data,
  quantity: row.quantity,
  lowStockThreshold: row.low_stock_threshold,
  costPrice: row.cost_price,
  sellPrice: row.sell_price,
  lastUpdated: row.last_updated,
});

const statusOf = (row: StockRow): StockStatusFilter => {
  if (row.quantity === 0) return 'out';
  if (row.quantity <= row.lowStockThreshold) return 'low';
  return 'in';
};

export const useStock = (search: string, status: StockStatusFilter, category: string, sort: StockSort) => {
  const [allRows, setAllRows] = useState<StockRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const rows = (await window.api.db.stock.getAll()) as DbStockRow[];
      setAllRows(rows.map(mapRow));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    setPage(1);
  }, [search, status, category, sort]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return allRows
      .filter((row) => !query || row.productName.toLowerCase().includes(query) || row.sku.toLowerCase().includes(query))
      .filter((row) => status === 'all' || statusOf(row) === status)
      .filter((row) => category === 'all' || row.category === category)
      .sort((a, b) => {
        if (sort === 'high') return b.quantity - a.quantity;
        if (sort === 'low') return a.quantity - b.quantity;
        if (sort === 'updated') return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        return a.productName.localeCompare(b.productName);
      });
  }, [allRows, category, search, sort, status]);

  const totals = useMemo(
    () => ({
      in: allRows.filter((row) => statusOf(row) === 'in').length,
      low: allRows.filter((row) => statusOf(row) === 'low').length,
      out: allRows.filter((row) => statusOf(row) === 'out').length,
      total: allRows.length,
      products: new Set(allRows.map((row) => row.productId)).size,
    }),
    [allRows],
  );

  return {
    rows: filtered.slice(0, page * pageSize),
    allFilteredRows: filtered,
    isLoading,
    refetch,
    totals,
    page,
    setPage,
    hasMore: filtered.length > page * pageSize,
    categories: Array.from(new Set(allRows.map((row) => row.category))).sort(),
  };
};
