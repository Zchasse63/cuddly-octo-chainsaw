import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ChevronLeft,
  Bell,
  BellOff,
  Dumbbell,
  Trophy,
  MessageSquare,
  Clock,
  TrendingUp,
  Heart,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  icon: any;
  enabled: boolean;
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [masterEnabled, setMasterEnabled] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'workout_reminders',
      label: 'Workout Reminders',
      description: 'Daily reminders to log your workout',
      icon: Dumbbell,
      enabled: true,
    },
    {
      id: 'pr_alerts',
      label: 'PR Celebrations',
      description: 'Celebrate when you hit a new personal record',
      icon: Trophy,
      enabled: true,
    },
    {
      id: 'coach_messages',
      label: 'AI Coach Messages',
      description: 'Tips and insights from your AI coach',
      icon: MessageSquare,
      enabled: true,
    },
    {
      id: 'streak_reminders',
      label: 'Streak Reminders',
      description: "Don't break your workout streak",
      icon: Zap,
      enabled: true,
    },
    {
      id: 'weekly_summary',
      label: 'Weekly Summary',
      description: 'Weekly progress report every Sunday',
      icon: TrendingUp,
      enabled: true,
    },
    {
      id: 'readiness_checkin',
      label: 'Morning Check-in',
      description: 'Daily readiness assessment reminder',
      icon: Heart,
      enabled: false,
    },
    {
      id: 'rest_day_reminders',
      label: 'Rest Day Suggestions',
      description: 'Reminders when recovery is low',
      icon: Clock,
      enabled: true,
    },
  ]);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const NotificationRow = ({ notification }: { notification: NotificationSetting }) => {
    const Icon = notification.icon;
    const isEnabled = masterEnabled && notification.enabled;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          marginBottom: spacing.sm,
          opacity: masterEnabled ? 1 : 0.5,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: borderRadius.md,
            backgroundColor: isEnabled ? colors.accent.blue + '20' : colors.background.tertiary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon size={22} color={isEnabled ? colors.accent.blue : colors.text.tertiary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text
            style={{
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: colors.text.primary,
            }}
          >
            {notification.label}
          </Text>
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.text.tertiary,
              marginTop: 2,
            }}
          >
            {notification.description}
          </Text>
        </View>
        <Switch
          value={notification.enabled}
          onValueChange={() => toggleNotification(notification.id)}
          disabled={!masterEnabled}
          trackColor={{ false: colors.background.tertiary, true: colors.accent.blue + '60' }}
          thumbColor={notification.enabled ? colors.accent.blue : colors.text.tertiary}
        />
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
          borderBottomColor: colors.border.primary,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          Notifications
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
        {/* Master Toggle */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: masterEnabled ? colors.accent.blue + '15' : colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: borderRadius.full,
              backgroundColor: masterEnabled ? colors.accent.blue : colors.background.tertiary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {masterEnabled ? (
              <Bell size={24} color={colors.text.onAccent} />
            ) : (
              <BellOff size={24} color={colors.text.tertiary} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
              }}
            >
              Push Notifications
            </Text>
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
              {masterEnabled ? 'Notifications are enabled' : 'All notifications are disabled'}
            </Text>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={setMasterEnabled}
            trackColor={{ false: colors.background.tertiary, true: colors.accent.blue + '60' }}
            thumbColor={masterEnabled ? colors.accent.blue : colors.text.tertiary}
          />
        </View>

        {/* Notification Categories */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: spacing.md,
          }}
        >
          Notification Types
        </Text>

        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}

        {/* Quiet Hours */}
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            color: colors.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginTop: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          Quiet Hours
        </Text>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: borderRadius.md,
              backgroundColor: colors.accent.purple + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Clock size={22} color={colors.accent.purple} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
                color: colors.text.primary,
              }}
            >
              Do Not Disturb
            </Text>
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
            >
              10:00 PM - 7:00 AM
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.sm, color: colors.accent.blue }}>Edit</Text>
        </TouchableOpacity>

        {/* Info */}
        <View
          style={{
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginTop: spacing.xl,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, lineHeight: 20 }}>
            Make sure notifications are enabled in your device settings. Go to Settings → VoiceFit
            → Notifications to manage system-level permissions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
