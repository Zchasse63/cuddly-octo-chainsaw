import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Flame, Trophy, Calendar, TrendingUp } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch workout history
  const { data: workouts, refetch: refetchWorkouts } = api.workout.history.useQuery(
    { limit: 5 },
    { enabled: !!user }
  );

  // Fetch readiness
  const { data: readiness, refetch: refetchReadiness } = api.readiness.today.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch weekly volume
  const { data: weeklyVolume, refetch: refetchVolume } = api.workout.weeklyVolume.useQuery(
    undefined,
    { enabled: !!user }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWorkouts(), refetchReadiness(), refetchVolume()]);
    setRefreshing(false);
  };

  // If not logged in, redirect to auth
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.md,
            }}
          >
            VoiceFit
          </Text>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.text.secondary,
              textAlign: 'center',
              marginBottom: spacing.xl,
            }}
          >
            Voice-first fitness tracking
          </Text>
          <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
          <View style={{ height: spacing.md }} />
          <Button variant="outline" onPress={() => router.push('/(auth)/signup')}>
            Create Account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Dashboard
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              marginTop: spacing.xs,
            }}
          >
            Welcome back! Ready to train?
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <View style={{ flex: 1 }}>
            <Button onPress={() => router.push('/(tabs)/workout')} fullWidth>
              Start Workout
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              onPress={() => router.push('/(tabs)/coach')}
              fullWidth
            >
              Ask Coach
            </Button>
          </View>
        </View>

        {/* Stats Cards */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {/* Readiness */}
          <Card style={{ flex: 1 }} variant="elevated">
            <View style={{ alignItems: 'center' }}>
              <Flame size={24} color={colors.accent.orange} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {readiness?.overallScore || '-'}
              </Text>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.tertiary,
                }}
              >
                Readiness
              </Text>
            </View>
          </Card>

          {/* Streak */}
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
                {workouts?.length || 0}
              </Text>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.tertiary,
                }}
              >
                This Week
              </Text>
            </View>
          </Card>

          {/* Volume */}
          <Card style={{ flex: 1 }} variant="elevated">
            <View style={{ alignItems: 'center' }}>
              <TrendingUp size={24} color={colors.accent.green} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {weeklyVolume?.length ?
                  Math.round((weeklyVolume as any[]).reduce((a, b) => a + Number(b.volume || 0), 0) / 1000) + 'k'
                  : '-'}
              </Text>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.tertiary,
                }}
              >
                Volume (lbs)
              </Text>
            </View>
          </Card>
        </View>

        {/* Recent Workouts */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Recent Workouts
        </Text>

        {workouts && workouts.length > 0 ? (
          workouts.map((workout) => (
            <Card
              key={workout.id}
              style={{ marginBottom: spacing.sm }}
              onPress={() => router.push(`/workout/${workout.id}`)}
            >
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
                    {workout.name || 'Workout'}
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      color: colors.text.tertiary,
                    }}
                  >
                    {workout.completedAt
                      ? new Date(workout.completedAt).toLocaleDateString()
                      : 'In progress'}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: colors.tint.accent,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.full,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.xs,
                      color: colors.accent.blue,
                      fontWeight: fontWeight.medium,
                    }}
                  >
                    {workout.duration
                      ? `${Math.round(workout.duration / 60)}min`
                      : 'Active'}
                  </Text>
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
              No workouts yet. Start your first one!
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
