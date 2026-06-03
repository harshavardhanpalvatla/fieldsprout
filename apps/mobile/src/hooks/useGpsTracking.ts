import { useRef, useEffect } from 'react';
import * as Location from 'expo-location';
import { useAttendanceStore } from '../stores/attendanceStore';
import { attendanceApi } from '../api/attendance';

const GPS_INTERVAL_MS = 120000; // 2 minutes
const FLUSH_INTERVAL_MS = 600000; // 10 minutes
const BATCH_SIZE = 5;

export function useGpsTracking() {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addGpsPoint, clearGpsQueue, gpsQueue, attendance, setGpsActive } = useAttendanceStore();

  async function flush() {
    const currentQueue = useAttendanceStore.getState().gpsQueue;
    const currentAttendance = useAttendanceStore.getState().attendance;

    if (currentQueue.length === 0 || !currentAttendance) return;

    try {
      await attendanceApi.batchGps(currentAttendance.id, currentQueue);
      clearGpsQueue();
    } catch {
      // Will retry on next flush
    }
  }

  async function start() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return;
    }

    setGpsActive(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: GPS_INTERVAL_MS,
        distanceInterval: 50,
      },
      (location) => {
        addGpsPoint({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          capturedAt: new Date().toISOString(),
        });

        // Auto-flush when we hit BATCH_SIZE
        const currentQueue = useAttendanceStore.getState().gpsQueue;
        if (currentQueue.length >= BATCH_SIZE) {
          flush();
        }
      }
    );

    // Set up periodic flush
    flushIntervalRef.current = setInterval(() => {
      flush();
    }, FLUSH_INTERVAL_MS);
  }

  function stop() {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    setGpsActive(false);
    // Final flush on stop
    flush();
  }

  // Stop tracking automatically when attendance.checkoutAt is set
  useEffect(() => {
    if (attendance?.checkoutAt && subscriptionRef.current) {
      stop();
    }
  }, [attendance?.checkoutAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
    };
  }, []);

  return { start, stop, flush };
}
