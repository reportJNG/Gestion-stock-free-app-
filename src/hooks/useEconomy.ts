import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { sqlDate } from './useDateRange';

export type EconomyPeriod = 'all' | 'month' | 'year';

export interface EconomyTopProduct {
  id: number;
  name: string;
  category: string;
  sell_price: number;
  cost_price: number;
  units_sold: number;
  revenue: number;
  profit: number;
  transaction_count: number;
}

export interface EconomyBuyer {
  id: number;
  name: string;
  total_purchases: number;
  total_spent: number;
  last_purchase: string | null;
  avg_order_value: number;
}

export interface EconomyCategory {
  category: string;
  product_count: number;
  units_sold: number;
  revenue: number;
  profit: number;
  avg_margin: number;
}

export interface SlowMover {
  id: number;
  name: string;
  category: string;
  last_sale: string | null;
  current_stock: number;
  tied_capital: number;
}

export interface MarginVariant {
  variant_id: number;
  sku: string;
  attributes: string;
  product_id: number;
  name: string;
  category: string;
  sell_price: number;
  cost_price: number;
  margin_percent: number;
  profit_per_unit: number;
}

const rangeFor = (period: EconomyPeriod) => {
  if (period === 'all') return {};
  const now = new Date();
  const start = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);
  now.setHours(23, 59, 59, 999);
  return { start: sqlDate(start), end: sqlDate(now) };
};

export const useEconomy = (period: EconomyPeriod) => {
  const { user } = useAuth();
  const [topProducts, setTopProducts] = useState<EconomyTopProduct[]>([]);
  const [topBuyers, setTopBuyers] = useState<EconomyBuyer[]>([]);
  const [categories, setCategories] = useState<EconomyCategory[]>([]);
  const [slowMovers, setSlowMovers] = useState<SlowMover[]>([]);
  const [margins, setMargins] = useState<MarginVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const range = useMemo(() => rangeFor(period), [period]);

  const refetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [products, buyers, categoryRows, slow, marginRows] = await Promise.all([
        window.api.economy.topProducts(user.id, 20, range.start, range.end) as Promise<EconomyTopProduct[]>,
        window.api.economy.topBuyers(user.id, 20, range.start, range.end) as Promise<EconomyBuyer[]>,
        window.api.economy.categoryPerformance(user.id, range.start, range.end) as Promise<EconomyCategory[]>,
        window.api.economy.slowMovers(user.id, 30) as Promise<SlowMover[]>,
        window.api.economy.profitableVariants(user.id) as Promise<MarginVariant[]>,
      ]);
      setTopProducts(products);
      setTopBuyers(buyers);
      setCategories(categoryRows);
      setSlowMovers(slow);
      setMargins(marginRows);
    } finally {
      setIsLoading(false);
    }
  }, [range.end, range.start, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { topProducts, topBuyers, categories, slowMovers, margins, isLoading, refetch };
};
