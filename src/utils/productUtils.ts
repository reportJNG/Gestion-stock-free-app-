import { Armchair, BookOpen, Coffee, Cpu, Package, Pill, Shirt, Sparkles, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export interface ProductRow {
  id: number;
  user_id: number;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  sell_price: number;
  unit: string;
  low_stock_threshold: number;
  is_archived: number;
  created_at: string;
  updated_at?: string;
  total_quantity?: number;
  variant_count?: number;
  variants?: VariantRow[];
}

export interface VariantRow {
  id: number;
  product_id: number;
  sku: string;
  attributes: string;
  qr_code_data: string;
  quantity: number;
  updated_at?: string;
  created_at: string;
}

export const categoryIcons: Record<string, LucideIcon> = {
  clothing: Shirt,
  shoes: Package,
  food: UtensilsCrossed,
  beverage: Coffee,
  electronics: Cpu,
  cosmetics: Sparkles,
  pharmacy: Pill,
  furniture: Armchair,
  books: BookOpen,
  general: Package,
  other: Package,
};

export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(value || 0);

export const margin = (cost: number, sell: number) => {
  if (!sell) return 0;
  return ((sell - cost) / sell) * 100;
};

export const parseAttributes = (value?: string): Record<string, string> => {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
};

export const attributeText = (attributes: Record<string, string>) => {
  const entries = Object.entries(attributes).filter(([, value]) => Boolean(value));
  return entries.length ? entries.map(([key, value]) => `${key}: ${value}`).join(', ') : 'Default';
};

export const variantLabel = (attributes: Record<string, string>) => {
  const values = Object.values(attributes).filter(Boolean);
  return values.length ? values.join(' / ') : 'Default';
};

export const stockStatus = (quantity: number, threshold: number) => {
  if (quantity <= 0) return { label: 'Out of Stock', variant: 'danger' as const };
  if (quantity <= threshold) return { label: 'Low Stock', variant: 'warn' as const };
  return { label: 'In Stock', variant: 'ok' as const };
};
