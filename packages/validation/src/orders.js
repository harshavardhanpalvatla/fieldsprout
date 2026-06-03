"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    distributorId: zod_1.z.string().uuid(),
    items: zod_1.z.array(zod_1.z.object({
        variantId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive(),
    })).min(1),
});
//# sourceMappingURL=orders.js.map