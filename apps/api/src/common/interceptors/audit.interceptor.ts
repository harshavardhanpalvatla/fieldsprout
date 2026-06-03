import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  action: string;
  entity: string;
}

export const Audit = (action: string, entity: string) =>
  (target: unknown, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(AUDIT_KEY, { action, entity }, descriptor.value as object);
    }
    return descriptor;
  };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest<{ user?: { sub: string }; ip?: string; params?: { id?: string } }>();
    const userId = req.user?.sub ?? 'system';
    const ipAddress = req.ip ?? null;

    return next.handle().pipe(
      tap(async (result) => {
        const entityId =
          (result as { id?: string })?.id ??
          (result as { data?: { id?: string } })?.data?.id ??
          req.params?.id ??
          'unknown';

        await this.prisma.auditLog.create({
          data: {
            userId,
            action: meta.action,
            entity: meta.entity,
            entityId,
            payload: result as object,
            ipAddress,
          },
        });
      }),
    );
  }
}
