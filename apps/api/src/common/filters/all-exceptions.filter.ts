import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppException } from '../helpers/app-exception';
import { ZodValidationException } from '../pipes/zod-validation.pipe';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ZodValidationException) {
      return response.status(422).json({
        data: null,
        meta: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: exception.errors,
        },
      });
    }

    if (exception instanceof AppException) {
      return response.status(exception.httpStatus).json({
        data: null,
        meta: null,
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details ?? null,
        },
      });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return response.status(409).json({
          data: null,
          meta: null,
          error: {
            code: 'CONFLICT',
            message: 'A record with this value already exists.',
            details: null,
          },
        });
      }
      if (exception.code === 'P2025') {
        return response.status(404).json({
          data: null,
          meta: null,
          error: { code: 'NOT_FOUND', message: 'Record not found.', details: null },
        });
      }
      this.logger.error('Prisma error', exception);
      return response.status(500).json({
        data: null,
        meta: null,
        error: { code: 'INTERNAL', message: 'An internal error occurred.', details: null },
      });
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      return response.status(status).json({
        data: null,
        meta: null,
        error: {
          code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'HTTP_ERROR',
          message: typeof body === 'string' ? body : (body as { message?: string }).message ?? 'Error',
          details: null,
        },
      });
    }

    this.logger.error('Unhandled exception', exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      data: null,
      meta: null,
      error: { code: 'INTERNAL', message: 'An internal error occurred.', details: null },
    });
  }
}
