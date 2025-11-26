import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius, heights } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { colors, theme, setTheme, isDark } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Get user profile
  const { data: profile } = api.auth.me.useQuery(undefined, { enabled: !!user });

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
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Profile
          </Text>
        </View>

        {/* Avatar & Name */}
        <Card style={{ marginBottom: spacing.lg, alignItems: 'center' }}>
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
          <Text
            style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            {profile?.profile?.name || 'User'}
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

        {/* Settings */}
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Settings
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
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
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
            <Target size={24} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Goals
            </Text>
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
            <Dumbbell size={24} color={colors.icon.primary} />
            <Text
              style={{
                flex: 1,
                marginLeft: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
              }}
            >
              Equipment
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
