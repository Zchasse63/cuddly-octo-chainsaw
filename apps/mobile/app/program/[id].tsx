import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Play } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function ProgramDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));

  const { data: program, isLoading } = api.calendar.getProgram.useQuery({ programId: id! });
  const { data: adherence } = api.calendar.getAdherenceStats.useQuery({ programId: id!, period: 'all' });

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const findNextWorkout = () => {
    if (!program?.weeks) return null;
    for (const week of program.weeks) {
      for (const day of week.days || []) {
        if (!day.isCompleted) {
          return { week: week.weekNumber, day };
        }
      }
    }
    return null;
  };

  const nextWorkout = findNextWorkout();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent.blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: fontSize.base, color: colors.text.secondary }}>Program not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((program.currentWeek || 0) / (program.durationWeeks || 1)) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <ArrowLeft size={24} color={colors.icon.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          {program.name}
        </Text>
      </View>

      <ScrollView>
        {/* Program Info */}
        <View style={{ padding: spacing.md }}>
          <View
            style={{
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: fontSize['2xl'],
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              {program.name}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md }}>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Duration</Text>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  {program.durationWeeks} weeks
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Days/Week</Text>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  {program.daysPerWeek} days
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Progress</Text>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  {Math.round(progress)}%
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View
              style={{
                height: 8,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.sm,
                overflow: 'hidden',
                marginBottom: spacing.sm,
              }}
            >
              <View
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: colors.accent.blue,
                }}
              />
            </View>

            {/* Adherence */}
            {adherence && (
              <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                Adherence: {adherence.adherenceRate}% • {adherence.completed} completed • {adherence.skipped} skipped
              </Text>
            )}
          </View>

          {/* Next Workout CTA */}
          {nextWorkout && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/workout', params: { programDayId: nextWorkout.day.id } })}
              style={{
                backgroundColor: colors.accent.blue,
                borderRadius: borderRadius.md,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Play size={20} color={colors.text.onAccent} />
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.onAccent,
                  marginLeft: spacing.sm,
                }}
              >
                Start Next Workout
              </Text>
            </TouchableOpacity>
          )}

          {/* Week Breakdown */}
          <Text
            style={{
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            Program Weeks
          </Text>

          {program.weeks?.map((week) => (
            <View
              key={week.id}
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.md,
                marginBottom: spacing.sm,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={() => toggleWeek(week.weekNumber)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.md,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Week {week.weekNumber}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                    {week.days?.length || 0} workouts
                  </Text>
                </View>
                {expandedWeeks.has(week.weekNumber) ? (
                  <ChevronDown size={20} color={colors.icon.primary} />
                ) : (
                  <ChevronRight size={20} color={colors.icon.primary} />
                )}
              </TouchableOpacity>

              {expandedWeeks.has(week.weekNumber) && week.days && (
                <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
                  {week.days.map((day) => (
                    <View
                      key={day.id}
                      style={{
                        backgroundColor: colors.background.tertiary,
                        borderRadius: borderRadius.sm,
                        padding: spacing.sm,
                        marginBottom: spacing.xs,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary }}>
                          Day {day.dayOfWeek + 1}
                        </Text>
                        {day.isCompleted && (
                          <Text style={{ fontSize: fontSize.xs, color: colors.status.success }}>✓ Completed</Text>
                        )}
                      </View>
                      {day.exercises?.map((ex) => (
                        <Text key={ex.id} style={{ fontSize: fontSize.xs, color: colors.text.secondary, marginLeft: spacing.sm }}>
                          • {ex.exercise.name} {ex.sets && `(${ex.sets} sets)`}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
