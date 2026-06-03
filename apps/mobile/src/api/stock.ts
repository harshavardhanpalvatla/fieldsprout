import { apiClient } from './client';

export const stockApi = {
  getAvailableStock: () => apiClient.get('/stock/available'),
};
