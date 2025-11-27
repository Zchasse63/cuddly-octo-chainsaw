import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  TrendingUp,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useWeightUnit, formatWeight, formatDuration } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

export default function WorkoutHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const weightUnit = useWeightUnit();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch workout history
  const { data: workouts, isLoading, refetch } = api.workout.history.useQuery({ limit: 50 });

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

  const renderWorkout = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/workout/${item.id}`)}
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
            backgroundColor: colors.accent.blue + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.md,
          }}
        >
          <Dumbbell size={24} color={colors.accent.blue} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {item.name || 'Workout'}
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
              {formatDate(item.completedAt || item.createdAt)}
            </Text>
            {item.durationSeconds && (
              <>
                <Clock
                  size={14}
                  color={colors.text.tertiary}
                  style={{ marginLeft: spacing.md }}
                />
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    color: colors.text.tertiary,
                    marginLeft: spacing.xs,
                  }}
                >
                  {formatDuration(item.durationSeconds)}
                </Text>
              </>
            )}
          </View>
        </View>

        <ChevronRight size={20} color={colors.icon.secondary} />
      </View>

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
        {item.totalSets > 0 && (
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {item.totalSets}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Sets</Text>
          </View>
        )}
        {item.totalReps > 0 && (
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {item.totalReps}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Reps</Text>
          </View>
        )}
        {item.totalVolume > 0 && (
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {Math.round(item.totalVolume).toLocaleString()}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
              Volume ({weightUnit})
            </Text>
          </View>
        )}
      </View>

      {/* Logging method badge */}
      {item.loggingMethod && (
        <View
          style={{
            position: 'absolute',
            top: spacing.sm,
            right: spacing.sm,
            backgroundColor: item.loggingMethod === 'voice' ? colors.accent.blue + '20' : colors.background.tertiary,
            paddingHorizontal: spacing.xs,
            paddingVertical: 2,
            borderRadius: borderRadius.sm,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: item.loggingMethod === 'voice' ? colors.accent.blue : colors.text.tertiary,
              textTransform: 'uppercase',
            }}
          >
            {item.loggingMethod}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
          Workout History
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkout}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading workouts...</Text>
            ) : (
              <>
                <Dumbbell size={48} color={colors.text.disabled} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: colors.text.secondary,
                    marginTop: spacing.md,
                  }}
                >
                  No workouts yet
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                  Start your first workout to see it here
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
