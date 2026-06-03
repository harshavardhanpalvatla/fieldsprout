export interface AuthUser {
  sub: string;
  role: string;
  warehouseIds: string[];
  territory?: string | null;
  state?: string | null;
}

export function orderScope(user: AuthUser): Record<string, unknown> {
  if (user.role === 'admin') return {};
  if (user.role === 'rep') return { repId: user.sub };
  if (user.role === 'warehouse_mgr') return { warehouseId: { in: user.warehouseIds } };
  return { id: '__never__' };
}

export function visitsScope(user: AuthUser): Record<string, unknown> {
  if (user.role === 'admin') return {};
  return { repId: user.sub };
}

export function stockScope(user: AuthUser): Record<string, unknown> {
  if (user.role === 'admin') return {};
  return { warehouseId: { in: user.warehouseIds } };
}
