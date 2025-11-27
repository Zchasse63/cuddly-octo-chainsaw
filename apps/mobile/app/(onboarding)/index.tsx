import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mic, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight } from '../../src/theme/tokens';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const nextStep = useOnboardingStore((state) => state.nextStep);

  const handleGetStarted = () => {
    nextStep();
    router.push('/(onboarding)/goals');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'space-between',
          padding: spacing.lg,
        }}
      >
        {/* Top section with logo */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Logo */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              backgroundColor: colors.accent.blue,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.xl,
              shadowColor: colors.accent.blue,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <Mic size={60} color={colors.text.onAccent} />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: fontSize['4xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            VoiceFit
          </Text>

          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              textAlign: 'center',
              marginBottom: spacing.xl,
            }}
          >
            Voice-first fitness tracking
          </Text>

          {/* Features list */}
          <View style={{ gap: spacing.md, paddingHorizontal: spacing.lg }}>
            <FeatureItem
              colors={colors}
              text="Log workouts with your voice"
            />
            <FeatureItem
              colors={colors}
              text="AI-powered coaching and program generation"
            />
            <FeatureItem
              colors={colors}
              text="Track strength training and running"
            />
            <FeatureItem
              colors={colors}
              text="Works offline - sync when connected"
            />
          </View>
        </View>

        {/* Bottom section with CTA */}
        <View style={{ gap: spacing.md }}>
          <Button onPress={handleGetStarted} fullWidth>
            Get Started
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
          >
            I already have an account
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ colors, text }: { colors: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ChevronRight size={14} color={colors.accent.blue} />
      </View>
      <Text
        style={{
          fontSize: fontSize.base,
          color: colors.text.secondary,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
