export class AppException extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const Errors = {
  NOT_FOUND: (msg = 'Resource not found') => new AppException('NOT_FOUND', 404, msg),
  FORBIDDEN: (msg = 'Access denied') => new AppException('FORBIDDEN', 403, msg),
  UNAUTHENTICATED: (msg = 'Unauthenticated') => new AppException('UNAUTHENTICATED', 401, msg),
  SESSION_INVALIDATED: () => new AppException('SESSION_INVALIDATED', 401, 'Session invalidated. Please log in again.'),
  OTP_RATE_LIMITED: () => new AppException('OTP_RATE_LIMITED', 429, 'Too many OTP requests. Try again in 15 minutes.'),
  OTP_INVALID: () => new AppException('OTP_INVALID', 400, 'Invalid or expired OTP.'),
  INVALID_STATE_TRANSITION: (from: string, to: string) =>
    new AppException('INVALID_STATE_TRANSITION', 409, `Cannot transition order from '${from}' to '${to}'.`),
  INSUFFICIENT_STOCK: (details: unknown) =>
    new AppException('INSUFFICIENT_STOCK', 409, 'Insufficient stock for one or more items.', details),
  DUPLICATE_CHECKIN: () => new AppException('DUPLICATE_CHECKIN', 409, 'Already checked in today.'),
  SKU_EXISTS: () => new AppException('SKU_EXISTS', 409, 'A variant with this SKU already exists.'),
  INTERNAL: (msg = 'An internal error occurred') => new AppException('INTERNAL', 500, msg),
};
