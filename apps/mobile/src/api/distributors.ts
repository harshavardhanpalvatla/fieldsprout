import { apiClient } from './client';

export interface CreateDistributorPayload {
  name: string;
  phone?: string;
  address?: string;
  state?: string;
}

export interface CheckinVisitPayload {
  distributorId: string;
  lat: number;
  lng: number;
  attendanceId: string;
  photoUrl?: string;
}

export const distributorsApi = {
  getDistributors: (params?: { search?: string; page?: number; limit?: number }) =>
    apiClient.get('/distributors', { params }),

  getDistributor: (id: string) => apiClient.get(`/distributors/${id}`),

  createDistributor: (payload: CreateDistributorPayload) =>
    apiClient.post('/distributors', payload),

  checkinVisit: (payload: CheckinVisitPayload) =>
    apiClient.post('/visits/checkin', payload),
};
