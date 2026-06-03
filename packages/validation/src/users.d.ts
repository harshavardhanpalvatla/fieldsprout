import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    role: z.ZodEnum<["rep", "warehouse_mgr", "admin"]>;
    employeeId: z.ZodOptional<z.ZodString>;
    territory: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    warehouseId: z.ZodOptional<z.ZodString>;
    reportingManagerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    phone: string;
    role: "rep" | "warehouse_mgr" | "admin";
    employeeId?: string | undefined;
    territory?: string | undefined;
    state?: string | undefined;
    reportingManagerId?: string | undefined;
    warehouseId?: string | undefined;
}, {
    name: string;
    phone: string;
    role: "rep" | "warehouse_mgr" | "admin";
    employeeId?: string | undefined;
    territory?: string | undefined;
    state?: string | undefined;
    reportingManagerId?: string | undefined;
    warehouseId?: string | undefined;
}>;
