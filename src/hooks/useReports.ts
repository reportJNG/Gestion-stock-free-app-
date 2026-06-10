import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import { previousRange, type DateRange } from './useDateRange';

export interface SummaryRow {
  day: string;
  total_sales: number;
  total_units: number;
  revenue: number;
  profit: number;
  unique_products: number;
}

export interface HourRow {
  hour: number;
  sales_count: number;
}

export interface CategoryRow {
  category: string;
  sales_count: number;
  revenue: number;
  units: number;
}

export interface SalesLogRow {
  id: number;
  sold_at: string;
  product_name: string;
  attributes: string;
  quantity: number;
  unit_price: number;
  total: number;
  buyer_name: string | null;
}

export const useReports = (range: DateRange) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [hourly, setHourly] = useState<HourRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [comparison, setComparison] = useState<{ current: SummaryRow[]; previous: SummaryRow[] }>({ current: [], previous: [] });
  const [salesLog, setSalesLog] = useState<SalesLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const prev = previousRange(range);
    try {
      const [summaryRows, hourlyRows, categoryRows, comparisonRows, logRows] = await Promise.all([
        window.api.db.reports.summaryByRange(user.id, range.start, range.end) as Promise<SummaryRow[]>,
        window.api.db.reports.hourlyPattern(user.id, range.start, range.end) as Promise<HourRow[]>,
        window.api.db.reports.categoryBreakdown(user.id, range.start, range.end) as Promise<CategoryRow[]>,
        window.api.db.reports.periodComparison(user.id, range.start, range.end, prev.start, prev.end) as Promise<{ current: SummaryRow[]; previous: SummaryRow[] }>,
        window.api.db.reports.salesLog(user.id, range.start, range.end) as Promise<SalesLogRow[]>,
      ]);
      setSummary(summaryRows);
      setHourly(hourlyRows);
      setCategories(categoryRows);
      setComparison(comparisonRows);
      setSalesLog(logRows);
    } finally {
      setIsLoading(false);
    }
  }, [range.end, range.start, user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { summary, hourly, categories, comparison, salesLog, isLoading, refetch };
};
