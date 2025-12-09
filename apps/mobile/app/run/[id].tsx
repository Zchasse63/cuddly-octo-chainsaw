import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Footprints,
  Heart,
  TrendingUp,
  Trophy,
  Share2,
  Trash2,
  MapPin,
  Zap,
  Activity,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Card, Button } from '../../src/components/ui';
import { api } from '../../src/lib/trpc';
import { useDistanceUnit, formatDistance, formatPace, formatDuration } from '../../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

const runTypeColors: Record<string, string> = {
  easy: '#4ECDC4',
  tempo: '#FFE66D',
  interval: '#FF6B6B',
  long_run: '#95E1D3',
  recovery: '#A8E6CF',
  fartlek: '#DDA0DD',
  hill: '#F4A460',
  race: '#FFD700',
};

const runTypeLabels: Record<string, string> = {
  easy: 'Easy Run',
  tempo: 'Tempo Run',
  interval: 'Intervals',
  long_run: 'Long Run',
  recovery: 'Recovery',
  fartlek: 'Fartlek',
  hill: 'Hill Training',
  race: 'Race',
};

export default function RunDetailScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const distanceUnit = useDistanceUnit();

  // Fetch run details
  const { data: run, isLoading } = api.running.getActivity.useQuery(
    { id: id || '' },
    { enabled: !!id }
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Run',
      'Delete functionality is not yet available.',
      [
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  const handleShare = () => {
    Alert.alert('Share', 'Sharing feature coming soon!');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.text.secondary }}>Loading run...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!run) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
          <Footprints size={48} color={colors.text.disabled} />
          <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.md }}>
            Run not found
          </Text>
          <Button onPress={() => router.back()} style={{ marginTop: spacing.lg }}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const typeColor = runTypeColors[run.runType ?? 'easy'] || colors.accent.blue;

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
          {run.name || runTypeLabels[run.runType ?? 'easy'] || 'Run'}
        </Text>
        <TouchableOpacity onPress={handleShare} style={{ marginRight: spacing.md }}>
          <Share2 size={20} color={colors.icon.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Trash2 size={20} color={colors.semantic.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Run Summary Card */}
        <Card style={{ marginBottom: spacing.lg }}>
          {/* Run Type Badge */}
          {run.runType && (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: typeColor + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
                marginBottom: spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: typeColor,
                  fontWeight: fontWeight.medium,
                  textTransform: 'uppercase',
                }}
              >
                {runTypeLabels[run.runType] || run.runType}
              </Text>
            </View>
          )}

          {/* Date & Time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Calendar size={16} color={colors.text.tertiary} />
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs }}>
              {formatDate(run.startedAt.toISOString())}
            </Text>
            <Clock size={16} color={colors.text.tertiary} style={{ marginLeft: spacing.md }} />
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginLeft: spacing.xs }}>
              {formatTime(run.startedAt.toISOString())}
            </Text>
          </View>

          {/* Primary Stats */}
          <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatDistance(run.distanceMeters ?? 0, distanceUnit)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Distance</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatDuration(run.durationSeconds ?? 0)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Duration</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                {formatPace(run.avgPaceSecondsPerKm ?? 0, distanceUnit)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Avg Pace</Text>
            </View>
          </View>
        </Card>

        {/* Detailed Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          {/* Heart Rate */}
          {run.avgHeartRate && (
            <Card style={{ flex: 1 }}>
              <View style={{ alignItems: 'center' }}>
                <Heart size={20} color="#FF6B6B" />
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                  {run.avgHeartRate}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Avg HR</Text>
                {run.maxHeartRate && (
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                    Max: {run.maxHeartRate}
                  </Text>
                )}
              </View>
            </Card>
          )}

          {/* Cadence */}
          {run.avgCadence && (
            <Card style={{ flex: 1 }}>
              <View style={{ alignItems: 'center' }}>
                <Activity size={20} color="#4ECDC4" />
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                  {run.avgCadence}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Cadence</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>spm</Text>
              </View>
            </Card>
          )}

          {/* Elevation */}
          {run.elevationGainMeters && (
            <Card style={{ flex: 1 }}>
              <View style={{ alignItems: 'center' }}>
                <TrendingUp size={20} color="#FFE66D" />
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                  {Math.round(run.elevationGainMeters)}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Elevation</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>meters</Text>
              </View>
            </Card>
          )}

          {/* Calories */}
          {run.caloriesBurned && (
            <Card style={{ flex: 1 }}>
              <View style={{ alignItems: 'center' }}>
                <Zap size={20} color="#FF9500" />
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                  {run.caloriesBurned}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Calories</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>kcal</Text>
              </View>
            </Card>
          )}
        </View>

        {/* Pace Stats */}
        {run.avgPaceSecondsPerKm && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
              Pace Analysis
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              {(run.avgPaceSecondsPerKm ?? 0) > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                    {formatPace(run.avgPaceSecondsPerKm ?? 0, distanceUnit)}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Average Pace</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Splits */}
        {(() => {
          const splitsData = run.splits as Array<{ paceSecondsPerKm?: number; time?: number; avgHeartRate?: number }> | null;
          if (!splitsData || !Array.isArray(splitsData) || splitsData.length === 0) return null;

          const avgPace = splitsData.reduce((sum, s) => sum + (s.paceSecondsPerKm ?? 0), 0) / splitsData.length;

          return (
            <Card style={{ marginBottom: spacing.lg }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.md }}>
                Splits
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  paddingBottom: spacing.xs,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.light,
                }}
              >
                <Text style={{ width: 50, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
                  {distanceUnit === 'mi' ? 'MILE' : 'KM'}
                </Text>
                <Text style={{ flex: 1, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
                  PACE
                </Text>
                <Text style={{ flex: 1, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
                  TIME
                </Text>
                {splitsData[0]?.avgHeartRate && (
                  <Text style={{ width: 50, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
                    HR
                  </Text>
                )}
              </View>
              {splitsData.map((split, index) => {
                const isFast = (split.paceSecondsPerKm ?? 0) < avgPace - 10;
                const isSlow = (split.paceSecondsPerKm ?? 0) > avgPace + 10;

                return (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      paddingVertical: spacing.xs,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ width: 50, fontSize: fontSize.sm, color: colors.text.secondary }}>
                      {index + 1}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: fontSize.sm,
                        color: isFast ? colors.accent.green : isSlow ? colors.semantic.error : colors.text.primary,
                        fontWeight: fontWeight.medium,
                      }}
                    >
                      {formatPace(split.paceSecondsPerKm ?? 0, distanceUnit)}
                    </Text>
                    <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text.primary }}>
                      {formatDuration(split.time ?? 0)}
                    </Text>
                    {split.avgHeartRate && (
                      <Text style={{ width: 50, fontSize: fontSize.sm, color: colors.text.primary }}>
                        {split.avgHeartRate}
                      </Text>
                    )}
                  </View>
                );
              })}
            </Card>
          );
        })()}

        {/* Notes */}
        {run.notes && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
              Notes
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
              {run.notes}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
