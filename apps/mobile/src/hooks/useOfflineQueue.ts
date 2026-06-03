import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueueStore } from '../stores/queueStore';
import { ordersApi, CreateOrderPayload } from '../api/orders';
import { distributorsApi, CheckinVisitPayload } from '../api/distributors';
import { attendanceApi } from '../api/attendance';
import { useAttendanceStore } from '../stores/attendanceStore';
import { GpsPoint } from '../stores/attendanceStore';

const MAX_RETRY = 3;

export function useOfflineQueue() {
  const [isSyncing, setIsSyncing] = useState(false);
  const { queue, dequeue, incrementRetry } = useQueueStore();
  const isFlushingRef = useRef(false);

  async function flushQueue() {
    if (isFlushingRef.current) return;
    const currentQueue = useQueueStore.getState().queue;
    if (currentQueue.length === 0) return;

    isFlushingRef.current = true;
    setIsSyncing(true);

    try {
      for (const item of currentQueue) {
        if (item.retryCount >= MAX_RETRY) {
          // Give up on this item after 3 retries — notify user
          dequeue(item.id);
          Alert.alert(
            'Sync Failed',
            `An offline action (${item.type.replace(/_/g, ' ')}) could not be synced after ${MAX_RETRY} attempts and has been discarded. Please retry manually if needed.`,
            [{ text: 'OK' }]
          );
          continue;
        }

        try {
          switch (item.type) {
            case 'create_order': {
              const payload = item.payload as CreateOrderPayload & { shouldSubmit?: boolean };
              const res = await ordersApi.createOrder(payload);
              if (payload.shouldSubmit && res.data?.data?.id) {
                await ordersApi.submitOrder(res.data.data.id);
              }
              break;
            }
            case 'visit_checkin': {
              const payload = item.payload as CheckinVisitPayload;
              await distributorsApi.checkinVisit(payload);
              break;
            }
            case 'gps_batch': {
              const payload = item.payload as { attendanceId: string; points: GpsPoint[] };
              await attendanceApi.batchGps(payload.attendanceId, payload.points);
              break;
            }
          }
          dequeue(item.id);
        } catch {
          incrementRetry(item.id);
        }
      }
    } finally {
      isFlushingRef.current = false;
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        flushQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  return { isSyncing, pendingCount: queue.length };
}
