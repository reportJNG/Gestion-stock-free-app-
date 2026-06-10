import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import type { SaleVariant } from './useSaleLookup';

export interface SaleResult {
  variant: SaleVariant;
  quantity: number;
  total: number;
  buyerName: string;
  newStock: number;
}

export const useRecordSale = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);

  const record = async (variant: SaleVariant, quantity: number, buyerName: string, note: string) => {
    if (!user) return null;
    setIsLoading(true);
    try {
      await window.api.db.sales.record({
        variantId: variant.id,
        userId: user.id,
        quantity,
        buyerName: buyerName.trim() || undefined,
        note,
      });
      const saleResult = {
        variant,
        quantity,
        total: quantity * variant.sellPrice,
        buyerName: buyerName.trim() || 'Anonymous',
        newStock: variant.quantity - quantity,
      };
      setResult(saleResult);
      return saleResult;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => setResult(null);

  return { record, isLoading, result, reset };
};
