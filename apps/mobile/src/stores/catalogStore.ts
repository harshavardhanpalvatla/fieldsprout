import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProductVariant {
  id: string;       // variantId — this is what the orders API needs
  sku: string;
  unit: string;
  price: number;
  isActive?: boolean;
  availableQty?: number;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  imageUrl?: string;
  variants: ProductVariant[];
}

export interface Distributor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  state?: string;
  assignedRepId?: string;
  totalDues?: number;
  lastOrders?: Order[];
}

export interface Order {
  id: string;
  repId?: string;
  distributorId: string;
  warehouseId?: string;
  status: 'draft' | 'submitted' | 'approved' | 'dispatched' | 'delivered' | 'rejected';
  totalAmount: string | number;  // Prisma Decimal comes as string from API
  rejectionReason?: string;
  approvedBy?: string;
  dispatchedBy?: string;
  submittedAt?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  // Nested relations from API
  distributor?: { id: string; name: string; phone?: string };
  rep?: { id: string; name: string };
  _count?: { items: number };
  items?: OrderItem[];
  // Backward compat flat fields (some screens use these)
  distributorName?: string;
  repName?: string;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  variantId: string;
  quantity: number;
  unitPrice: string | number;  // Prisma Decimal comes as string
  lineTotal: string | number;  // Prisma Decimal comes as string
  createdAt?: string;
  variant?: {
    id: string;
    sku: string;
    unit: string;
    price: string | number;
    product?: { name: string };
  };
  // Backward compat aliases
  productName?: string;
  productId?: string;
  unit?: string;
}

interface CatalogState {
  products: Product[];
  distributors: Distributor[];
  lastUpdated: string | null;
}

interface CatalogActions {
  setProducts: (p: Product[]) => void;
  setDistributors: (d: Distributor[]) => void;
  setLastUpdated: (s: string) => void;
}

export const useCatalogStore = create<CatalogState & CatalogActions>()(
  persist(
    (set) => ({
      products: [],
      distributors: [],
      lastUpdated: null,

      setProducts: (p) => set({ products: p }),
      setDistributors: (d) => set({ distributors: d }),
      setLastUpdated: (s) => set({ lastUpdated: s }),
    }),
    {
      name: 'catalog-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
