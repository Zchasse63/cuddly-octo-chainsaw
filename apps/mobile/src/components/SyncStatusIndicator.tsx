import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme/tokens';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

interface SyncStatusIndicatorProps {
  state: SyncState;
  pendingChanges?: number;
  lastSyncedAt?: Date | null;
  onRetry?: () => void;
  compact?: boolean;
}

export function SyncStatusIndicator({
  state,
  pendingChanges = 0,
  lastSyncedAt,
  onRetry,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { colors } = useTheme();
  const [spinAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (state === 'syncing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [state]);

  const getStatusConfig = () => {
    switch (state) {
      case 'synced':
        return {
          icon: Check,
          color: colors.accent.green,
          label: 'Synced',
          bgColor: colors.accent.green + '15',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: colors.accent.blue,
          label: 'Syncing...',
          bgColor: colors.accent.blue + '15',
        };
      case 'pending':
        return {
          icon: Cloud,
          color: colors.semantic.warning,
          label: `${pendingChanges} pending`,
          bgColor: colors.semantic.warning + '15',
        };
      case 'offline':
        return {
          icon: CloudOff,
          color: colors.text.tertiary,
          label: 'Offline',
          bgColor: colors.background.tertiary,
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: colors.semantic.error,
          label: 'Sync failed',
          bgColor: colors.semantic.error + '15',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (compact) {
    return (
      <TouchableOpacity
        onPress={state === 'error' ? onRetry : undefined}
        disabled={state !== 'error'}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: config.bgColor,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {state === 'syncing' ? (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Icon size={16} color={config.color} />
          </Animated.View>
        ) : (
          <Icon size={16} color={config.color} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={state === 'error' ? onRetry : undefined}
      disabled={state !== 'error'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: config.bgColor,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
      }}
    >
      {state === 'syncing' ? (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Icon size={14} color={config.color} />
        </Animated.View>
      ) : (
        <Icon size={14} color={config.color} />
      )}
      <Text
        style={{
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
          color: config.color,
        }}
      >
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

// Hook to use sync status
export function useSyncStatus() {
  const [state, setState] = useState<SyncState>('synced');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());

  // In a real implementation, this would connect to PowerSync
  // and listen for sync state changes

  const retry = async () => {
    setState('syncing');
    // Attempt to sync...
    setTimeout(() => {
      setState('synced');
      setLastSyncedAt(new Date());
    }, 2000);
  };

  return {
    state,
    pendingChanges,
    lastSyncedAt,
    retry,
  };
}

// Offline banner component
export function OfflineBanner() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.semantic.warning,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
      }}
    >
      <CloudOff size={14} color={colors.text.onAccent} />
      <Text
        style={{
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
          color: colors.text.onAccent,
        }}
      >
        You're offline. Changes will sync when connected.
      </Text>
    </View>
  );
}

// Pending changes indicator
export function PendingChangesIndicator({ count }: { count: number }) {
  const { colors } = useTheme();

  if (count === 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.semantic.warning + '15',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
      }}
    >
      <Cloud size={16} color={colors.semantic.warning} />
      <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text.secondary }}>
        {count} change{count !== 1 ? 's' : ''} waiting to sync
      </Text>
      <RefreshCw size={16} color={colors.semantic.warning} />
    </View>
  );
}
