import { useCallback, useEffect, useState } from 'react';
import type { ProductRow, VariantRow } from '@/utils/productUtils';

export const useProduct = (id: number | null) => {
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const row = (await window.api.db.products.getById(id)) as (ProductRow & { variants: VariantRow[] }) | undefined;
      setProduct(row ?? null);
      setVariants(row?.variants ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { product, variants, isLoading, refetch };
};
