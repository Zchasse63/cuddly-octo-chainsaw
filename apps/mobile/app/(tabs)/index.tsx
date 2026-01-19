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
import { TodaysWorkoutCard } from '../../src/components/home/TodaysWorkoutCard';
import { WeeklySummary } from '../../src/components/home/WeeklySummary';
import { RecentActivityList } from '../../src/components/home/RecentActivityList';
import { ReadinessPromptModal } from '../../src/components/home/ReadinessPromptModal';

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);

  // Mutations
  const submitReadiness = api.readiness.submit.useMutation();

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
        <ReadinessPromptModal
          visible={!readiness}
          onSubmit={async (data) => {
            await submitReadiness.mutateAsync({
              sleepQuality: data.sleepQuality,
              energyLevel: data.energy,
              motivation: data.motivation,
              soreness: data.soreness,
              notes: data.notes,
            });
            await refetchReadiness();
          }}
          onDismiss={() => {
            // User dismissed without logging - will show again next app open
          }}
        />

        {/* Today's Training */}
        <TodaysWorkoutCard workout={todaysTraining?.[0] ? {
          id: todaysTraining[0].id,
          title: todaysTraining[0].title,
          estimatedDuration: todaysTraining[0].estimatedDuration || undefined,
          exercises: []
        } : null} />

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

        {/* Weekly Summary */}
        <WeeklySummary data={{
          workoutsCompleted: workouts?.length || 0,
          workoutsPlanned: 5,
          totalVolume: 0,
          prCount: 0
        }} />

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

        {/* Recent Activity */}
        <RecentActivityList workouts={(workouts || []).map(w => ({
          id: w.id,
          type: 'workout' as const,
          name: w.name || 'Workout',
          completedAt: w.completedAt?.toISOString() || new Date().toISOString(),
          durationSeconds: w.duration || undefined,
          totalSets: undefined
        }))} runs={[]} />
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
