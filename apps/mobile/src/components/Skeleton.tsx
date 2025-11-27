import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { borderRadius, spacing } from '../theme/tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [colors.background.tertiary, colors.background.secondary, colors.background.tertiary]
    ),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Card Skeleton
export function CardSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={12} style={{ marginBottom: spacing.xs }} />
      <Skeleton width="80%" height={12} />
    </View>
  );
}

// Workout Card Skeleton
export function WorkoutCardSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Skeleton width={44} height={44} borderRadius={borderRadius.md} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Skeleton width="50%" height={18} style={{ marginBottom: spacing.xs }} />
          <Skeleton width="30%" height={14} />
        </View>
        <Skeleton width={60} height={28} borderRadius={borderRadius.full} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={12} />
        </View>
        <View>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={12} />
        </View>
        <View>
          <Skeleton width={40} height={24} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={12} />
        </View>
      </View>
    </View>
  );
}

// List Skeleton
export function ListSkeleton({ count = 5, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} style={{ marginBottom: spacing.sm }} />
      ))}
    </View>
  );
}

// Stats Skeleton
export function StatsSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            alignItems: 'center',
          }}
        >
          <Skeleton width={32} height={32} borderRadius={16} style={{ marginBottom: spacing.xs }} />
          <Skeleton width={40} height={20} style={{ marginBottom: 4 }} />
          <Skeleton width={50} height={12} />
        </View>
      ))}
    </View>
  );
}

// Chart Skeleton
export function ChartSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <Skeleton width="40%" height={20} style={{ marginBottom: spacing.md }} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, height: 120 }}>
        {[60, 80, 45, 90, 75, 100, 55].map((height, index) => (
          <View key={index} style={{ flex: 1 }}>
            <Skeleton width="100%" height={height} borderRadius={borderRadius.sm} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((_, index) => (
          <Skeleton key={index} width={24} height={12} />
        ))}
      </View>
    </View>
  );
}

// Profile Header Skeleton
export function ProfileHeaderSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: spacing.xl }, style]}>
      <Skeleton width={80} height={80} borderRadius={40} style={{ marginBottom: spacing.md }} />
      <Skeleton width={120} height={22} style={{ marginBottom: spacing.xs }} />
      <Skeleton width={80} height={16} />
    </View>
  );
}

// Exercise Row Skeleton
export function ExerciseRowSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
        },
        style,
      ]}
    >
      <Skeleton width={40} height={40} borderRadius={borderRadius.md} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={24} height={24} borderRadius={12} />
    </View>
  );
}

// Badge Grid Skeleton
export function BadgeGridSkeleton({ count = 6, style }: { count?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
        },
        style,
      ]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            width: '31%',
            aspectRatio: 1,
            padding: spacing.xs,
          }}
        >
          <Skeleton
            width="100%"
            height="100%"
            borderRadius={borderRadius.lg}
          />
        </View>
      ))}
    </View>
  );
}

// Calendar Day Skeleton
export function CalendarSkeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View style={[{ padding: spacing.md }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Skeleton width={120} height={24} />
        <Skeleton width={60} height={24} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, index) => (
          <Skeleton key={index} width={32} height={16} />
        ))}
      </View>
      {Array.from({ length: 5 }).map((_, weekIndex) => (
        <View
          key={weekIndex}
          style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}
        >
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <Skeleton key={dayIndex} width={32} height={32} borderRadius={16} />
          ))}
        </View>
      ))}
    </View>
  );
}
