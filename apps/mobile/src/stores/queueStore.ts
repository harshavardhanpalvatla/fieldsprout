import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QueueItemType = 'create_order' | 'visit_checkin' | 'gps_batch';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  payload: unknown;
  capturedAt: string;
  retryCount: number;
}

interface QueueState {
  queue: QueueItem[];
}

interface QueueActions {
  enqueue: (item: Omit<QueueItem, 'retryCount'>) => void;
  dequeue: (id: string) => void;
  incrementRetry: (id: string) => void;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueState & QueueActions>()(
  persist(
    (set) => ({
      queue: [],

      enqueue: (item) =>
        set((state) => ({
          queue: [...state.queue, { ...item, retryCount: 0 }],
        })),

      dequeue: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),

      incrementRetry: (id) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
          ),
        })),

      clearQueue: () => set({ queue: [] }),
    }),
    {
      name: 'offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
