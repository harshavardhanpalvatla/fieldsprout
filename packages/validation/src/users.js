"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    phone: zod_1.z.string().regex(/^\+\d{10,15}$/),
    role: zod_1.z.enum(['rep', 'warehouse_mgr', 'admin']),
    employeeId: zod_1.z.string().optional(),
    territory: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    warehouseId: zod_1.z.string().uuid().optional(),
    reportingManagerId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=users.js.map