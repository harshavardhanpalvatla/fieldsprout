export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'admin' | 'warehouse_mgr' | 'sales_rep';
  territory?: string;
  state?: string;
  status: 'active' | 'inactive';
  warehouseId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  unit: string;
  price: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  regions: string[];
  status: 'active' | 'inactive';
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Stock {
  id: string;
  variantId: string;
  warehouseId: string;
  physicalQty: number;
  reservedQty: number;
  availableQty: number;
  sku: string;
  productName: string;
  unit: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  variantId: string;
  warehouseId: string;
  type: 'restock' | 'dispatch' | 'adjustment' | 'reservation';
  delta: number;
  reason?: string;
  referenceId?: string;
  createdAt: string;
  createdBy: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  state: string;
  status: 'active' | 'inactive';
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Distributor {
  id: string;
  name: string;
  phone: string;
  address: string;
  state: string;
  territory: string;
  status: 'pending' | 'active' | 'inactive';
  assignedRepId?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  sku: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  total: number;
  unitPrice?: number;
  lineTotal?: number;
  variant?: { product?: { name?: string } };
}

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'dispatched'
  | 'delivered';

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  actorId?: string;
  note?: string;
}

export interface Order {
  id: string;
  repId: string;
  repName: string;
  distributorId: string;
  distributorName: string;
  warehouseId: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  timeline: OrderTimeline[];
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  repId: string;
  repName: string;
  checkInTime?: string;
  checkOutTime?: string;
  date: string;
  status: 'present' | 'absent' | 'half_day';
  lat?: number;
  lng?: number;
}

export interface Visit {
  id: string;
  repId: string;
  repName: string;
  distributorId: string;
  distributorName: string;
  plannedAt?: string;
  visitedAt?: string;
  verifiedAt?: string;
  status: 'planned' | 'visited' | 'verified' | 'missed';
  notes?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface NotificationConfig {
  id: string;
  event: string;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  recipient: string;
  updatedAt: string;
}

export interface Dues {
  id: string;
  distributorId: string;
  distributorName: string;
  invoiceRef: string;
  amount: number;
  dueDate: string;
  totalOutstanding: number;
  source: 'manual' | 'tally_sync';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface GpsPoint {
  repId: string;
  repName: string;
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
}

export interface ComplianceReport {
  repId: string;
  repName: string;
  planned: number;
  visited: number;
  verified: number;
  rate: number;
}

export interface DailySummary {
  date: string;
  activeReps: number;
  ordersCount: number;
  ordersValue: number;
  pendingApprovals: number;
  lowStockItems: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}
