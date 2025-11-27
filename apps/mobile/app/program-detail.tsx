import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Footprints,
  Play,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

export default function ProgramDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  // Fetch program details
  const { data: program, isLoading } = api.calendar.getProgram.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  // Start program mutation
  const startProgramMutation = api.calendar.startProgram.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Program started! Check your calendar for scheduled workouts.');
      router.push('/calendar');
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to start program');
    },
  });

  const handleStartProgram = () => {
    Alert.alert(
      'Start Program',
      `This will schedule workouts from "${program?.name}" to your calendar. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => startProgramMutation.mutate({ programId: id || '' }),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text.secondary }}>Loading program...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Calendar size={48} color={colors.text.disabled} />
          <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.md }}>
            Program not found
          </Text>
          <Button onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const totalWorkouts = program.weeks?.reduce(
    (sum: number, week: any) => sum + (week.days?.length || 0),
    0
  ) || 0;

  const completedWorkouts = program.weeks?.reduce(
    (sum: number, week: any) =>
      sum + (week.days?.filter((d: any) => d.status === 'completed').length || 0),
    0
  ) || 0;

  const progressPercent = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

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
          numberOfLines={1}
        >
          {program.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Program Overview Card */}
        <Card style={{ marginBottom: spacing.lg }}>
          {/* Type Badge */}
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: program.type === 'running' ? '#4ECDC420' : colors.accent.blue + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.xs,
                color: program.type === 'running' ? '#4ECDC4' : colors.accent.blue,
                fontWeight: fontWeight.medium,
                textTransform: 'uppercase',
              }}
            >
              {program.type}
            </Text>
          </View>

          {/* Description */}
          {program.description && (
            <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginBottom: spacing.md }}>
              {program.description}
            </Text>
          )}

          {/* Stats Row */}
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Calendar size={16} color={colors.text.tertiary} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginLeft: spacing.xs,
                  }}
                >
                  {program.weeks?.length || 0}
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Weeks</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {program.type === 'running' ? (
                  <Footprints size={16} color={colors.text.tertiary} />
                ) : (
                  <Dumbbell size={16} color={colors.text.tertiary} />
                )}
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginLeft: spacing.xs,
                  }}
                >
                  {totalWorkouts}
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Workouts</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Target size={16} color={colors.text.tertiary} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginLeft: spacing.xs,
                  }}
                >
                  {program.goal || 'General'}
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Goal</Text>
            </View>
          </View>

          {/* Progress Bar (if active) */}
          {program.status === 'active' && (
            <View style={{ marginTop: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Progress</Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                  {completedWorkouts}/{totalWorkouts}
                </Text>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.background.tertiary,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: colors.accent.green,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Start/Continue Button */}
        {program.status !== 'completed' && (
          <Button
            onPress={handleStartProgram}
            fullWidth
            disabled={startProgramMutation.isPending}
            style={{ marginBottom: spacing.lg }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Play size={18} color={colors.text.onAccent} style={{ marginRight: spacing.xs }} />
              <Text style={{ color: colors.text.onAccent, fontWeight: fontWeight.semibold }}>
                {program.status === 'active' ? 'Continue Program' : 'Start Program'}
              </Text>
            </View>
          </Button>
        )}

        {/* Weeks */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Program Schedule
        </Text>

        {program.weeks?.map((week: any, weekIndex: number) => {
          const isExpanded = expandedWeek === weekIndex;
          const weekComplete = week.days?.every((d: any) => d.status === 'completed');

          return (
            <Card key={weekIndex} padding="none" style={{ marginBottom: spacing.sm }}>
              <TouchableOpacity
                onPress={() => setExpandedWeek(isExpanded ? null : weekIndex)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                }}
              >
                {weekComplete ? (
                  <CheckCircle2 size={20} color={colors.accent.green} />
                ) : (
                  <Circle size={20} color={colors.text.disabled} />
                )}
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    Week {weekIndex + 1}
                    {week.name && ` - ${week.name}`}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                    {week.days?.length || 0} workouts
                    {week.focus && ` • ${week.focus}`}
                  </Text>
                </View>
                {isExpanded ? (
                  <ChevronDown size={20} color={colors.icon.secondary} />
                ) : (
                  <ChevronRight size={20} color={colors.icon.secondary} />
                )}
              </TouchableOpacity>

              {/* Expanded Week Content */}
              {isExpanded && (
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.border.light,
                    paddingHorizontal: spacing.md,
                    paddingBottom: spacing.md,
                  }}
                >
                  {week.days?.map((day: any, dayIndex: number) => (
                    <TouchableOpacity
                      key={dayIndex}
                      onPress={() => {
                        if (day.activityType === 'running') {
                          router.push('/(tabs)/run');
                        } else {
                          router.push('/(tabs)/workout');
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: spacing.sm,
                        borderBottomWidth: dayIndex < (week.days?.length || 0) - 1 ? 1 : 0,
                        borderBottomColor: colors.border.light,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: borderRadius.sm,
                          backgroundColor: day.isRestDay
                            ? colors.background.tertiary
                            : day.activityType === 'running'
                            ? '#4ECDC420'
                            : colors.accent.blue + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: spacing.sm,
                        }}
                      >
                        {day.isRestDay ? (
                          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                            REST
                          </Text>
                        ) : day.activityType === 'running' ? (
                          <Footprints size={16} color="#4ECDC4" />
                        ) : (
                          <Dumbbell size={16} color={colors.accent.blue} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: fontSize.sm,
                            fontWeight: fontWeight.medium,
                            color: colors.text.primary,
                          }}
                        >
                          {day.title || (day.isRestDay ? 'Rest Day' : 'Workout')}
                        </Text>
                        {day.estimatedDuration && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Clock size={12} color={colors.text.tertiary} />
                            <Text
                              style={{
                                fontSize: fontSize.xs,
                                color: colors.text.tertiary,
                                marginLeft: spacing.xs,
                              }}
                            >
                              ~{Math.round(day.estimatedDuration / 60)} min
                            </Text>
                          </View>
                        )}
                      </View>
                      {day.status === 'completed' && (
                        <CheckCircle2 size={18} color={colors.accent.green} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
