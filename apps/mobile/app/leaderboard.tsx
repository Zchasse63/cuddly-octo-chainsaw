import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Crown,
  User,
  TrendingUp,
  Dumbbell,
  Footprints,
  Flame,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { useDistanceUnit, formatDistance, useWeightUnit, formatWeight } from '../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius, heights, medalColors } from '../src/theme/tokens';

type LeaderboardType = 'workouts' | 'volume' | 'distance' | 'streak';
type TimeFrame = 'week' | 'month' | 'all';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const distanceUnit = useDistanceUnit();
  const weightUnit = useWeightUnit();
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('workouts');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch leaderboard data
  // Map mobile leaderboard types to backend types
  const backendType = leaderboardType === 'streak' ? 'streak' : leaderboardType === 'workouts' ? 'prs' : 'badges';

  const { data: leaderboard, isLoading, refetch } = api.gamification.getLeaderboard.useQuery({
    type: backendType as 'streak' | 'badges' | 'prs',
    limit: 20,
  });

  // Current user's rank is determined by their position in the leaderboard
  const myRank = leaderboard?.findIndex((entry) => String(entry.user_id) === 'current-user-id') ?? -1;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const typeOptions: { value: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { value: 'workouts', label: 'Workouts', icon: <Dumbbell size={16} color={colors.accent.blue} /> },
    { value: 'volume', label: 'Volume', icon: <TrendingUp size={16} color={colors.activity.tempo} /> },
    { value: 'distance', label: 'Distance', icon: <Footprints size={16} color={colors.activity.running} /> },
    { value: 'streak', label: 'Streak', icon: <Flame size={16} color={colors.activity.strength} /> },
  ];

  const timeFrameOptions: { value: TimeFrame; label: string }[] = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  const formatValue = (value: number, type: LeaderboardType) => {
    switch (type) {
      case 'workouts':
        return `${value} workouts`;
      case 'volume':
        return formatWeight(value, weightUnit);
      case 'distance':
        return formatDistance(value, distanceUnit);
      case 'streak':
        return `${value} days`;
      default:
        return value.toString();
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={24} color={medalColors.gold} />;
      case 2:
        return <Medal size={24} color={medalColors.silver} />;
      case 3:
        return <Medal size={24} color={medalColors.bronze} />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return medalColors.gold;
      case 2:
        return medalColors.silver;
      case 3:
        return medalColors.bronze;
      default:
        return colors.text.secondary;
    }
  };

  const renderUser = ({ item, index }: { item: any; index: number }) => {
    const rank = index + 1;
    const isCurrentUser = item.isCurrentUser;
    const rankIcon = getRankIcon(rank);

    return (
      <Card
        style={{
          marginBottom: spacing.sm,
          borderWidth: isCurrentUser ? 2 : 0,
          borderColor: isCurrentUser ? colors.accent.blue : 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Rank */}
          <View
            style={{
              width: 40,
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
          >
            {rankIcon || (
              <Text
                style={{
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                  color: getRankColor(rank),
                }}
              >
                {rank}
              </Text>
            )}
          </View>

          {/* Avatar */}
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                marginRight: spacing.md,
              }}
            />
          ) : (
            <View
              style={{
                width: heights.avatar.md,
                height: heights.avatar.md,
                borderRadius: heights.avatar.md / 2,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              <User size={20} color={colors.text.onAccent} />
            </View>
          )}

          {/* Name and stats */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: isCurrentUser ? colors.accent.blue : colors.text.primary,
              }}
            >
              {item.name || 'Anonymous'}
              {isCurrentUser && ' (You)'}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
              {item.level ? `Level ${item.level}` : ''}
            </Text>
          </View>

          {/* Value */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                color: rank <= 3 ? getRankColor(rank) : colors.text.primary,
              }}
            >
              {formatValue(item.value, leaderboardType)}
            </Text>
          </View>
        </View>
      </Card>
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
          Leaderboard
        </Text>
      </View>

      {/* Type Selector */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        {typeOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setLeaderboardType(option.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: leaderboardType === option.value ? colors.accent.blue : colors.background.secondary,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.xs,
            }}
          >
            {option.icon}
            <Text
              style={{
                fontSize: fontSize.xs,
                fontWeight: fontWeight.medium,
                color: leaderboardType === option.value ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Frame Selector */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.md,
          gap: spacing.xs,
        }}
      >
        {timeFrameOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setTimeFrame(option.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.sm,
              backgroundColor: timeFrame === option.value ? colors.background.tertiary : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: timeFrame === option.value ? fontWeight.medium : fontWeight.regular,
                color: timeFrame === option.value ? colors.text.primary : colors.text.tertiary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Your Rank Card */}
      {myRank && (
        <Card
          style={{
            marginHorizontal: spacing.md,
            marginBottom: spacing.md,
            backgroundColor: colors.accent.blue + '15',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Trophy size={24} color={colors.accent.blue} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Your Rank</Text>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                #{myRank + 1} of {leaderboard?.length || 0}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Your Score</Text>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.accent.blue }}>
                {formatValue(0, leaderboardType)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item, index) => String(item.user_id || index)}
        renderItem={renderUser}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading leaderboard...</Text>
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
                  No data yet
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                  Start training to appear on the leaderboard!
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
