import { View, Text, ScrollView, Switch, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Moon,
  Sun,
  Bell,
  Target,
  Dumbbell,
  LogOut,
  ChevronRight,
  Settings,
  Award,
  Footprints,
  Activity,
  Flame,
  TrendingUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius, heights } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { colors, setTheme, isDark } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Get user profile and stats
  const { data: profile } = api.auth.me.useQuery(undefined, { enabled: !!user });
  const { data: stats } = api.gamification.getStats.useQuery(undefined, { enabled: !!user });
  const { data: badges } = api.gamification.getUserBadges.useQuery(undefined, { enabled: !!user });

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    router.replace('/(auth)/login');
  };

  const toggleTheme = () => {
    Haptics.selectionAsync();
    setTheme(isDark ? 'light' : 'dark');
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            Sign in to view your profile
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Header with Settings */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Profile
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.background.secondary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Settings size={20} color={colors.icon.primary} />
          </TouchableOpacity>
        </View>

        {/* Avatar & Name */}
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
          {user.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={{
                width: heights.avatar.lg,
                height: heights.avatar.lg,
                borderRadius: heights.avatar.lg / 2,
                marginBottom: spacing.md,
              }}
            />
          ) : (
            <View
              style={{
                width: heights.avatar.lg,
                height: heights.avatar.lg,
                borderRadius: heights.avatar.lg / 2,
                backgroundColor: colors.accent.blue,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}
            >
              <User size={40} color={colors.text.onAccent} />
            </View>
          )}
          <Text
            style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            {profile?.profile?.name || user.user_metadata?.name || 'User'}
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              marginTop: spacing.xs,
            }}
          >
            {user.email}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              marginTop: spacing.md,
            }}
          >
            <View
              style={{
                backgroundColor: colors.tint.accent,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.accent.blue,
                  fontWeight: fontWeight.medium,
                }}
              >
                {profile?.profile?.tier || 'Free'}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.tint.success,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: borderRadius.full,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.semantic.success,
                  fontWeight: fontWeight.medium,
                }}
              >
                {profile?.profile?.experienceLevel || 'Beginner'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <StatCard
            icon={<Activity size={20} color={colors.accent.blue} />}
            value={stats?.totalWorkouts?.toString() || '0'}
            label="Workouts"
            colors={colors}
          />
          <StatCard
            icon={<Flame size={20} color="#FF6B6B" />}
            value={stats?.currentStreak?.toString() || '0'}
            label="Day Streak"
            colors={colors}
          />
          <StatCard
            icon={<TrendingUp size={20} color="#4ECDC4" />}
            value={stats?.prsThisMonth?.toString() || '0'}
            label="PRs"
            colors={colors}
          />
          <StatCard
            icon={<Award size={20} color="#FFE66D" />}
            value={badges?.length?.toString() || '0'}
            label="Badges"
            colors={colors}
          />
        </View>

        {/* Quick Links */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          My Stuff
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          {/* Badges */}
          <TouchableOpacity
            onPress={() => router.push('/badges')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFE66D20',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Award size={20} color="#FFE66D" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
                Badges
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {badges?.length || 0} of 90 earned
              </Text>
            </View>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>

          {/* Running Shoes */}
          <TouchableOpacity
            onPress={() => router.push('/shoes')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#4ECDC420',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Footprints size={20} color="#4ECDC4" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
                Running Shoes
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                Track mileage & replacements
              </Text>
            </View>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>

          {/* Goals */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.accent.blue + '20',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Target size={20} color={colors.accent.blue} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
                Goals
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {profile?.profile?.goals?.length || 0} goals set
              </Text>
            </View>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>

          {/* Equipment */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FF6B6B20',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Dumbbell size={20} color="#FF6B6B" />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
                Equipment
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {profile?.profile?.preferredEquipment?.length || 0} items
              </Text>
            </View>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Preferences */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Preferences
        </Text>

        <Card padding="none" style={{ marginBottom: spacing.lg }}>
          {/* Dark Mode */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            {isDark ? (
              <Moon size={24} color={colors.icon.primary} />
            ) : (
              <Sun size={24} color={colors.icon.primary} />
            )}
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Dark Mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{
                false: colors.background.tertiary,
                true: colors.accent.blue,
              }}
            />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            <Bell size={24} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Notifications
            </Text>
            <ChevronRight size={20} color={colors.icon.secondary} />
          </TouchableOpacity>
        </Card>

        {/* Account Actions */}
        <Button variant="outline" onPress={handleSignOut} fullWidth>
          Sign Out
        </Button>

        {/* Version */}
        <Text
          style={{
            fontSize: fontSize.xs,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: spacing.xl,
          }}
        >
          VoiceFit v2.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, colors }: { icon: React.ReactNode; value: string; label: string; colors: any }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        padding: spacing.sm,
        alignItems: 'center',
      }}
    >
      {icon}
      <Text
        style={{
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
          color: colors.text.primary,
          marginTop: spacing.xs,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: fontSize.xs,
          color: colors.text.tertiary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
