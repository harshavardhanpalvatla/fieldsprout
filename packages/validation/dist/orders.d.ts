import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    distributorId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        variantId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        variantId: string;
        quantity: number;
    }, {
        variantId: string;
        quantity: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    distributorId: string;
    items: {
        variantId: string;
        quantity: number;
    }[];
}, {
    distributorId: string;
    items: {
        variantId: string;
        quantity: number;
    }[];
}>;
