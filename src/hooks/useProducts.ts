import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import type { ProductRow } from '@/utils/productUtils';

export type ProductSort = 'newest' | 'name' | 'price-asc' | 'price-desc';

export const useProducts = (search: string, category: string, sort: ProductSort) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 18;

  const refetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const rows = (await window.api.db.products.getAll({
        userId: user.id,
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        limit: 100000,
        offset: 0,
      })) as ProductRow[];
      setProducts(rows);
    } finally {
      setIsLoading(false);
    }
  }, [category, search, user]);

  useEffect(() => {
    setPage(1);
    void refetch();
  }, [refetch]);

  const sorted = useMemo(() => {
    return [...products].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'price-asc') return a.sell_price - b.sell_price;
      if (sort === 'price-desc') return b.sell_price - a.sell_price;
      return b.id - a.id;
    });
  }, [products, sort]);

  const pagedProducts = sorted.slice(0, page * pageSize);

  return { products: pagedProducts, isLoading, refetch, total: sorted.length, page, setPage, hasMore: pagedProducts.length < sorted.length };
};
