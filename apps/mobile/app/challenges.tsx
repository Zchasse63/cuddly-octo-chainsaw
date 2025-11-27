import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  Users,
  Clock,
  Target,
  Flame,
  ChevronRight,
  Dumbbell,
  Footprints,
  Calendar,
  Award,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useDistanceUnit, formatDistance } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type ChallengeFilter = 'active' | 'upcoming' | 'completed';

export default function ChallengesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const distanceUnit = useDistanceUnit();
  const [filter, setFilter] = useState<ChallengeFilter>('active');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch challenges
  const { data: challenges, isLoading, refetch } = api.social.getChallenges.useQuery({
    status: filter,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filterOptions: { value: ChallengeFilter; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
  ];

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'running':
        return <Footprints size={24} color="#4ECDC4" />;
      case 'strength':
        return <Dumbbell size={24} color={colors.accent.blue} />;
      case 'streak':
        return <Flame size={24} color="#FF6B6B" />;
      default:
        return <Trophy size={24} color="#FFE66D" />;
    }
  };

  const getChallengeColor = (type: string) => {
    switch (type) {
      case 'running':
        return '#4ECDC4';
      case 'strength':
        return colors.accent.blue;
      case 'streak':
        return '#FF6B6B';
      default:
        return '#FFE66D';
    }
  };

  const formatGoal = (challenge: any) => {
    switch (challenge.metric) {
      case 'distance':
        return formatDistance(challenge.targetValue, distanceUnit);
      case 'workouts':
        return `${challenge.targetValue} workouts`;
      case 'streak':
        return `${challenge.targetValue} day streak`;
      case 'volume':
        return `${Math.round(challenge.targetValue / 1000)}k lbs`;
      default:
        return challenge.targetValue;
    }
  };

  const renderChallenge = ({ item }: { item: any }) => {
    const progressPercent = item.targetValue > 0
      ? Math.min((item.currentValue / item.targetValue) * 100, 100)
      : 0;
    const challengeColor = getChallengeColor(item.type);
    const isCompleted = item.status === 'completed';

    return (
      <TouchableOpacity onPress={() => router.push(`/challenge/${item.id}`)}>
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: borderRadius.md,
                backgroundColor: challengeColor + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              {getChallengeIcon(item.type)}
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                    flex: 1,
                  }}
                >
                  {item.name}
                </Text>
                {isCompleted && (
                  <CheckCircle2 size={18} color={colors.accent.green} />
                )}
              </View>

              {item.description && (
                <Text
                  style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.md }}>
                {item.participantCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Users size={14} color={colors.text.tertiary} />
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                      {item.participantCount} participants
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Target size={14} color={colors.text.tertiary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                    Goal: {formatGoal(item)}
                  </Text>
                </View>
              </View>

              {/* Time remaining */}
              {item.endDate && filter === 'active' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                  <Clock size={14} color={colors.text.tertiary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                    {getDaysRemaining(item.endDate)}
                  </Text>
                </View>
              )}

              {/* Progress bar */}
              {filter === 'active' && (
                <View style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      Your Progress
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: challengeColor, fontWeight: fontWeight.medium }}>
                      {Math.round(progressPercent)}%
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.background.tertiary,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: challengeColor,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Reward badge */}
              {item.rewardBadgeId && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: spacing.sm,
                    backgroundColor: '#FFE66D20',
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm,
                    alignSelf: 'flex-start',
                  }}
                >
                  <Award size={14} color="#FFE66D" />
                  <Text style={{ fontSize: fontSize.xs, color: '#FFE66D', marginLeft: spacing.xs }}>
                    Badge reward
                  </Text>
                </View>
              )}
            </View>

            <ChevronRight size={20} color={colors.icon.secondary} style={{ marginLeft: spacing.xs }} />
          </View>
        </Card>
      </TouchableOpacity>
    );
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
          Challenges
        </Text>
      </View>

      {/* Filter Tabs */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setFilter(option.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: filter === option.value ? colors.accent.blue : colors.background.secondary,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: filter === option.value ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Challenge List */}
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading challenges...</Text>
            ) : (
              <>
                <Trophy size={48} color={colors.text.disabled} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: colors.text.secondary,
                    marginTop: spacing.md,
                  }}
                >
                  No {filter} challenges
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                  {filter === 'active'
                    ? 'Join a challenge to compete with others!'
                    : filter === 'upcoming'
                    ? 'Check back soon for new challenges'
                    : 'Complete challenges to see them here'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function getDaysRemaining(endDate: string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Ended';
  if (diffDays === 0) return 'Ends today';
  if (diffDays === 1) return '1 day left';
  if (diffDays < 7) return `${diffDays} days left`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} left`;
}
