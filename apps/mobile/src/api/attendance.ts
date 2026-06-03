import { apiClient } from './client';
import { GpsPoint } from '../stores/attendanceStore';

export const attendanceApi = {
  checkin: (lat: number, lng: number) =>
    apiClient.post('/attendance/checkin', { lat, lng }),

  checkout: () => apiClient.post('/attendance/checkout'),

  batchGps: (attendanceId: string, points: GpsPoint[]) =>
    apiClient.post('/gps/batch', { attendanceId, points }),
};
