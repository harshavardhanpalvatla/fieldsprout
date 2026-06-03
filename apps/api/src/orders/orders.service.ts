import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { AuthUser, orderScope } from '../auth/scope.helper';
import { AppException, Errors } from '../common/helpers/app-exception';
import { paginate } from '../common/helpers/paginate';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private assertTransition(
    current: string,
    target: string,
    allowed: string[],
  ): void {
    if (!allowed.includes(current)) {
      throw Errors.INVALID_STATE_TRANSITION(current, target);
    }
  }

  async createOrder(
    user: AuthUser,
    dto: { distributorId: string; items: { variantId: string; quantity: number }[] },
  ) {
    const warehouseId = user.warehouseIds[0];
    if (!warehouseId) {
      throw new AppException('VALIDATION_FAILED', 422, 'Rep has no assigned warehouse');
    }

    // Verify distributor visibility
    const distributor = await this.prisma.distributor.findFirst({
      where: {
        id: dto.distributorId,
        deletedAt: null,
        ...(user.role === 'rep'
          ? { OR: [{ assignedRepId: user.sub }, { status: 'active' }] }
          : {}),
      },
    });
    if (!distributor) throw Errors.NOT_FOUND('Distributor not found');

    // Merge duplicate variantIds
    const itemMap = new Map<string, number>();
    for (const item of dto.items) {
      itemMap.set(item.variantId, (itemMap.get(item.variantId) ?? 0) + item.quantity);
    }
    const mergedItems = Array.from(itemMap.entries()).map(([variantId, quantity]) => ({
      variantId,
      quantity,
    }));

    // Snapshot prices
    const itemsWithPrice = await Promise.all(
      mergedItems.map(async (item) => {
        const variant = await this.prisma.productVariant.findFirst({
          where: { id: item.variantId, isActive: true, deletedAt: null },
        });
        if (!variant) throw Errors.NOT_FOUND('Variant not found: ' + item.variantId);
        const unitPrice = Number(variant.price);
        const lineTotal = unitPrice * item.quantity;
        return { ...item, unitPrice, lineTotal };
      }),
    );

    const totalAmount = itemsWithPrice.reduce((sum, i) => sum + i.lineTotal, 0);

    const order = await this.prisma.$transaction(async (tx: TxClient) => {
      const created = await tx.order.create({
        data: {
          repId: user.sub,
          distributorId: dto.distributorId,
          warehouseId,
          totalAmount,
          status: 'draft',
          items: {
            create: itemsWithPrice.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: 'order.created',
          entity: 'orders',
          entityId: created.id,
          payload: {},
        },
      });
      return created;
    });
    return this.findOne(user, order.id);
  }

  async updateOrder(
    user: AuthUser,
    orderId: string,
    dto: { items: { variantId: string; quantity: number }[] },
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, repId: user.sub, deletedAt: null },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    if (!['draft', 'rejected'].includes(order.status)) {
      throw Errors.INVALID_STATE_TRANSITION(order.status, 'edit');
    }

    // Re-snapshot prices same as create
    const itemMap = new Map<string, number>();
    for (const i of dto.items) {
      itemMap.set(i.variantId, (itemMap.get(i.variantId) ?? 0) + i.quantity);
    }
    const merged = Array.from(itemMap.entries()).map(([v, q]) => ({
      variantId: v,
      quantity: q,
    }));
    const withPrices = await Promise.all(
      merged.map(async (i) => {
        const v = await this.prisma.productVariant.findFirst({
          where: { id: i.variantId, isActive: true, deletedAt: null },
        });
        if (!v) throw Errors.NOT_FOUND('Variant not found: ' + i.variantId);
        return {
          ...i,
          unitPrice: Number(v.price),
          lineTotal: Number(v.price) * i.quantity,
        };
      }),
    );
    const total = withPrices.reduce((s, i) => s + i.lineTotal, 0);

    await this.prisma.$transaction(async (tx: TxClient) => {
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: total,
          items: {
            create: withPrices.map((i) => ({
              variantId: i.variantId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: 'order.updated',
          entity: 'orders',
          entityId: orderId,
          payload: {},
        },
      });
    });
    return this.findOne(user, orderId);
  }

  async submitOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, repId: user.sub, deletedAt: null },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    this.assertTransition(order.status, 'submitted', ['draft', 'rejected']);

    const now = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'submitted', submittedAt: now, rejectionReason: null },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'order.submitted',
        entity: 'orders',
        entityId: orderId,
        payload: {},
      },
    });
    this.eventEmitter.emit('order.submitted', {
      orderId,
      repId: user.sub,
      warehouseId: order.warehouseId,
      distributorId: order.distributorId,
    });
    return this.findOne(user, orderId);
  }

  async approveOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, warehouseId: { in: user.warehouseIds }, deletedAt: null },
      include: { items: true },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    this.assertTransition(order.status, 'approved', ['submitted']);

    await this.prisma.$transaction(async (tx: TxClient) => {
      const fresh = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!fresh || fresh.status !== 'submitted') {
        throw Errors.INVALID_STATE_TRANSITION(fresh?.status ?? 'unknown', 'approved');
      }
      await this.stockService.reserveStock(
        tx,
        order.warehouseId,
        fresh.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        orderId,
        user.sub,
      );
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'approved', approvedAt: new Date(), approvedBy: user.sub },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: 'order.approved',
          entity: 'orders',
          entityId: orderId,
          payload: {},
        },
      });
    });
    this.eventEmitter.emit('order.approved', {
      orderId,
      repId: order.repId,
      distributorId: order.distributorId,
    });
    return this.findOne(user, orderId);
  }

  async rejectOrder(user: AuthUser, orderId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, warehouseId: { in: user.warehouseIds }, deletedAt: null },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    this.assertTransition(order.status, 'rejected', ['submitted']);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'rejected', rejectionReason: reason },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'order.rejected',
        entity: 'orders',
        entityId: orderId,
        payload: { reason },
      },
    });
    this.eventEmitter.emit('order.rejected', {
      orderId,
      repId: order.repId,
      reason,
    });
    return this.findOne(user, orderId);
  }

  async dispatchOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, warehouseId: { in: user.warehouseIds }, deletedAt: null },
      include: { items: true },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    this.assertTransition(order.status, 'dispatched', ['approved']);

    await this.prisma.$transaction(async (tx: TxClient) => {
      const fresh = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
      if (!fresh || fresh.status !== 'approved') {
        throw Errors.INVALID_STATE_TRANSITION(fresh?.status ?? 'unknown', 'dispatched');
      }
      await this.stockService.finalizeDispatch(
        tx,
        order.warehouseId,
        fresh.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        orderId,
        user.sub,
      );
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'dispatched', dispatchedAt: new Date(), dispatchedBy: user.sub },
      });
      await tx.auditLog.create({
        data: {
          userId: user.sub,
          action: 'order.dispatched',
          entity: 'orders',
          entityId: orderId,
          payload: {},
        },
      });
    });
    this.eventEmitter.emit('order.dispatched', {
      orderId,
      repId: order.repId,
      distributorId: order.distributorId,
      warehouseId: order.warehouseId,
    });
    return this.findOne(user, orderId);
  }

  async deliverOrder(user: AuthUser, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, repId: user.sub, deletedAt: null },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    this.assertTransition(order.status, 'delivered', ['dispatched']);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'delivered', deliveredAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: user.sub,
        action: 'order.delivered',
        entity: 'orders',
        entityId: orderId,
        payload: {},
      },
    });
    this.eventEmitter.emit('order.delivered', {
      orderId,
      distributorId: order.distributorId,
    });
    return this.findOne(user, orderId);
  }

  async cancelOrder(user: AuthUser, orderId: string) {
    // Rep sees own orders; warehouse_mgr sees own warehouse orders
    const scopeWhere =
      user.role === 'rep'
        ? { repId: user.sub }
        : user.role === 'warehouse_mgr'
          ? { warehouseId: { in: user.warehouseIds } }
          : {};

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...scopeWhere, deletedAt: null },
      include: { items: true },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    if (['dispatched', 'delivered'].includes(order.status)) {
      throw Errors.INVALID_STATE_TRANSITION(order.status, 'cancelled');
    }

    if (order.status === 'approved') {
      await this.prisma.$transaction(async (tx: TxClient) => {
        await this.stockService.releaseStock(
          tx,
          order.warehouseId,
          order.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          orderId,
          user.sub,
        );
        await tx.order.update({
          where: { id: orderId },
          data: { deletedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            userId: user.sub,
            action: 'order.cancelled',
            entity: 'orders',
            entityId: orderId,
            payload: {},
          },
        });
      });
    } else {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { deletedAt: new Date() },
      });
      await this.prisma.auditLog.create({
        data: {
          userId: user.sub,
          action: 'order.cancelled',
          entity: 'orders',
          entityId: orderId,
          payload: {},
        },
      });
    }
    return { success: true };
  }

  async findAll(
    user: AuthUser,
    query: {
      status?: string;
      distributorId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = orderScope(user);
    const where: Record<string, unknown> = { ...scope, deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.distributorId) where.distributorId = query.distributorId;
    if (query.from || query.to) {
      where.createdAt = {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      };
    }
    return paginate(
      this.prisma.order,
      {
        where,
        include: {
          distributor: { select: { name: true } },
          rep: { select: { name: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  async findOne(user: AuthUser, orderId: string) {
    const scope = orderScope(user);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, ...scope, deletedAt: null },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { name: true } },
              },
            },
          },
        },
        distributor: { select: { id: true, name: true, phone: true } },
        rep: { select: { id: true, name: true } },
      },
    });
    if (!order) throw Errors.NOT_FOUND('Order not found');
    return order;
  }
}
