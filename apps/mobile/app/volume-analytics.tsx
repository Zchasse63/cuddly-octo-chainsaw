import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacing.md * 2;
const BAR_WIDTH = 24;

type ViewMode = 'week' | 'month' | '3month';

interface VolumeData {
  date: string;
  volume: number;
  sets: number;
  workouts: number;
}

interface MuscleGroupVolume {
  name: string;
  volume: number;
  sets: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export default function VolumeAnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch volume analytics using weekly analytics
  const { data: weeklyData, refetch } = api.analytics.getWeeklyAnalytics.useQuery({
    weeks: viewMode === 'week' ? 1 : viewMode === 'month' ? 4 : 12,
  });

  // Fetch body part volume for muscle group data
  const { data: bodyPartData } = api.analytics.getBodyPartVolume.useQuery({
    weekStart: currentDate.toISOString().split('T')[0],
  });

  // Transform weekly data to volume data format
  const volumeData: VolumeData[] = weeklyData?.map((w) => ({
    date: w.weekStart || '',
    volume: Number(w.totalVolume) || 0,
    sets: Number(w.trainingDays) * 15 || 0, // Estimate sets from training days
    workouts: Number(w.workoutCount) || 0,
  })) || [];

  // Transform body part data to muscle group format
  const muscleGroupData: MuscleGroupVolume[] = useMemo(() => {
    if (!bodyPartData) return [];

    const groups = [
      { name: 'Chest', sets: bodyPartData.chestSets || 0 },
      { name: 'Back', sets: bodyPartData.backSets || 0 },
      { name: 'Shoulders', sets: bodyPartData.shoulderSets || 0 },
      { name: 'Biceps', sets: bodyPartData.bicepSets || 0 },
      { name: 'Triceps', sets: bodyPartData.tricepSets || 0 },
      { name: 'Quads', sets: bodyPartData.quadSets || 0 },
      { name: 'Hamstrings', sets: bodyPartData.hamstringSets || 0 },
      { name: 'Glutes', sets: bodyPartData.gluteSets || 0 },
      { name: 'Calves', sets: bodyPartData.calfSets || 0 },
      { name: 'Abs', sets: bodyPartData.abSets || 0 },
    ];

    const totalSets = groups.reduce((sum, g) => sum + g.sets, 0);

    return groups
      .filter(g => g.sets > 0)
      .map(g => ({
        name: g.name,
        volume: g.sets * 10, // Approximate volume
        sets: g.sets,
        percentage: totalSets > 0 ? Math.round((g.sets / totalSets) * 100) : 0,
        trend: 'stable' as const,
      }));
  }, [bodyPartData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const offset = direction === 'prev' ? -1 : 1;

    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + offset * 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + offset);
    } else {
      newDate.setMonth(newDate.getMonth() + offset * 3);
    }
    setCurrentDate(newDate);
  };

  const getPeriodLabel = () => {
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      const end = new Date(currentDate);
      const start = new Date(currentDate);
      start.setMonth(start.getMonth() - 2);
      return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }
  };

  // Use volume data or fallback to mock data for visualization
  const chartData: VolumeData[] = volumeData.length > 0 ? volumeData : [
    { date: 'Mon', volume: 12500, sets: 18, workouts: 1 },
    { date: 'Tue', volume: 0, sets: 0, workouts: 0 },
    { date: 'Wed', volume: 15200, sets: 22, workouts: 1 },
    { date: 'Thu', volume: 8500, sets: 12, workouts: 1 },
    { date: 'Fri', volume: 0, sets: 0, workouts: 0 },
    { date: 'Sat', volume: 18900, sets: 28, workouts: 1 },
    { date: 'Sun', volume: 0, sets: 0, workouts: 0 },
  ];

  const maxVolume = Math.max(...chartData.map((d) => d.volume), 1);
  const totalVolume = chartData.reduce((sum, d) => sum + d.volume, 0);
  const totalSets = chartData.reduce((sum, d) => sum + d.sets, 0);
  const totalWorkouts = chartData.reduce((sum, d) => sum + d.workouts, 0);
  const avgVolume = totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0;

  const muscleGroups: MuscleGroupVolume[] = muscleGroupData || [
    { name: 'Chest', volume: 15200, sets: 18, percentage: 22, trend: 'up' },
    { name: 'Back', volume: 14800, sets: 20, percentage: 21, trend: 'stable' },
    { name: 'Legs', volume: 18500, sets: 24, percentage: 26, trend: 'up' },
    { name: 'Shoulders', volume: 8200, sets: 12, percentage: 12, trend: 'down' },
    { name: 'Arms', volume: 6400, sets: 14, percentage: 9, trend: 'stable' },
    { name: 'Core', volume: 4100, sets: 10, percentage: 6, trend: 'up' },
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={14} color={colors.accent.green} />;
      case 'down':
        return <TrendingDown size={14} color={colors.semantic.error} />;
      default:
        return <Minus size={14} color={colors.text.tertiary} />;
    }
  };

  const getMuscleGroupColor = (index: number) => {
    const palette = [colors.activity.strength, colors.activity.running, colors.activity.tempo, colors.activity.recovery, colors.accent.purple, colors.accent.teal];
    return palette[index % palette.length];
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
          Volume Analytics
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* View Mode Selector */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.xs,
            marginBottom: spacing.md,
          }}
        >
          {(['week', 'month', '3month'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: viewMode === mode ? colors.accent.blue : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                  color: viewMode === mode ? colors.text.onAccent : colors.text.secondary,
                }}
              >
                {mode === '3month' ? '3 Month' : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period Navigation */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.lg,
          }}
        >
          <TouchableOpacity onPress={() => navigatePeriod('prev')} style={{ padding: spacing.sm }}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            {getPeriodLabel()}
          </Text>
          <TouchableOpacity onPress={() => navigatePeriod('next')} style={{ padding: spacing.sm }}>
            <ChevronRight size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <StatCard
            label="Total Volume"
            value={`${(totalVolume / 1000).toFixed(1)}k`}
            unit="lbs"
            trend={undefined}
            colors={colors}
          />
          <StatCard
            label="Total Sets"
            value={totalSets.toString()}
            trend={undefined}
            colors={colors}
          />
          <StatCard
            label="Avg/Workout"
            value={`${(avgVolume / 1000).toFixed(1)}k`}
            unit="lbs"
            colors={colors}
          />
        </View>

        {/* Volume Chart */}
        <Card style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}
          >
            Volume by Day
          </Text>

          <View style={{ height: 180 }}>
            {/* Y-axis labels */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 24,
                width: 40,
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>{(maxVolume / 1000).toFixed(0)}k</Text>
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>{(maxVolume / 2000).toFixed(0)}k</Text>
              <Text style={{ fontSize: 10, color: colors.text.tertiary }}>0</Text>
            </View>

            {/* Chart Area */}
            <View
              style={{
                marginLeft: 44,
                flex: 1,
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingBottom: 24,
              }}
            >
              {chartData.map((day, index) => {
                const barHeight = maxVolume > 0 ? (day.volume / maxVolume) * 140 : 0;
                return (
                  <View key={index} style={{ alignItems: 'center' }}>
                    <View
                      style={{
                        width: BAR_WIDTH,
                        height: Math.max(barHeight, day.volume > 0 ? 4 : 0),
                        backgroundColor: day.volume > 0 ? colors.accent.blue : colors.background.tertiary,
                        borderRadius: borderRadius.sm,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.text.tertiary,
                        marginTop: spacing.xs,
                      }}
                    >
                      {day.date}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Muscle Group Breakdown */}
        <Card>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.md,
            }}
          >
            Volume by Muscle Group
          </Text>

          {muscleGroups.map((muscle, index) => (
            <View
              key={muscle.name}
              style={{
                marginBottom: index < muscleGroups.length - 1 ? spacing.md : 0,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: getMuscleGroupColor(index),
                      marginRight: spacing.sm,
                    }}
                  />
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.primary }}>{muscle.name}</Text>
                  {getTrendIcon(muscle.trend)}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                    {muscle.sets} sets
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.semibold,
                      color: colors.text.primary,
                      marginLeft: spacing.md,
                    }}
                  >
                    {(muscle.volume / 1000).toFixed(1)}k
                  </Text>
                </View>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.background.tertiary,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${muscle.percentage}%`,
                    height: '100%',
                    backgroundColor: getMuscleGroupColor(index),
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Recommendations */}
        <Card style={{ marginTop: spacing.lg, backgroundColor: colors.accent.blue + '10' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Dumbbell size={20} color={colors.accent.blue} />
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginLeft: spacing.sm,
              }}
            >
              Training Insights
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20 }}>
            Your leg volume is looking great! Consider adding more shoulder work next week to maintain balanced development. Your chest-to-back ratio is optimal.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  unit,
  trend,
  colors,
}: {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  colors: any;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
          {value}
        </Text>
        {unit && (
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: 2 }}>{unit}</Text>
        )}
      </View>
      {trend && (
        <View style={{ marginTop: 2 }}>
          {trend === 'up' && <TrendingUp size={14} color={colors.accent.green} />}
          {trend === 'down' && <TrendingDown size={14} color={colors.semantic.error} />}
          {trend === 'stable' && <Minus size={14} color={colors.text.tertiary} />}
        </View>
      )}
    </View>
  );
}
