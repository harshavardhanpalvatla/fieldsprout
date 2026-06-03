"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.verifyOtpSchema = exports.requestOtpSchema = void 0;
const zod_1 = require("zod");
exports.requestOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format e.g. +919999999999'),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z.string().regex(/^\+\d{10,15}$/),
    code: zod_1.z.string().length(6),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
