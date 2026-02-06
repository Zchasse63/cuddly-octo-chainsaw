import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, Footprints, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface Activity {
  id: string;
  type: 'workout' | 'run';
  name: string;
  completedAt: string;
  durationSeconds?: number;
  totalSets?: number;
  distanceMeters?: number;
}

interface RecentActivityListProps {
  workouts: Activity[];
  runs: Activity[];
  isLoadingMore?: boolean;
  onEndReached?: () => void;
}

export function RecentActivityList({
  workouts,
  runs,
  isLoadingMore = false,
  onEndReached,
}: RecentActivityListProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const allActivities = [...workouts, ...runs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    if (km >= 10) {
      return `${km.toFixed(0)} km`;
    }
    return `${km.toFixed(1)} km`;
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const isWorkout = item.type === 'workout';
    const icon = isWorkout ? Dumbbell : Footprints;
    const iconColor = isWorkout ? colors.accent.blue : '#4ECDC4';
    const iconBg = isWorkout ? colors.accent.blue + '20' : '#4ECDC420';

    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(isWorkout ? `/workout/${item.id}` : `/run/${item.id}`);
        }}
      >
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                backgroundColor: iconBg,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              {React.createElement(icon, { size: 20, color: iconColor })}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                {item.name || (isWorkout ? 'Workout' : 'Run')}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {formatRelativeDate(item.completedAt)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {item.durationSeconds && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={14} color={colors.text.secondary} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs / 2 }}>
                    {formatDuration(item.durationSeconds)}
                  </Text>
                </View>
              )}
              {isWorkout && item.totalSets && (
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                  {item.totalSets} sets
                </Text>
              )}
              {!isWorkout && item.distanceMeters && (
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                  {formatDistance(item.distanceMeters)}
                </Text>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <Card>
      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.text.tertiary,
          textAlign: 'center',
        }}
      >
        No recent activity yet. Start your first workout!
      </Text>
    </Card>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={{ paddingVertical: spacing.md }}>
        <ActivityIndicator size="small" color={colors.accent.blue} />
      </View>
    );
  };

  return (
    <FlatList
      data={allActivities}
      renderItem={renderActivity}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      scrollEnabled={false}
    />
  );
}
