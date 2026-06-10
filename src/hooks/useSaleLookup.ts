import { useCallback, useState } from 'react';
import { parseAttributes } from '@/utils/productUtils';

export interface SaleVariant {
  id: number;
  productId: number;
  sku: string;
  productName: string;
  category: string;
  attributes: Record<string, string>;
  quantity: number;
  lowStockThreshold: number;
  sellPrice: number;
}

interface VariantSkuRow {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  category: string;
  attributes: string;
  quantity: number;
  low_stock_threshold: number;
  sell_price: number;
}

const mapVariant = (row: VariantSkuRow): SaleVariant => ({
  id: row.id,
  productId: row.product_id,
  sku: row.sku,
  productName: row.product_name,
  category: row.category,
  attributes: parseAttributes(row.attributes),
  quantity: row.quantity,
  lowStockThreshold: row.low_stock_threshold,
  sellPrice: row.sell_price,
});

export const useSaleLookup = () => {
  const [variant, setVariant] = useState<SaleVariant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFoundSku, setNotFoundSku] = useState('');

  const lookup = useCallback(async (sku: string) => {
    const clean = sku.trim();
    if (!clean) return null;
    setIsLoading(true);
    setError('');
    setNotFoundSku('');
    try {
      const row = (await window.api.db.variants.getBySku(clean)) as VariantSkuRow | undefined;
      if (!row) {
        setVariant(null);
        setNotFoundSku(clean);
        setError('Item not found');
        return null;
      }
      const next = mapVariant(row);
      setVariant(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = () => {
    setVariant(null);
    setError('');
    setNotFoundSku('');
  };

  return { variant, isLoading, error, notFoundSku, lookup, setVariant, reset };
};
