import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Clock, Dumbbell, Trophy, Calendar } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Card, Button } from '../../src/components/ui';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function WorkoutDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch workout details
  const { data: workout, isLoading } = api.workout.byId.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text.secondary }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.text.secondary, fontSize: fontSize.lg, textAlign: 'center' }}>
            Workout not found
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  // Destructure the nested workout data
  const workoutData = workout.workout;
  const sets = workout.sets;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group sets by exercise
  const setsByExercise = sets?.reduce((acc, set) => {
    const exerciseName = set.exerciseId || 'Unknown';
    if (!acc[exerciseName]) {
      acc[exerciseName] = [];
    }
    acc[exerciseName].push(set);
    return acc;
  }, {} as Record<string, typeof sets>);

  const totalVolume = sets?.reduce((acc, set) => {
    return acc + (set.weight || 0) * (set.reps || 0);
  }, 0) || 0;

  const prs = sets?.filter(set => set.isPr) || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: workoutData.name || 'Workout',
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Header Stats */}
          <Card style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.xl,
                fontWeight: fontWeight.bold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              {workoutData.name || 'Workout'}
            </Text>
            <Text style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
              {workoutData.completedAt
                ? formatDate(workoutData.completedAt)
                : formatDate(workoutData.createdAt)}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: colors.border.light,
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Clock size={20} color={colors.accent.blue} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginTop: spacing.xs,
                  }}
                >
                  {workoutData.duration ? formatDuration(workoutData.duration) : '--'}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                  Duration
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Dumbbell size={20} color={colors.accent.green} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginTop: spacing.xs,
                  }}
                >
                  {workout.sets?.length || 0}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                  Sets
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Trophy size={20} color={colors.accent.yellow} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    marginTop: spacing.xs,
                  }}
                >
                  {Math.round(totalVolume / 1000)}k
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                  Volume (lbs)
                </Text>
              </View>
            </View>
          </Card>

          {/* PRs */}
          {prs.length > 0 && (
            <>
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Personal Records
              </Text>
              <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.tint.success }}>
                {prs.map((pr, index) => (
                  <View
                    key={pr.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderBottomWidth: index < prs.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border.light,
                    }}
                  >
                    <Trophy size={16} color={colors.semantic.success} />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: spacing.sm,
                        fontSize: fontSize.base,
                        color: colors.text.primary,
                      }}
                    >
                      {pr.weight}{pr.weightUnit} × {pr.reps}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Sets by Exercise */}
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            Exercises
          </Text>

          {workout.sets && workout.sets.length > 0 ? (
            workout.sets.map((set, index) => (
              <Card key={set.id} style={{ marginBottom: spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
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
                      Set {set.setNumber}
                    </Text>
                    {set.loggingMethod === 'voice' && (
                      <Text style={{ fontSize: fontSize.xs, color: colors.accent.blue }}>
                        Voice logged
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        color: colors.text.secondary,
                      }}
                    >
                      {set.weight}{set.weightUnit} × {set.reps}
                    </Text>
                    {set.isPr && <Trophy size={16} color={colors.accent.yellow} />}
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card>
              <Text
                style={{
                  fontSize: fontSize.base,
                  color: colors.text.tertiary,
                  textAlign: 'center',
                }}
              >
                No sets logged
              </Text>
            </Card>
          )}

          {/* Notes */}
          {workoutData.notes && (
            <>
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginTop: spacing.lg,
                  marginBottom: spacing.sm,
                }}
              >
                Notes
              </Text>
              <Card>
                <Text style={{ color: colors.text.secondary }}>{workoutData.notes}</Text>
              </Card>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
