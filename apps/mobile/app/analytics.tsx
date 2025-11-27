import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Dumbbell,
  Footprints,
  Flame,
  Trophy,
  Activity,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useWeightUnit, useDistanceUnit, formatWeight, formatDistance } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type TimeRange = '7d' | '30d' | '90d' | 'year' | 'all';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'year', label: '1Y' },
  { value: 'all', label: 'All' },
];

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const weightUnit = useWeightUnit();
  const distanceUnit = useDistanceUnit();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Fetch analytics data
  const { data: stats } = api.analytics.getStats.useQuery({ timeRange });
  const { data: strengthProgress } = api.analytics.getStrengthProgress.useQuery({ timeRange });
  const { data: runningProgress } = api.analytics.getRunningProgress.useQuery({ timeRange });
  const { data: weeklyVolume } = api.analytics.getWeeklyVolume.useQuery({ timeRange });

  const screenWidth = Dimensions.get('window').width - spacing.md * 2;

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
          Analytics
        </Text>
      </View>

      {/* Time Range Selector */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        {TIME_RANGES.map((range) => (
          <TouchableOpacity
            key={range.value}
            onPress={() => setTimeRange(range.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: timeRange === range.value ? colors.accent.blue : colors.background.secondary,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: timeRange === range.value ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Overview Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          <StatBox
            icon={<Dumbbell size={20} color={colors.accent.blue} />}
            value={stats?.totalWorkouts?.toString() || '0'}
            label="Workouts"
            colors={colors}
          />
          <StatBox
            icon={<Footprints size={20} color="#4ECDC4" />}
            value={stats?.totalRuns?.toString() || '0'}
            label="Runs"
            colors={colors}
          />
          <StatBox
            icon={<Clock size={20} color="#FFE66D" />}
            value={formatHours(stats?.totalMinutes || 0)}
            label="Training Time"
            colors={colors}
          />
          <StatBox
            icon={<Flame size={20} color="#FF6B6B" />}
            value={stats?.longestStreak?.toString() || '0'}
            label="Best Streak"
            colors={colors}
          />
        </View>

        {/* Strength Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Dumbbell size={18} color={colors.accent.blue} />
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginLeft: spacing.xs,
              }}
            >
              Strength Training
            </Text>
          </View>

          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Total Volume</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {formatWeight(stats?.totalVolume || 0, weightUnit)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Total Sets</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {stats?.totalSets || 0}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>PRs Set</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFE66D' }}>
                  {stats?.prsSet || 0}
                </Text>
              </View>
            </View>
          </Card>

          {/* Volume Chart Placeholder */}
          {weeklyVolume && weeklyVolume.length > 0 && (
            <Card>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
                Weekly Volume Trend
              </Text>
              <View style={{ height: 120 }}>
                <SimpleBarChart data={weeklyVolume} colors={colors} color={colors.accent.blue} />
              </View>
            </Card>
          )}
        </View>

        {/* Running Section */}
        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Footprints size={18} color="#4ECDC4" />
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginLeft: spacing.xs,
              }}
            >
              Running
            </Text>
          </View>

          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Total Distance</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {formatDistance((stats?.totalDistanceMeters || 0), distanceUnit)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Avg Pace</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {formatPace(stats?.avgPace || 0, distanceUnit)}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Elevation</Text>
                <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                  {Math.round(stats?.totalElevation || 0)}m
                </Text>
              </View>
            </View>
          </Card>

          {/* Running Progress Chart */}
          {runningProgress && runningProgress.length > 0 && (
            <Card>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
                Weekly Mileage
              </Text>
              <View style={{ height: 120 }}>
                <SimpleBarChart data={runningProgress} colors={colors} color="#4ECDC4" />
              </View>
            </Card>
          )}
        </View>

        {/* Top Exercises */}
        {strengthProgress && strengthProgress.topExercises && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <TrendingUp size={18} color={colors.text.primary} />
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.xs,
                }}
              >
                Top Exercises
              </Text>
            </View>

            {strengthProgress.topExercises.map((exercise: any, index: number) => (
              <Card key={index} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.accent.blue + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.accent.blue }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text.primary }}>
                      {exercise.name}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      {exercise.setCount} sets • {formatWeight(exercise.totalVolume, weightUnit)} volume
                    </Text>
                  </View>
                  {exercise.pr && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Trophy size={14} color="#FFE66D" />
                      <Text style={{ fontSize: fontSize.sm, color: '#FFE66D', marginLeft: spacing.xs }}>
                        {formatWeight(exercise.pr, weightUnit)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Personal Records */}
        <TouchableOpacity onPress={() => router.push('/personal-records')}>
          <Card style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trophy size={24} color="#FFE66D" />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Personal Records
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                  View all your PRs and achievements
                </Text>
              </View>
              <TrendingUp size={20} color={colors.icon.secondary} />
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  colors: any;
}) {
  return (
    <View
      style={{
        width: '48%',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: fontSize.xl,
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          marginTop: spacing.xs,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{label}</Text>
    </View>
  );
}

function SimpleBarChart({
  data,
  colors,
  color,
}: {
  data: { value: number; label?: string }[];
  colors: any;
  color: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {data.map((item, index) => {
        const height = (item.value / maxValue) * 100;
        return (
          <View key={index} style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                width: '80%',
                height: `${Math.max(height, 5)}%`,
                backgroundColor: color,
                borderRadius: 4,
              }}
            />
            {item.label && (
              <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4 }}>
                {item.label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatPace(secondsPerKm: number, unit: 'km' | 'mi'): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';

  let pace = secondsPerKm;
  if (unit === 'mi') {
    pace = secondsPerKm * 1.60934;
  }

  const mins = Math.floor(pace / 60);
  const secs = Math.round(pace % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/${unit}`;
}
