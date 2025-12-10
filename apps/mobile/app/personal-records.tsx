import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  Calendar,
  Dumbbell,
  PersonStanding,
  Filter,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useWeightUnit, formatWeight } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type PRCategory = 'strength' | 'running' | 'all';

export default function PersonalRecordsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const weightUnit = useWeightUnit();
  const [category, setCategory] = useState<PRCategory>('all');

  // Fetch PRs
  const { data: strengthPRs } = api.workout.prs.useQuery({});
  const { data: runningPRs } = api.running.getPRs.useQuery();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRunTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const runningPRLabels: Record<string, string> = {
    '1k': '1K',
    '1mi': '1 Mile',
    '5k': '5K',
    '10k': '10K',
    half_marathon: 'Half Marathon',
    marathon: 'Marathon',
    longest_run: 'Longest Run',
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
          Personal Records
        </Text>
        <Trophy size={24} color={colors.accent.yellow} />
      </View>

      {/* Category Filter */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        {(['all', 'strength', 'running'] as PRCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategory(cat)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.full,
              backgroundColor: category === cat ? colors.accent.blue : colors.background.secondary,
              gap: spacing.xs,
            }}
          >
            {cat === 'strength' && <Dumbbell size={16} color={category === cat ? colors.text.onAccent : colors.text.secondary} />}
            {cat === 'running' && <PersonStanding size={16} color={category === cat ? colors.text.onAccent : colors.text.secondary} />}
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: category === cat ? colors.text.onAccent : colors.text.secondary,
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Strength PRs */}
        {(category === 'all' || category === 'strength') && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Dumbbell size={20} color={colors.accent.blue} />
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.sm,
                }}
              >
                Strength PRs
              </Text>
            </View>

            {strengthPRs && strengthPRs.length > 0 ? (
              strengthPRs.map((pr: any) => (
                <Card key={pr.id} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.accent.yellow + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <Trophy size={24} color={colors.accent.yellow} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {pr.exercise?.name || 'Exercise'}
                      </Text>
                      <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                        {formatDate(pr.achievedAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontSize: fontSize.lg,
                          fontWeight: fontWeight.bold,
                          color: colors.text.primary,
                        }}
                      >
                        {formatWeight(pr.weight, weightUnit)}
                      </Text>
                      <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                        × {pr.reps} reps
                      </Text>
                    </View>
                  </View>
                  {pr.improvementPercent && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: spacing.sm,
                        paddingTop: spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: colors.border.light,
                      }}
                    >
                      <TrendingUp size={14} color={colors.status.success} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.status.success,
                          marginLeft: spacing.xs,
                        }}
                      >
                        +{pr.improvementPercent.toFixed(1)}% from previous PR
                      </Text>
                    </View>
                  )}
                </Card>
              ))
            ) : (
              <Card style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.base, color: colors.text.tertiary, textAlign: 'center' }}>
                  No strength PRs yet. Keep training!
                </Text>
              </Card>
            )}

            <View style={{ height: spacing.lg }} />
          </>
        )}

        {/* Running PRs */}
        {(category === 'all' || category === 'running') && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <PersonStanding size={20} color="#4ECDC4" />
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.sm,
                }}
              >
                Running PRs
              </Text>
            </View>

            {runningPRs && runningPRs.length > 0 ? (
              runningPRs.map((pr: any) => (
                <Card key={pr.id} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: '#4ECDC420',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <Trophy size={24} color="#4ECDC4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {runningPRLabels[pr.prType] || pr.prType}
                      </Text>
                      <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                        {formatDate(pr.achievedAt)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {pr.timeSeconds ? (
                        <Text
                          style={{
                            fontSize: fontSize.lg,
                            fontWeight: fontWeight.bold,
                            color: colors.text.primary,
                          }}
                        >
                          {formatRunTime(pr.timeSeconds)}
                        </Text>
                      ) : pr.distanceMeters ? (
                        <Text
                          style={{
                            fontSize: fontSize.lg,
                            fontWeight: fontWeight.bold,
                            color: colors.text.primary,
                          }}
                        >
                          {(pr.distanceMeters / 1609.34).toFixed(2)} mi
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {pr.improvementPercent && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginTop: spacing.sm,
                        paddingTop: spacing.sm,
                        borderTopWidth: 1,
                        borderTopColor: colors.border.light,
                      }}
                    >
                      <TrendingUp size={14} color={colors.status.success} />
                      <Text
                        style={{
                          fontSize: fontSize.sm,
                          color: colors.status.success,
                          marginLeft: spacing.xs,
                        }}
                      >
                        {pr.improvementPercent.toFixed(1)}% faster than previous
                      </Text>
                    </View>
                  )}
                </Card>
              ))
            ) : (
              <Card>
                <Text style={{ fontSize: fontSize.base, color: colors.text.tertiary, textAlign: 'center' }}>
                  No running PRs yet. Hit the road!
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
