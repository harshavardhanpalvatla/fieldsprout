import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Only these models have deletedAt — middleware must not inject it on others
  private static readonly SOFT_DELETE_MODELS = new Set([
    'User', 'Warehouse', 'Distributor', 'Product', 'ProductVariant', 'Order', 'Dues',
  ]);

  constructor() {
    super();
    this.$use(async (params, next) => {
      const findOps = ['findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'count'];
      if (
        params.model &&
        findOps.includes(params.action) &&
        PrismaService.SOFT_DELETE_MODELS.has(params.model)
      ) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};
        const where = params.args.where as Record<string, unknown>;
        if (where.deletedAt === undefined && !params.args['withDeleted']) {
          where.deletedAt = null;
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
