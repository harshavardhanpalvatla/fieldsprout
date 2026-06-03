import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/scope.helper';
import { AppException, Errors } from '../common/helpers/app-exception';
import { paginate, PaginatedResult } from '../common/helpers/paginate';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface StockQueryDto {
  warehouseId?: string;
  variantId?: string;
  lowOnly?: string;
  page?: number;
  pageSize?: number;
}

export interface RestockDto {
  variantId: string;
  quantity: number;
}

export interface AdjustDto {
  variantId: string;
  delta: number;
  reason: string;
}

export interface StockHistoryQueryDto {
  variantId?: string;
  warehouseId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface AvailableStockItem {
  variantId: string;
  sku: string;
  unit: string;
  available: number;
}

export interface ReserveStockItem {
  variantId: string;
  quantity: number;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async getStock(
    user: AuthUser,
    query: StockQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const where: Record<string, unknown> = {};

    if (user.role === 'warehouse_mgr') {
      where['warehouseId'] = { in: user.warehouseIds };
    } else if (user.role === 'admin' && query.warehouseId) {
      where['warehouseId'] = query.warehouseId;
    }

    if (query.variantId) {
      where['variantId'] = query.variantId;
    }

    const include = {
      variant: {
        include: {
          product: { select: { name: true } },
        },
      },
      warehouse: { select: { name: true } },
    };

    const result = await paginate(
      this.prisma.stock as Parameters<typeof paginate>[0],
      { where, include },
      { page: query.page, pageSize: query.pageSize },
    );

    const threshold = parseInt(
      this.configService.get('STOCK_LOW_THRESHOLD', '10'),
      10,
    );

    let mapped = result.data.map((s: unknown) => {
      const stock = s as {
        physicalQty: number;
        reservedQty: number;
        [key: string]: unknown;
      };
      return { ...stock, available: stock.physicalQty - stock.reservedQty };
    });

    if (query.lowOnly === 'true') {
      mapped = mapped.filter((s) => (s.available as number) <= threshold);
    }

    return { ...result, data: mapped };
  }

  async getAvailableStock(user: AuthUser): Promise<AvailableStockItem[]> {
    const warehouseId = user.warehouseIds[0];
    if (!warehouseId) {
      throw new AppException(
        'VALIDATION_FAILED',
        422,
        'Rep has no assigned warehouse',
      );
    }

    const stock = await this.prisma.stock.findMany({
      where: { warehouseId },
      include: {
        variant: { select: { sku: true, unit: true } },
      },
    });

    return stock.map((s) => ({
      variantId: s.variantId,
      sku: s.variant.sku,
      unit: s.variant.unit,
      available: s.physicalQty - s.reservedQty,
    }));
  }

  async restock(user: AuthUser, dto: RestockDto): Promise<unknown> {
    const warehouseId = user.warehouseIds[0];
    if (!warehouseId) {
      throw Errors.NOT_FOUND('No warehouse assigned');
    }

    const stock = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.stock.upsert({
        where: {
          variantId_warehouseId: {
            variantId: dto.variantId,
            warehouseId,
          },
        },
        create: {
          variantId: dto.variantId,
          warehouseId,
          physicalQty: dto.quantity,
          reservedQty: 0,
          updatedBy: user.sub,
        },
        update: {
          physicalQty: { increment: dto.quantity },
          updatedBy: user.sub,
        },
      });

      await tx.stockMovement.create({
        data: {
          variantId: dto.variantId,
          warehouseId,
          type: 'in',
          quantity: dto.quantity,
          performedBy: user.sub,
        },
      });

      return updated;
    });

    return stock;
  }

  async adjust(user: AuthUser, dto: AdjustDto): Promise<void> {
    const warehouseId = user.warehouseIds[0];
    if (!warehouseId) {
      throw Errors.NOT_FOUND('No warehouse assigned');
    }

    const stock = await this.prisma.stock.findUnique({
      where: {
        variantId_warehouseId: {
          variantId: dto.variantId,
          warehouseId,
        },
      },
    });

    if (!stock) {
      throw Errors.NOT_FOUND('Stock record not found');
    }

    if (stock.physicalQty + dto.delta < stock.reservedQty) {
      throw new AppException(
        'CONFLICT',
        409,
        'Cannot reduce physical below reserved quantity',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: {
          variantId_warehouseId: {
            variantId: dto.variantId,
            warehouseId,
          },
        },
        data: {
          physicalQty: { increment: dto.delta },
          updatedBy: user.sub,
        },
      });

      await tx.stockMovement.create({
        data: {
          variantId: dto.variantId,
          warehouseId,
          type: 'adjust',
          quantity: Math.abs(dto.delta),
          reason: dto.reason,
          performedBy: user.sub,
        },
      });
    });
  }

  async getHistory(
    user: AuthUser,
    query: StockHistoryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const where: Record<string, unknown> = {};

    if (user.role === 'warehouse_mgr') {
      where['warehouseId'] = { in: user.warehouseIds };
    }

    if (query.variantId) {
      where['variantId'] = query.variantId;
    }

    if (query.warehouseId && user.role === 'admin') {
      where['warehouseId'] = query.warehouseId;
    }

    if (query.type) {
      where['type'] = query.type;
    }

    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt['gte'] = new Date(query.from);
      if (query.to) createdAt['lte'] = new Date(query.to);
      where['createdAt'] = createdAt;
    }

    return paginate(
      this.prisma.stockMovement as Parameters<typeof paginate>[0],
      {
        where,
        include: {
          variant: { select: { sku: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  async getLowAlerts(): Promise<unknown[]> {
    const threshold = parseInt(
      this.configService.get('STOCK_LOW_THRESHOLD', '10'),
      10,
    );

    const allStock = await this.prisma.stock.findMany({
      include: {
        variant: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    return allStock
      .filter((s) => s.physicalQty - s.reservedQty <= threshold)
      .map((s) => ({
        ...s,
        available: s.physicalQty - s.reservedQty,
        sku: s.variant.sku,
        productName: s.variant.product.name,
      }));
  }

  // ── Internal methods (accept an existing transaction client) ──────────────

  async reserveStock(
    tx: TxClient,
    warehouseId: string,
    items: ReserveStockItem[],
    orderId: string,
    performedBy: string,
  ): Promise<void> {
    const failures: Array<{
      sku: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const stock = await tx.stock.findUnique({
        where: {
          variantId_warehouseId: {
            variantId: item.variantId,
            warehouseId,
          },
        },
        include: { variant: { select: { sku: true } } },
      });

      const available = stock ? stock.physicalQty - stock.reservedQty : 0;

      if (!stock || available < item.quantity) {
        failures.push({
          sku: stock?.variant.sku ?? item.variantId,
          requested: item.quantity,
          available,
        });
      }
    }

    if (failures.length > 0) {
      throw Errors.INSUFFICIENT_STOCK({ skus: failures });
    }

    for (const item of items) {
      await tx.stock.update({
        where: {
          variantId_warehouseId: {
            variantId: item.variantId,
            warehouseId,
          },
        },
        data: { reservedQty: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          warehouseId,
          type: 'reserve',
          quantity: item.quantity,
          orderId,
          performedBy,
        },
      });
    }
  }

  async releaseStock(
    tx: TxClient,
    warehouseId: string,
    items: ReserveStockItem[],
    orderId: string,
    performedBy: string,
  ): Promise<void> {
    for (const item of items) {
      await tx.stock.update({
        where: {
          variantId_warehouseId: {
            variantId: item.variantId,
            warehouseId,
          },
        },
        data: { reservedQty: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          warehouseId,
          type: 'release',
          quantity: item.quantity,
          orderId,
          performedBy,
        },
      });
    }
  }

  async finalizeDispatch(
    tx: TxClient,
    warehouseId: string,
    items: ReserveStockItem[],
    orderId: string,
    performedBy: string,
  ): Promise<void> {
    const threshold = parseInt(
      this.configService.get('STOCK_LOW_THRESHOLD', '10'),
      10,
    );

    for (const item of items) {
      const updated = await tx.stock.update({
        where: {
          variantId_warehouseId: {
            variantId: item.variantId,
            warehouseId,
          },
        },
        data: {
          physicalQty: { decrement: item.quantity },
          reservedQty: { decrement: item.quantity },
        },
        select: {
          physicalQty: true,
          reservedQty: true,
          variant: { select: { sku: true } },
        },
      });

      await tx.stockMovement.create({
        data: {
          variantId: item.variantId,
          warehouseId,
          type: 'out',
          quantity: item.quantity,
          orderId,
          performedBy,
        },
      });

      const newAvailable = updated.physicalQty - updated.reservedQty;
      if (newAvailable <= threshold) {
        this.eventEmitter.emit('stock.low', {
          sku: updated.variant.sku,
          available: newAvailable,
        });
      }
    }
  }
}
