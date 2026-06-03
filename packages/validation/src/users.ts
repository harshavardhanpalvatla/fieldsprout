import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^\+\d{10,15}$/),
  role: z.enum(['rep', 'warehouse_mgr', 'admin']),
  employeeId: z.string().optional(),
  territory: z.string().optional(),
  state: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  reportingManagerId: z.string().uuid().optional(),
});
