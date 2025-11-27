import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Dumbbell, Target, BarChart3, Trophy } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Card, Button } from '../../src/components/ui';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function ExerciseDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch exercise details
  const { data: exercise, isLoading: exerciseLoading } = api.exercise.byId.useQuery(
    { id: id! },
    { enabled: !!id }
  );

  // Fetch exercise history
  const { data: history, isLoading: historyLoading } = api.workout.exerciseHistory.useQuery(
    { exerciseId: id!, limit: 10 },
    { enabled: !!id }
  );

  // Fetch PRs for this exercise
  const { data: prs } = api.workout.exercisePRs.useQuery(
    { exerciseId: id! },
    { enabled: !!id }
  );

  const isLoading = exerciseLoading || historyLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text.secondary }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.text.secondary, fontSize: fontSize.lg, textAlign: 'center' }}>
            Exercise not found
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: exercise.name,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Exercise Info */}
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.accent.blue,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}
              >
                <Dumbbell size={24} color={colors.text.onAccent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                  }}
                >
                  {exercise.name}
                </Text>
                <Text style={{ color: colors.text.secondary, marginTop: spacing.xs }}>
                  {exercise.primaryMuscle}
                </Text>
              </View>
            </View>

            {exercise.description && (
              <Text style={{ color: colors.text.secondary, marginBottom: spacing.md }}>
                {exercise.description}
              </Text>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {exercise.equipment?.map((eq, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: colors.tint.accent,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Text style={{ color: colors.accent.blue, fontSize: fontSize.xs }}>
                    {eq}
                  </Text>
                </View>
              ))}
              {exercise.movementPattern && (
                <View
                  style={{
                    backgroundColor: colors.tint.success,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Text style={{ color: colors.semantic.success, fontSize: fontSize.xs }}>
                    {exercise.movementPattern}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Personal Records */}
          {prs && prs.length > 0 && (
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
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              >
                <Card style={{ flex: 1 }} variant="elevated">
                  <View style={{ alignItems: 'center' }}>
                    <Trophy size={24} color={colors.accent.yellow} />
                    <Text
                      style={{
                        fontSize: fontSize.xl,
                        fontWeight: fontWeight.bold,
                        color: colors.text.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {prs[0]?.weight || '--'}{prs[0]?.weightUnit || 'lbs'}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      1RM
                    </Text>
                  </View>
                </Card>

                <Card style={{ flex: 1 }} variant="elevated">
                  <View style={{ alignItems: 'center' }}>
                    <BarChart3 size={24} color={colors.accent.green} />
                    <Text
                      style={{
                        fontSize: fontSize.xl,
                        fontWeight: fontWeight.bold,
                        color: colors.text.primary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {prs[0]?.estimated1rm ? Math.round(prs[0].estimated1rm) : '--'}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      Est. 1RM
                    </Text>
                  </View>
                </Card>
              </View>
            </>
          )}

          {/* History */}
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            Recent History
          </Text>

          {history && history.length > 0 ? (
            history.map((set) => (
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
                      {set.weight}{set.weightUnit} × {set.reps}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      {formatDate(set.createdAt)}
                    </Text>
                  </View>
                  {set.isPr && (
                    <View
                      style={{
                        backgroundColor: colors.tint.warning,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: borderRadius.full,
                      }}
                    >
                      <Text style={{ color: colors.accent.yellow, fontSize: fontSize.xs, fontWeight: fontWeight.medium }}>
                        PR
                      </Text>
                    </View>
                  )}
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
                No history yet. Start logging sets!
              </Text>
            </Card>
          )}

          {/* Instructions */}
          {exercise.instructions && (
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
                Instructions
              </Text>
              <Card>
                <Text style={{ color: colors.text.secondary, lineHeight: 22 }}>
                  {exercise.instructions}
                </Text>
              </Card>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
