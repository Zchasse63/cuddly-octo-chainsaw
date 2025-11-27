import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, Lock, Dumbbell, PersonStanding, Flame, Zap } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type BadgeCategory = 'strength' | 'running' | 'streak' | 'hybrid';

const categoryInfo: Record<BadgeCategory, { label: string; icon: any; color: string }> = {
  strength: { label: 'Strength', icon: Dumbbell, color: '#FF6B6B' },
  running: { label: 'Running', icon: PersonStanding, color: '#4ECDC4' },
  streak: { label: 'Streaks', icon: Flame, color: '#FFE66D' },
  hybrid: { label: 'Hybrid', icon: Zap, color: '#95E1D3' },
};

const tierColors = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export default function BadgesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // Fetch user badges
  const { data: userBadges, isLoading } = api.gamification.getUserBadges.useQuery();
  const { data: badgesByCategory } = api.gamification.getBadgesByCategory.useQuery();

  const earnedBadgeIds = new Set(userBadges?.map((b: any) => b.badgeId) || []);

  const categories: BadgeCategory[] = ['strength', 'running', 'streak', 'hybrid'];

  const renderBadge = (badge: any, isEarned: boolean) => {
    const tierColor = tierColors[badge.tier as keyof typeof tierColors] || colors.text.tertiary;

    return (
      <View
        key={badge.id}
        style={{
          width: '31%',
          aspectRatio: 1,
          marginBottom: spacing.sm,
          padding: spacing.xs,
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: isEarned ? colors.background.secondary : colors.background.tertiary,
            borderRadius: borderRadius.lg,
            padding: spacing.sm,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isEarned ? 1 : 0.5,
            borderWidth: isEarned ? 2 : 0,
            borderColor: tierColor,
          }}
        >
          {isEarned ? (
            <Award size={32} color={tierColor} />
          ) : (
            <Lock size={24} color={colors.text.disabled} />
          )}
          <Text
            style={{
              fontSize: fontSize.xs,
              fontWeight: fontWeight.medium,
              color: isEarned ? colors.text.primary : colors.text.disabled,
              textAlign: 'center',
              marginTop: spacing.xs,
            }}
            numberOfLines={2}
          >
            {badge.name}
          </Text>
        </TouchableOpacity>
      </View>
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
          Badges
        </Text>
        <View
          style={{
            backgroundColor: colors.accent.blue + '20',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.accent.blue, fontWeight: fontWeight.semibold }}>
            {userBadges?.length || 0} / 90
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Stats Overview */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {categories.map((category) => {
            const info = categoryInfo[category];
            const Icon = info.icon;
            const categoryBadges = badgesByCategory?.[category] || [];
            const earnedCount = categoryBadges.filter((b: any) => earnedBadgeIds.has(b.id)).length;

            return (
              <View
                key={category}
                style={{
                  flex: 1,
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing.sm,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: info.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing.xs,
                  }}
                >
                  <Icon size={20} color={info.color} />
                </View>
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                  }}
                >
                  {earnedCount}
                </Text>
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: colors.text.tertiary,
                  }}
                >
                  {info.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Badge Categories */}
        {categories.map((category) => {
          const info = categoryInfo[category];
          const Icon = info.icon;
          const categoryBadges = badgesByCategory?.[category] || [];

          if (categoryBadges.length === 0) return null;

          return (
            <View key={category} style={{ marginBottom: spacing.xl }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: spacing.md,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: info.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.sm,
                  }}
                >
                  <Icon size={16} color={info.color} />
                </View>
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                  }}
                >
                  {info.label}
                </Text>
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    color: colors.text.tertiary,
                    marginLeft: spacing.sm,
                  }}
                >
                  {categoryBadges.filter((b: any) => earnedBadgeIds.has(b.id)).length} / {categoryBadges.length}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'flex-start',
                }}
              >
                {categoryBadges.map((badge: any) =>
                  renderBadge(badge, earnedBadgeIds.has(badge.id))
                )}
              </View>
            </View>
          );
        })}

        {/* Empty state */}
        {isLoading && (
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <Text style={{ color: colors.text.secondary }}>Loading badges...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
