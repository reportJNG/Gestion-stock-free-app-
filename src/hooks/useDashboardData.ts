import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';

interface ProductRow {
  id: number;
}

interface StockRow {
  variant_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  attributes: string;
  quantity: number;
  low_stock_threshold: number;
  sell_price: number;
}

interface SaleRow {
  id: number;
  variant_id: number;
  user_id: number;
  quantity: number;
  unit_price: number;
  total: number;
  buyer_name: string | null;
  sold_at: string;
  product_id?: number;
  product_name?: string;
  cost_price?: number;
  sku?: string;
  attributes?: string;
}

interface SummaryRow {
  period: string;
  sale_count: number;
  unique_products: number;
  quantity: number;
  total: number;
  profit: number;
  cost: number;
}

export interface DashboardStockItem {
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  attributes: Record<string, string>;
  quantity: number;
  lowStockThreshold: number;
  sellPrice: number;
}

export interface DashboardSale {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  attributes: Record<string, string>;
  buyerName: string | null;
  quantity: number;
  total: number;
  type: 'sale';
  soldAt: string;
}

export interface WeeklyRevenuePoint {
  date: string;
  label: string;
  revenue: number;
}

export interface DashboardStats {
  revenueToday: number;
  revenueDeltaPercent: number | null;
  profitToday: number;
  marginPercent: number | null;
  itemsInStock: number;
  lowStockCount: number;
  salesToday: number;
  uniqueProductsSoldToday: number;
  totalProducts: number;
}

const parseAttributes = (value?: string): Record<string, string> => {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const dayStart = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const dayEnd = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const formatSqlDate = (date: Date) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

const formatDayLabel = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
};

const mapStock = (row: StockRow): DashboardStockItem => ({
  variantId: row.variant_id,
  productId: row.product_id,
  productName: row.product_name,
  sku: row.sku,
  attributes: parseAttributes(row.attributes),
  quantity: row.quantity,
  lowStockThreshold: row.low_stock_threshold,
  sellPrice: row.sell_price,
});

const mapSale = (row: SaleRow): DashboardSale => ({
  id: row.id,
  variantId: row.variant_id,
  productId: row.product_id ?? 0,
  productName: row.product_name ?? 'Unknown product',
  sku: row.sku ?? '',
  attributes: parseAttributes(row.attributes),
  buyerName: row.buyer_name,
  quantity: row.quantity,
  total: row.total,
  type: 'sale',
  soldAt: row.sold_at,
});

const emptyStats: DashboardStats = {
  revenueToday: 0,
  revenueDeltaPercent: null,
  profitToday: 0,
  marginPercent: null,
  itemsInStock: 0,
  lowStockCount: 0,
  salesToday: 0,
  uniqueProductsSoldToday: 0,
  totalProducts: 0,
};

export const useDashboardData = (user: User | null) => {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [lowStock, setLowStock] = useState<DashboardStockItem[]>([]);
  const [recentSales, setRecentSales] = useState<DashboardSale[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenuePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastSevenDays = useMemo(() => {
    const today = dayStart(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return date;
    });
  }, []);

  const refetch = useCallback(
    async (manual = false) => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      if (manual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const weekStart = lastSevenDays[0];

      try {
        const [lowRows, saleRows, dailyRows, weeklyRows, products, stockRows] = await Promise.all([
          window.api.db.stock.getLow() as Promise<StockRow[]>,
          window.api.db.sales.getRecent(10) as Promise<SaleRow[]>,
          window.api.db.reports.dailySummary(formatSqlDate(dayStart(yesterday)), formatSqlDate(dayEnd(today))) as Promise<SummaryRow[]>,
          window.api.db.reports.dailySummary(formatSqlDate(dayStart(weekStart)), formatSqlDate(dayEnd(today))) as Promise<SummaryRow[]>,
          window.api.db.products.getAll({ userId: user.id, limit: 100000, offset: 0 }) as Promise<ProductRow[]>,
          window.api.db.stock.getAll() as Promise<StockRow[]>,
        ]);

        const todayKey = toDateKey(today);
        const yesterdayKey = toDateKey(yesterday);
        const todaySummary = dailyRows.find((row) => row.period === todayKey);
        const yesterdaySummary = dailyRows.find((row) => row.period === yesterdayKey);
        const todayRevenue = todaySummary?.total ?? 0;
        const yesterdayRevenue = yesterdaySummary?.total ?? 0;
        const revenueDeltaPercent =
          yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : todayRevenue > 0 ? 100 : null;
        const profitToday = todaySummary?.profit ?? 0;
        const marginPercent = todayRevenue > 0 ? (profitToday / todayRevenue) * 100 : null;
        const weeklyByPeriod = new Map(weeklyRows.map((row) => [row.period, row]));

        setStats({
          revenueToday: todayRevenue,
          revenueDeltaPercent,
          profitToday,
          marginPercent,
          itemsInStock: stockRows.filter((row) => row.quantity > 0).length,
          lowStockCount: lowRows.length,
          salesToday: todaySummary?.sale_count ?? 0,
          uniqueProductsSoldToday: todaySummary?.unique_products ?? 0,
          totalProducts: products.length,
        });
        setLowStock(lowRows.map(mapStock));
        setRecentSales(saleRows.map(mapSale));
        setWeeklyRevenue(
          lastSevenDays.map((date) => {
            const period = toDateKey(date);
            return {
              date: period,
              label: formatDayLabel(date),
              revenue: weeklyByPeriod.get(period)?.total ?? 0,
            };
          }),
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [lastSevenDays, user],
  );

  useEffect(() => {
    void refetch(false);
  }, [refetch]);

  return { stats, lowStock, recentSales, weeklyRevenue, isLoading, isRefreshing, refetch };
};
