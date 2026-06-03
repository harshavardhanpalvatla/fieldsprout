import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/, 'Must be E.164 format e.g. +919999999999'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(/^\+\d{10,15}$/),
  code: z.string().length(6),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});
