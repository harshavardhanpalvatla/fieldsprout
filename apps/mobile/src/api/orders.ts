import { apiClient } from './client';

export interface UpdateOrderPayload {
  items?: { variantId: string; quantity: number }[];
}

export interface CreateOrderPayload {
  distributorId: string;
  items: {
    variantId: string;  // API expects variantId, not productId
    quantity: number;
  }[];
}

export const ordersApi = {
  getOrders: (params?: { status?: string; page?: number; pageSize?: number }) =>
    apiClient.get('/orders', { params }),

  getOrder: (id: string) => apiClient.get(`/orders/${id}`),

  createOrder: (payload: CreateOrderPayload) => apiClient.post('/orders', payload),

  submitOrder: (id: string) => apiClient.post(`/orders/${id}/submit`),

  updateOrder: (id: string, payload: UpdateOrderPayload) =>
    apiClient.patch(`/orders/${id}`, payload),

  deliverOrder: (id: string) => apiClient.post(`/orders/${id}/deliver`),
};
