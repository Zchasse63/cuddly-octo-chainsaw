import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { powerSync } from '../lib/powersync';

export interface OfflineAwareState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

export function useOfflineAware(): OfflineAwareState {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Subscribe to PowerSync status changes
    const statusListener = powerSync.registerListener({
      statusChanged: (status) => {
        setIsSyncing(status.connected && !status.hasSynced);
        if (status.lastSyncedAt) {
          setLastSyncTime(new Date(status.lastSyncedAt));
        }
      },
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeNetInfo();
      statusListener?.();
    };
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
  };
}
