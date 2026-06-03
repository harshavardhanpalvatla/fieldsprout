import { create } from 'zustand';

export interface GpsPoint {
  lat: number;
  lng: number;
  capturedAt: string;
}

export interface Attendance {
  id: string;
  checkinAt: string;
  checkoutAt?: string;
}

interface AttendanceState {
  attendance: Attendance | null;
  isCheckedIn: boolean;
  gpsActive: boolean;
  gpsQueue: GpsPoint[];
}

interface AttendanceActions {
  setAttendance: (a: Attendance | null) => void;
  setCheckoutAt: (checkoutAt: string) => void;
  clearAttendance: () => void;
  setGpsActive: (b: boolean) => void;
  addGpsPoint: (point: GpsPoint) => void;
  clearGpsQueue: () => void;
}

export const useAttendanceStore = create<AttendanceState & AttendanceActions>((set) => ({
  attendance: null,
  isCheckedIn: false,
  gpsActive: false,
  gpsQueue: [],

  setAttendance: (a) =>
    set({
      attendance: a,
      isCheckedIn: a !== null,
    }),

  setCheckoutAt: (checkoutAt) =>
    set((state) => ({
      attendance: state.attendance ? { ...state.attendance, checkoutAt } : null,
    })),

  clearAttendance: () =>
    set({
      attendance: null,
      isCheckedIn: false,
      gpsActive: false,
      gpsQueue: [],
    }),

  setGpsActive: (b) => set({ gpsActive: b }),

  addGpsPoint: (point) =>
    set((state) => ({
      gpsQueue: [...state.gpsQueue, point],
    })),

  clearGpsQueue: () => set({ gpsQueue: [] }),
}));
