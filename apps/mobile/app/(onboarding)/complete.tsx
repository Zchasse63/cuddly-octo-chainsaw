import { View, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore } from '../../src/stores/onboarding';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight } from '../../src/theme/tokens';

export default function CompleteScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, completeOnboarding } = useOnboardingStore();
  const user = useAuthStore((state) => state.user);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  // Save profile mutation
  const saveProfileMutation = api.auth.updateProfile.useMutation();

  useEffect(() => {
    // Trigger success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate entrance
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Fire confetti after animation
    const confettiTimeout = setTimeout(() => {
      confettiRef.current?.start();
    }, 500);

    return () => clearTimeout(confettiTimeout);
  }, []);

  const handleGetStarted = async () => {
    try {
      if (user) {
        await saveProfileMutation.mutateAsync({
          experienceLevel: data.experienceLevel || undefined,
          goals: data.goals.map(g => String(g)),
          trainingFrequency: data.trainingDaysPerWeek ? String(data.trainingDaysPerWeek) : undefined,
          preferredEquipment: data.equipment.map(e => String(e)),
          injuries: data.limitations || undefined,
          notificationsEnabled: data.notificationsEnabled,
        });
      }

      completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Onboarding] Failed to save profile:', error);
      completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Confetti animation */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut
      />

      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        {/* Success icon with animation */}
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.semantic.success + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <CheckCircle size={60} color={colors.semantic.success} />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            You're All Set!
          </Text>

          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: spacing.xl,
              paddingHorizontal: spacing.lg,
            }}
          >
            Your personalized fitness experience is ready. Let's start tracking your progress!
          </Text>

          {/* Summary card */}
          <View
            style={{
              backgroundColor: colors.background.secondary,
              borderRadius: 16,
              padding: spacing.lg,
              marginBottom: spacing.xl,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Sparkles size={20} color={colors.accent.blue} />
              <Text
                style={{
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: colors.text.primary,
                  marginLeft: spacing.sm,
                }}
              >
                Your Profile
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              {data.experienceLevel && (
                <SummaryItem
                  colors={colors}
                  label="Level"
                  value={data.experienceLevel.charAt(0).toUpperCase() + data.experienceLevel.slice(1)}
                />
              )}
              {data.activities.length > 0 && (
                <SummaryItem
                  colors={colors}
                  label="Activities"
                  value={`${data.activities.length} selected`}
                />
              )}
              {data.trainingDaysPerWeek && (
                <SummaryItem
                  colors={colors}
                  label="Frequency"
                  value={`${data.trainingDaysPerWeek} days/week`}
                />
              )}
              {data.goals.length > 0 && (
                <SummaryItem
                  colors={colors}
                  label="Goals"
                  value={`${data.goals.length} selected`}
                />
              )}
            </View>
          </View>
        </Animated.View>

        <View style={{ flex: 1 }} />

        {/* CTA */}
        <View style={{ width: '100%' }}>
          <Button
            onPress={handleGetStarted}
            loading={saveProfileMutation.isPending}
            fullWidth
          >
            Start Training
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryItem({ colors, label, value }: { colors: any; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
        {label}
      </Text>
      <Text style={{ fontSize: fontSize.sm, color: colors.text.primary, fontWeight: fontWeight.medium }}>
        {value}
      </Text>
    </View>
  );
}
