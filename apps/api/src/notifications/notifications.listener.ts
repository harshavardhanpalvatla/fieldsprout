import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('order.submitted')
  handleOrderSubmitted(payload: {
    orderId: string;
    repId: string;
    warehouseId: string;
    distributorId: string;
  }) {
    this.notificationsService
      .emit('order.submitted', {
        orderId: payload.orderId,
        repId: payload.repId,
        warehouseId: payload.warehouseId,
        distributorId: payload.distributorId,
      })
      .catch(() => {});
  }

  @OnEvent('order.approved')
  handleOrderApproved(payload: {
    orderId: string;
    orderRef: string;
    repId: string;
    distributorId: string;
    distributorName: string;
  }) {
    this.notificationsService
      .emit('order.approved', {
        orderId: payload.orderId,
        orderRef: payload.orderRef,
        repId: payload.repId,
        distributorId: payload.distributorId,
        distributorName: payload.distributorName,
      })
      .catch(() => {});
  }

  @OnEvent('order.rejected')
  handleOrderRejected(payload: {
    orderId: string;
    orderRef: string;
    repId: string;
    distributorId: string;
    reason: string;
  }) {
    this.notificationsService
      .emit('order.rejected', {
        orderId: payload.orderId,
        orderRef: payload.orderRef,
        repId: payload.repId,
        distributorId: payload.distributorId,
        reason: payload.reason,
      })
      .catch(() => {});
  }

  @OnEvent('order.dispatched')
  handleOrderDispatched(payload: {
    orderId: string;
    orderRef: string;
    repId: string;
    distributorId: string;
  }) {
    this.notificationsService
      .emit('order.dispatched', {
        orderId: payload.orderId,
        orderRef: payload.orderRef,
        repId: payload.repId,
        distributorId: payload.distributorId,
      })
      .catch(() => {});
  }

  @OnEvent('order.delivered')
  handleOrderDelivered(payload: {
    orderId: string;
    orderRef: string;
    repId: string;
    distributorId: string;
  }) {
    this.notificationsService
      .emit('order.delivered', {
        orderId: payload.orderId,
        orderRef: payload.orderRef,
        repId: payload.repId,
        distributorId: payload.distributorId,
      })
      .catch(() => {});
  }

  @OnEvent('distributor.pending')
  handleDistributorPending(payload: {
    distributorId: string;
    distributorName: string;
    repId: string;
    repName: string;
  }) {
    this.notificationsService
      .emit('distributor.pending', {
        distributorId: payload.distributorId,
        distributorName: payload.distributorName,
        repId: payload.repId,
        repName: payload.repName,
      })
      .catch(() => {});
  }

  @OnEvent('stock.low')
  handleStockLow(payload: { sku: string; available: string; warehouseId: string }) {
    this.notificationsService
      .emit('stock.low', {
        sku: payload.sku,
        available: payload.available,
        warehouseId: payload.warehouseId,
      })
      .catch(() => {});
  }
}
