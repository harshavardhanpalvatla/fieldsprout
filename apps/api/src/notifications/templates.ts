export function replaceVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.split('{' + k + '}').join(v), template);
}

export interface NotifTemplate {
  push?: { title: string; body: string };
  whatsapp?: { templateName: string; params: (ctx: Record<string, string>) => string[] };
  sms?: { message: string };
}

export const TEMPLATES: Record<string, NotifTemplate> = {
  'distributor.pending': {
    push: { title: 'New Distributor Pending', body: 'Rep {repName} added {distributorName}' },
  },
  'order.submitted': {
    push: { title: 'New Order Received', body: 'Order from {repName} for {distributorName}' },
  },
  'order.approved': {
    push: { title: 'Order Approved', body: 'Your order {orderRef} was approved' },
    whatsapp: {
      templateName: 'order_approved',
      params: (ctx) => [ctx.orderRef ?? '', ctx.distributorName ?? ''],
    },
  },
  'order.rejected': {
    push: { title: 'Order Rejected', body: 'Order {orderRef} rejected: {reason}' },
    whatsapp: {
      templateName: 'order_rejected',
      params: (ctx) => [ctx.orderRef ?? '', ctx.reason ?? ''],
    },
  },
  'order.dispatched': {
    push: { title: 'Order Dispatched', body: 'Order {orderRef} dispatched' },
    whatsapp: {
      templateName: 'order_dispatched',
      params: (ctx) => [ctx.orderRef ?? ''],
    },
    sms: { message: 'Order {orderRef} dispatched' },
  },
  'order.delivered': {
    whatsapp: {
      templateName: 'order_delivered',
      params: (ctx) => [ctx.orderRef ?? ''],
    },
    sms: { message: 'Order {orderRef} delivered. Thank you!' },
  },
  'stock.low': {
    push: { title: 'Low Stock Alert', body: 'SKU {sku}: only {available} units left' },
  },
};
