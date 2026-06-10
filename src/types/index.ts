import type { ElectronApi } from '../../electron/preload';

export interface User {
  id: number;
  name: string;
  businessType: string;
  avatarInitials: string;
  isActive: number;
  createdAt: string;
}

export interface AttributeDef {
  key: string;
  label?: string;
  type: 'multi' | 'text' | 'number' | 'date';
  options?: string[];
}

export interface CategoryTemplate {
  id: number;
  name: string;
  icon: string;
  attributes: AttributeDef[];
}

export interface Product {
  id: number;
  userId: number;
  name: string;
  category: string;
  description: string;
  costPrice: number;
  sellPrice: number;
  unit: string;
  lowStockThreshold: number;
  isArchived: number;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  attributes: Record<string, string>;
  qrCodeData: string;
  createdAt: string;
}

export interface StockItem {
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  attributes: Record<string, string>;
  quantity: number;
  lowStockThreshold: number;
  sellPrice: number;
}

export interface Sale {
  id: number;
  variantId: number;
  userId: number;
  quantity: number;
  unitPrice: number;
  total: number;
  buyerName: string | null;
  soldAt: string;
}

export interface StockMovement {
  id: number;
  variantId: number;
  userId: number;
  type: 'sale' | 'restock' | 'adjustment' | 'loss' | 'return';
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  buyerName: string | null;
  note: string;
  createdAt: string;
}

export interface Buyer {
  id: number;
  userId: number;
  name: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string | null;
}

export interface ArchiveRecord {
  id: number;
  productId: number;
  productSnapshot: string;
  deletedBy: number;
  reason: string;
  archivedAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface UserRow {
  id: number;
  name: string;
  password_hash?: string;
  business_type: string;
  avatar_initials: string;
  is_active: number;
  created_at: string;
  updated_at?: string;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
