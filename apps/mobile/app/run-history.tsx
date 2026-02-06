import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  TrendingUp,
  ChevronRight,
  Footprints,
  Heart,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { api } from '../src/lib/trpc';
import { useDistanceUnit, formatDistance, formatPace, formatDuration } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

const getRunTypeColor = (runType: string, colors: any): string => {
  const map: Record<string, string> = {
    easy: colors.activity.running,
    tempo: colors.activity.tempo,
    interval: colors.activity.interval,
    long_run: colors.activity.running,
    recovery: colors.activity.recovery,
    fartlek: colors.accent.purple,
    hill: colors.accent.orange,
    race: colors.accent.yellow,
  };
  return map[runType] || colors.text.tertiary;
};

const runTypeLabels: Record<string, string> = {
  easy: 'Easy Run',
  tempo: 'Tempo Run',
  interval: 'Intervals',
  long_run: 'Long Run',
  recovery: 'Recovery',
  fartlek: 'Fartlek',
  hill: 'Hill Training',
  race: 'Race',
};

export default function RunHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const distanceUnit = useDistanceUnit();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch run history
  const { data: runs, isLoading, refetch } = api.running.getActivities.useQuery({ limit: 50 });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderRun = ({ item }: { item: any }) => {
    const typeColor = getRunTypeColor(item.runType, colors);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/run/${item.id}`)}
        style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.md,
              backgroundColor: typeColor + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.md,
            }}
          >
            <Footprints size={24} color={typeColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
              }}
            >
              {item.name || runTypeLabels[item.runType] || 'Run'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
              <Calendar size={14} color={colors.text.tertiary} />
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.tertiary,
                  marginLeft: spacing.xs,
                }}
              >
                {formatDate(item.startedAt)}
              </Text>
            </View>
          </View>

          <ChevronRight size={20} color={colors.icon.secondary} />
        </View>

        {/* Run type badge */}
        {item.runType && (
          <View
            style={{
              position: 'absolute',
              top: spacing.sm,
              right: spacing.sm + 24,
              backgroundColor: typeColor + '20',
              paddingHorizontal: spacing.xs,
              paddingVertical: 2,
              borderRadius: borderRadius.sm,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                color: typeColor,
                textTransform: 'uppercase',
                fontWeight: fontWeight.medium,
              }}
            >
              {runTypeLabels[item.runType] || item.runType}
            </Text>
          </View>
        )}

        {/* Stats row */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
            gap: spacing.lg,
          }}
        >
          {item.distanceMeters > 0 && (
            <View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatDistance(item.distanceMeters, distanceUnit)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Distance</Text>
            </View>
          )}
          {item.durationSeconds > 0 && (
            <View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatDuration(item.durationSeconds)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Duration</Text>
            </View>
          )}
          {item.avgPaceSecondsPerKm > 0 && (
            <View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatPace(item.avgPaceSecondsPerKm, distanceUnit)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Pace</Text>
            </View>
          )}
        </View>

        {/* Heart rate if available */}
        {item.avgHeartRate && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: spacing.sm,
            }}
          >
            <Heart size={14} color={colors.activity.strength} />
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                marginLeft: spacing.xs,
              }}
            >
              Avg {item.avgHeartRate} bpm
              {item.maxHeartRate && ` (max ${item.maxHeartRate})`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginLeft: spacing.md,
          }}
        >
          Run History
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={runs}
        keyExtractor={(item) => item.id}
        renderItem={renderRun}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading runs...</Text>
            ) : (
              <>
                <Footprints size={48} color={colors.text.disabled} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: colors.text.secondary,
                    marginTop: spacing.md,
                  }}
                >
                  No runs yet
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                  Start your first run to see it here
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
