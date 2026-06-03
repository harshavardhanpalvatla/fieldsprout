export type Role = 'rep' | 'warehouse_mgr' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type DistributorStatus = 'active' | 'pending' | 'inactive';
export type OrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'dispatched' | 'delivered';
export type StockMovementType = 'in' | 'out' | 'reserve' | 'release' | 'adjust';
export type DuesSource = 'manual' | 'tally_sync';
export interface ApiResponse<T = unknown> {
    data: T | null;
    meta: PaginationMeta | null;
    error: ApiError | null;
}
export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}
export interface ApiError {
    code: string;
    message: string;
    details?: unknown;
}
export interface JwtPayload {
    sub: string;
    role: Role;
    warehouseIds: string[];
    territory: string | null;
    state: string | null;
    iat?: number;
    exp?: number;
}
