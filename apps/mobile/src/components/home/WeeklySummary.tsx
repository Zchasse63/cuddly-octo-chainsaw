import { View, Text } from 'react-native';
import { Trophy, TrendingUp, Dumbbell } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface WeeklySummaryData {
  workoutsCompleted: number;
  workoutsPlanned: number;
  totalVolume: number;
  prCount: number;
}

interface WeeklySummaryProps {
  data: WeeklySummaryData | null;
}

export function WeeklySummary({ data }: WeeklySummaryProps) {
  const { colors } = useTheme();

  if (!data) {
    return (
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={{ fontSize: fontSize.base, color: colors.text.tertiary, textAlign: 'center' }}>
          No data this week
        </Text>
      </Card>
    );
  }

  const { workoutsCompleted, workoutsPlanned, totalVolume, prCount } = data;
  const percentage = workoutsPlanned > 0 ? (workoutsCompleted / workoutsPlanned) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
          This Week
        </Text>
        {prCount > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.semantic.success + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs / 2,
              borderRadius: borderRadius.full,
            }}
          >
            <Trophy size={14} color={colors.semantic.success} />
            <Text
              style={{
                fontSize: fontSize.xs,
                color: colors.semantic.success,
                marginLeft: spacing.xs / 2,
                fontWeight: fontWeight.semibold,
              }}
            >
              {prCount} PR{prCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ alignItems: 'center', marginRight: spacing.lg }}>
          <Svg width={100} height={100}>
            {/* Background circle */}
            <Circle
              cx={50}
              cy={50}
              r={45}
              stroke={colors.background.tertiary}
              strokeWidth={8}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={50}
              cy={50}
              r={45}
              stroke={colors.accent.blue}
              strokeWidth={8}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 50 50)`}
            />
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {workoutsCompleted}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>of {workoutsPlanned}</Text>
          </View>
        </View>

        <View style={{ flex: 1, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.accent.green + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.sm,
              }}
            >
              <TrendingUp size={16} color={colors.accent.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>Total Volume</Text>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                {totalVolume.toLocaleString()} lbs
              </Text>
            </View>
          </View>

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
              <Dumbbell size={16} color={colors.accent.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>Completion</Text>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                {Math.round(percentage)}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}
