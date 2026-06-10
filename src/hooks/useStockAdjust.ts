import { useState } from 'react';
import { useAuth } from '@/store/AuthContext';
import type { StockRow } from './useStock';

export const useStockAdjust = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const adjust = async (row: StockRow, delta: number, note: string) => {
    if (!user) return false;
    setError('');
    const next = row.quantity + delta;
    if (next < 0) {
      setError('Quantity cannot go below 0.');
      return false;
    }
    setIsLoading(true);
    try {
      if (delta > 0) {
        await window.api.db.variants.addQty(row.variantId, user.id, delta, note);
      } else {
        await window.api.db.run('UPDATE stock SET quantity = ?, updated_at = datetime(\'now\') WHERE variant_id = ?', [next, row.variantId]);
        await window.api.db.run('UPDATE product_variants SET created_at = created_at WHERE id = ?', [row.variantId]);
        await window.api.db.run(
          `INSERT INTO stock_movements (variant_id, user_id, type, quantity_delta, quantity_before, quantity_after, note)
           VALUES (?, ?, 'adjustment', ?, ?, ?, ?)`,
          [row.variantId, user.id, delta, row.quantity, next, note],
        );
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  return { adjust, isLoading, error };
};
