import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Heart,
  Moon,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Shield,
  Zap,
  Brain,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

interface Correlation {
  factor1: string;
  factor2: string;
  correlation: number; // -1 to 1
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative';
  insight: string;
}

interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: string;
  optimal: { min: number; max: number };
}

export default function HealthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<7 | 14 | 30 | 60>(14);

  // Fetch health intelligence data
  const { data: healthData, refetch } = api.analytics.getHealthIntelligence.useQuery({
    days: timePeriod,
  });

  // Fetch injury risk assessment
  const { data: injuryRisk } = api.injury.getRiskAssessment.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} color={colors.accent.green} />;
      case 'down':
        return <TrendingDown size={16} color={colors.semantic.error} />;
      default:
        return <Minus size={16} color={colors.text.tertiary} />;
    }
  };

  const getCorrelationColor = (correlation: number) => {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) return colors.accent.green;
    if (absCorr >= 0.4) return colors.accent.blue;
    return colors.text.tertiary;
  };

  const healthScore = healthData?.overallScore || 75;
  const recoveryScore = healthData?.recoveryScore || 80;
  const readinessScore = healthData?.readinessScore || 72;

  const correlations: Correlation[] = healthData?.correlations || [
    {
      factor1: 'Sleep Quality',
      factor2: 'Workout Performance',
      correlation: 0.78,
      strength: 'strong',
      direction: 'positive',
      insight: 'Better sleep is strongly linked to improved workout performance',
    },
    {
      factor1: 'Protein Intake',
      factor2: 'Recovery Speed',
      correlation: 0.65,
      strength: 'moderate',
      direction: 'positive',
      insight: 'Higher protein intake moderately improves recovery time',
    },
    {
      factor1: 'Training Volume',
      factor2: 'Recovery Score',
      correlation: -0.52,
      strength: 'moderate',
      direction: 'negative',
      insight: 'Higher training volume tends to reduce recovery scores',
    },
  ];

  const metrics: HealthMetric[] = [
    {
      label: 'Avg Sleep',
      value: healthData?.avgSleep || 7.2,
      unit: 'hrs',
      trend: 'up',
      trendValue: '+0.3',
      optimal: { min: 7, max: 9 },
    },
    {
      label: 'HRV',
      value: healthData?.avgHrv || 52,
      unit: 'ms',
      trend: 'stable',
      optimal: { min: 40, max: 80 },
    },
    {
      label: 'Resting HR',
      value: healthData?.avgRestingHr || 58,
      unit: 'bpm',
      trend: 'down',
      trendValue: '-2',
      optimal: { min: 50, max: 70 },
    },
    {
      label: 'Weekly Volume',
      value: healthData?.weeklyVolume || 45200,
      unit: 'lbs',
      trend: 'up',
      trendValue: '+12%',
      optimal: { min: 30000, max: 60000 },
    },
  ];

  const isInOptimalRange = (metric: HealthMetric) => {
    return metric.value >= metric.optimal.min && metric.value <= metric.optimal.max;
  };

  const riskLevel = injuryRisk?.riskLevel || 'low';
  const riskColor =
    riskLevel === 'high'
      ? colors.semantic.error
      : riskLevel === 'moderate'
      ? colors.semantic.warning
      : colors.accent.green;

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
          Health Intelligence
        </Text>
        <TouchableOpacity>
          <Info size={24} color={colors.icon.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Time Period Selector */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.xs,
            marginBottom: spacing.lg,
          }}
        >
          {([7, 14, 30, 60] as const).map((days) => (
            <TouchableOpacity
              key={days}
              onPress={() => setTimePeriod(days)}
              style={{
                flex: 1,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: timePeriod === days ? colors.accent.blue : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.medium,
                  color: timePeriod === days ? colors.text.onAccent : colors.text.secondary,
                }}
              >
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overall Scores */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
          <ScoreCard
            icon={<Heart size={20} color="#FF6B6B" />}
            label="Health"
            score={healthScore}
            color="#FF6B6B"
            colors={colors}
          />
          <ScoreCard
            icon={<Shield size={20} color="#4ECDC4" />}
            label="Recovery"
            score={recoveryScore}
            color="#4ECDC4"
            colors={colors}
          />
          <ScoreCard
            icon={<Zap size={20} color="#FFE66D" />}
            label="Readiness"
            score={readinessScore}
            color="#FFE66D"
            colors={colors}
          />
        </View>

        {/* Injury Risk Alert */}
        {riskLevel !== 'low' && (
          <Card
            style={{
              marginBottom: spacing.lg,
              backgroundColor: riskColor + '15',
              borderWidth: 1,
              borderColor: riskColor + '40',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AlertTriangle size={24} color={riskColor} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                  }}
                >
                  {riskLevel === 'high' ? 'High Injury Risk' : 'Moderate Injury Risk'}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                  {injuryRisk?.mainReason || 'Training load has increased significantly'}
                </Text>
              </View>
              <ChevronRight size={20} color={riskColor} />
            </View>
          </Card>
        )}

        {/* Health Metrics */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Health Metrics
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {metrics.map((metric, index) => (
            <View
              key={index}
              style={{
                width: '48%',
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>{metric.label}</Text>
                {getTrendIcon(metric.trend)}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs }}>
                <Text
                  style={{
                    fontSize: fontSize['2xl'],
                    fontWeight: fontWeight.bold,
                    color: isInOptimalRange(metric) ? colors.text.primary : colors.semantic.warning,
                  }}
                >
                  {metric.value.toLocaleString()}
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                  {metric.unit}
                </Text>
              </View>
              {metric.trendValue && (
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: metric.trend === 'up' ? colors.accent.green : colors.text.tertiary,
                    marginTop: 2,
                  }}
                >
                  {metric.trendValue} vs last period
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Correlations */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Insights & Correlations
        </Text>

        {correlations.map((corr, index) => (
          <Card key={index} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Brain size={20} color={getCorrelationColor(corr.correlation)} />
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.sm,
                  flex: 1,
                }}
              >
                {corr.factor1} → {corr.factor2}
              </Text>
              <View
                style={{
                  backgroundColor: getCorrelationColor(corr.correlation) + '20',
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                  borderRadius: borderRadius.full,
                }}
              >
                <Text style={{ fontSize: fontSize.xs, color: getCorrelationColor(corr.correlation) }}>
                  {corr.strength}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>{corr.insight}</Text>
            <View
              style={{
                marginTop: spacing.sm,
                height: 4,
                backgroundColor: colors.background.tertiary,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${Math.abs(corr.correlation) * 100}%`,
                  height: '100%',
                  backgroundColor: getCorrelationColor(corr.correlation),
                  borderRadius: 2,
                }}
              />
            </View>
          </Card>
        ))}

        {/* Recommendations */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          Recommendations
        </Text>

        <Card>
          {(healthData?.recommendations || [
            'Prioritize 7-8 hours of sleep for optimal recovery',
            'Consider a rest day if recovery score drops below 50%',
            'Increase protein intake on heavy training days',
          ]).map((rec: string, index: number) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: spacing.sm,
                borderBottomWidth: index < 2 ? 1 : 0,
                borderBottomColor: colors.border.light,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.accent.blue + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.sm,
                }}
              >
                <Text style={{ fontSize: fontSize.xs, color: colors.accent.blue, fontWeight: fontWeight.bold }}>
                  {index + 1}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.text.secondary }}>{rec}</Text>
            </View>
          ))}
        </Card>

        {/* Ask Coach Button */}
        <Button
          variant="outline"
          onPress={() => router.push('/(tabs)/chat')}
          style={{ marginTop: spacing.lg }}
        >
          Ask Coach About My Health
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreCard({
  icon,
  label,
  score,
  color,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: string;
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
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.xs,
        }}
      >
        {icon}
      </View>
      <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
        {score}
      </Text>
      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{label}</Text>
    </View>
  );
}
