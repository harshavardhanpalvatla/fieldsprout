import { z } from 'zod';

export const createOrderSchema = z.object({
  distributorId: z.string().uuid(),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});
