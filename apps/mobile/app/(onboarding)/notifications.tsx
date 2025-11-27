import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, BellOff } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { setNotificationsEnabled, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleEnableNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
    } catch (error) {
      console.error('Error requesting notifications:', error);
    }
    nextStep();
    router.push('/(onboarding)/complete');
  };

  const handleSkip = () => {
    setNotificationsEnabled(false);
    nextStep();
    router.push('/(onboarding)/complete');
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        {/* Back button */}
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginBottom: spacing.md }}
        >
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Progress indicator */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xl }}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: index <= currentStep ? colors.accent.blue : colors.background.tertiary,
              }}
            />
          ))}
        </View>

        {/* Content */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Icon */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.accent.blue + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.xl,
            }}
          >
            <Bell size={60} color={colors.accent.blue} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            Stay on Track
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              textAlign: 'center',
              lineHeight: 24,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.xl,
            }}
          >
            Get reminders to log your workouts, track your progress, and celebrate achievements.
          </Text>

          {/* Benefits */}
          <View style={{ width: '100%', paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <NotificationBenefit
              colors={colors}
              icon="workout"
              text="Workout reminders at your preferred times"
            />
            <NotificationBenefit
              colors={colors}
              icon="streak"
              text="Streak notifications to keep your momentum"
            />
            <NotificationBenefit
              colors={colors}
              icon="achievement"
              text="Celebrate PRs and badge unlocks"
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={{ gap: spacing.sm }}>
          <Button onPress={handleEnableNotifications} fullWidth>
            Enable Notifications
          </Button>
          <Button variant="ghost" onPress={handleSkip} fullWidth>
            Maybe Later
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function NotificationBenefit({ colors, icon, text }: { colors: any; icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.accent.blue,
        }}
      />
      <Text
        style={{
          fontSize: fontSize.sm,
          color: colors.text.secondary,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
