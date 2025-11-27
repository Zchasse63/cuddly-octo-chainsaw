import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// Types for offline queue
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
}

const OFFLINE_QUEUE_KEY = '@voicefit_offline_queue';
const MAX_RETRIES = 3;

// Hook to check network connectivity
export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, connectionType };
}

// Hook for offline-aware mutations
export function useOfflineMutation<T>(
  mutationFn: (data: T) => Promise<any>,
  options?: {
    table: string;
    onSuccess?: (data: any) => void;
    onError?: (error: any) => void;
    onOffline?: () => void;
  }
) {
  const { isConnected } = useNetworkStatus();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const queueOperation = async (data: T) => {
    const operation: QueuedOperation = {
      id: uuidv4(),
      type: 'create',
      table: options?.table || 'unknown',
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    try {
      const existingQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: QueuedOperation[] = existingQueue ? JSON.parse(existingQueue) : [];
      queue.push(operation);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      options?.onOffline?.();
      return { queued: true, operationId: operation.id };
    } catch (err) {
      console.error('Failed to queue operation:', err);
      throw err;
    }
  };

  const mutate = useCallback(
    async (data: T) => {
      setIsPending(true);
      setError(null);

      try {
        if (!isConnected) {
          // Queue for later
          const result = await queueOperation(data);
          setIsPending(false);
          return result;
        }

        const result = await mutationFn(data);
        options?.onSuccess?.(result);
        setIsPending(false);
        return result;
      } catch (err: any) {
        setError(err);
        options?.onError?.(err);
        setIsPending(false);

        // If network error, queue for later
        if (err.message?.includes('network') || err.message?.includes('offline')) {
          return queueOperation(data);
        }

        throw err;
      }
    },
    [isConnected, mutationFn, options]
  );

  return { mutate, isPending, error };
}

// Hook to process offline queue when back online
export function useOfflineQueueProcessor(processFn: (op: QueuedOperation) => Promise<any>) {
  const { isConnected } = useNetworkStatus();
  const [isProcessing, setIsProcessing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  const loadQueue = async () => {
    try {
      const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue: QueuedOperation[] = queueStr ? JSON.parse(queueStr) : [];
      setQueueLength(queue.length);
      return queue;
    } catch {
      return [];
    }
  };

  const processQueue = useCallback(async () => {
    if (!isConnected || isProcessing) return;

    setIsProcessing(true);
    const queue = await loadQueue();

    if (queue.length === 0) {
      setIsProcessing(false);
      return;
    }

    const failedOps: QueuedOperation[] = [];

    for (const op of queue) {
      try {
        await processFn(op);
      } catch (err) {
        if (op.retries < MAX_RETRIES) {
          failedOps.push({ ...op, retries: op.retries + 1 });
        } else {
          console.error(`Operation ${op.id} failed after ${MAX_RETRIES} retries`);
        }
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedOps));
    setQueueLength(failedOps.length);
    setIsProcessing(false);
  }, [isConnected, isProcessing, processFn]);

  // Process queue when coming back online
  useEffect(() => {
    if (isConnected) {
      processQueue();
    }
  }, [isConnected]);

  // Load queue length on mount
  useEffect(() => {
    loadQueue();
  }, []);

  return { isProcessing, queueLength, processQueue };
}

// Hook for optimistic updates with offline support
export function useOptimisticMutation<T, R>(
  mutationFn: (data: T) => Promise<R>,
  options: {
    table: string;
    optimisticUpdate: (data: T) => void;
    rollback: (data: T) => void;
    onSuccess?: (data: R) => void;
    onError?: (error: any, data: T) => void;
  }
) {
  const { isConnected } = useNetworkStatus();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    async (data: T) => {
      // Apply optimistic update immediately
      options.optimisticUpdate(data);
      setIsPending(true);

      try {
        if (!isConnected) {
          // Queue for later, keep optimistic update
          const operation: QueuedOperation = {
            id: uuidv4(),
            type: 'create',
            table: options.table,
            data,
            timestamp: Date.now(),
            retries: 0,
          };

          const existingQueue = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
          const queue: QueuedOperation[] = existingQueue ? JSON.parse(existingQueue) : [];
          queue.push(operation);
          await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

          setIsPending(false);
          return { queued: true };
        }

        const result = await mutationFn(data);
        options.onSuccess?.(result);
        setIsPending(false);
        return result;
      } catch (err: any) {
        // Rollback on error
        options.rollback(data);
        options.onError?.(err, data);
        setIsPending(false);
        throw err;
      }
    },
    [isConnected, mutationFn, options]
  );

  return { mutate, isPending };
}

// Utility to clear offline queue (for debugging/testing)
export async function clearOfflineQueue() {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// Get current queue length
export async function getOfflineQueueLength(): Promise<number> {
  try {
    const queueStr = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: QueuedOperation[] = queueStr ? JSON.parse(queueStr) : [];
    return queue.length;
  } catch {
    return 0;
  }
}
