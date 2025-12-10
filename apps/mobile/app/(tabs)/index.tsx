import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Flame,
  Trophy,
  Calendar,
  TrendingUp,
  Dumbbell,
  Footprints,
  ChevronRight,
  Clock,
  Sparkles,
  History,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { formatDuration } from '../../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data
  const { data: workouts, refetch: refetchWorkouts } = api.workout.history.useQuery(
    { limit: 3 },
    { enabled: !!user }
  );

  const { data: readiness, refetch: refetchReadiness } = api.readiness.today.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: todaysTraining, refetch: refetchTraining } = api.calendar.getToday.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: streaksData, refetch: refetchStats } = api.gamification.getStreaks.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Extract workout streak from streaks array
  const workoutStreak = streaksData?.find((s) => s.streakType === 'workout');

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWorkouts(), refetchReadiness(), refetchTraining(), refetchStats()]);
    setRefreshing(false);
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // If not logged in
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

  const userName = user.user_metadata?.name?.split(' ')[0] || 'there';

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
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            {getGreeting()},
          </Text>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            {userName}
          </Text>
        </View>

        {/* Readiness Check-In Prompt */}
        {!readiness && (
          <TouchableOpacity
            onPress={() => router.push('/readiness')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              backgroundColor: colors.accent.blue + '15',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.lg,
              borderWidth: 1,
              borderColor: colors.accent.blue + '30',
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              <Sparkles size={20} color={colors.text.onAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                Morning Check-In
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                Log your readiness for personalized recommendations
              </Text>
            </View>
            <ChevronRight size={20} color={colors.accent.blue} />
          </TouchableOpacity>
        )}

        {/* Today's Training */}
        {todaysTraining && todaysTraining.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Calendar size={18} color={colors.text.primary} />
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.xs,
                }}
              >
                Today's Training
              </Text>
            </View>

            {todaysTraining.map((item: any) => (
              <Card key={item.id} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: borderRadius.md,
                      backgroundColor: item.activityType === 'running'
                        ? '#4ECDC420'
                        : colors.accent.blue + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    {item.activityType === 'running' ? (
                      <Footprints size={24} color="#4ECDC4" />
                    ) : (
                      <Dumbbell size={24} color={colors.accent.blue} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                      {item.title}
                    </Text>
                    {item.estimatedDuration && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Clock size={14} color={colors.text.tertiary} />
                        <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                          ~{Math.round(item.estimatedDuration / 60)} min
                        </Text>
                      </View>
                    )}
                  </View>
                  <Button
                    size="sm"
                    onPress={() => {
                      if (item.activityType === 'running') {
                        router.push('/(tabs)/run');
                      } else {
                        router.push('/(tabs)/workout');
                      }
                    }}
                  >
                    Start
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        )}

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
              onPress={() => router.push('/(tabs)/chat')}
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
          {/* Readiness Score */}
          <Card style={{ flex: 1 }} variant="elevated">
            <View style={{ alignItems: 'center' }}>
              <Flame size={24} color={readiness ? getReadinessColor(readiness.overallScore ?? 0) : colors.text.disabled} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {readiness?.overallScore || '--'}
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
              <Trophy size={24} color="#FFE66D" />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {workoutStreak?.currentStreak || 0}
              </Text>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: colors.text.tertiary,
                }}
              >
                Day Streak
              </Text>
            </View>
          </Card>

          {/* This Week */}
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
        </View>

        {/* Quick Links */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <QuickLink
            icon={<History size={20} color={colors.accent.blue} />}
            label="History"
            onPress={() => router.push('/workout-history')}
            colors={colors}
          />
          <QuickLink
            icon={<Trophy size={20} color="#FFE66D" />}
            label="PRs"
            onPress={() => router.push('/personal-records')}
            colors={colors}
          />
          <QuickLink
            icon={<Dumbbell size={20} color="#FF6B6B" />}
            label="Exercises"
            onPress={() => router.push('/exercises')}
            colors={colors}
          />
          <QuickLink
            icon={<Calendar size={20} color="#4ECDC4" />}
            label="Calendar"
            onPress={() => router.push('/calendar')}
            colors={colors}
          />
        </View>

        {/* Recent Workouts */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            Recent Activity
          </Text>
          <TouchableOpacity onPress={() => router.push('/workout-history')}>
            <Text style={{ fontSize: fontSize.sm, color: colors.accent.blue }}>
              See All
            </Text>
          </TouchableOpacity>
        </View>

        {workouts && workouts.length > 0 ? (
          workouts.map((workout: any) => (
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.accent.blue + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Dumbbell size={20} color={colors.accent.blue} />
                  </View>
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
                        ? formatRelativeDate(workout.completedAt)
                        : 'In progress'}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {workout.durationSeconds && (
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                      {formatDuration(workout.durationSeconds)}
                    </Text>
                  )}
                  {workout.totalSets > 0 && (
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      {workout.totalSets} sets
                    </Text>
                  )}
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

function QuickLink({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        padding: spacing.sm,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: fontSize.xs,
          color: colors.text.secondary,
          marginTop: spacing.xs,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function getReadinessColor(score: number): string {
  if (score >= 80) return '#4ECDC4';
  if (score >= 60) return '#FFE66D';
  if (score >= 40) return '#FFA500';
  return '#FF6B6B';
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
