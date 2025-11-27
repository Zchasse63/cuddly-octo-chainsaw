import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function LimitationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setLimitations, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/notifications');
  };

  const handleBack = () => {
    prevStep();
    router.back();
  };

  const handleSkip = () => {
    nextStep();
    router.push('/(onboarding)/notifications');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
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

            {/* Header */}
            <View style={{ marginBottom: spacing.xl }}>
              <Text
                style={{
                  fontSize: fontSize['2xl'],
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                }}
              >
                Any injuries or limitations?
              </Text>
              <Text
                style={{
                  fontSize: fontSize.base,
                  color: colors.text.secondary,
                }}
              >
                Let us know about any physical limitations so we can recommend safe exercises.
              </Text>
            </View>

            {/* Info card */}
            <View
              style={{
                flexDirection: 'row',
                padding: spacing.md,
                backgroundColor: colors.accent.blue + '10',
                borderRadius: borderRadius.lg,
                marginBottom: spacing.lg,
              }}
            >
              <AlertCircle size={20} color={colors.accent.blue} style={{ marginRight: spacing.sm, marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  fontSize: fontSize.sm,
                  color: colors.text.secondary,
                  lineHeight: 20,
                }}
              >
                This information helps our AI coach suggest modifications and avoid exercises that might aggravate existing conditions.
              </Text>
            </View>

            {/* Text input */}
            <TextInput
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
                minHeight: 150,
                textAlignVertical: 'top',
              }}
              placeholder="e.g., Lower back issues, recovering from shoulder surgery, knee problems during squats..."
              placeholderTextColor={colors.text.disabled}
              multiline
              value={data.limitations}
              onChangeText={setLimitations}
            />

            <View style={{ flex: 1 }} />

            {/* Buttons */}
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button onPress={handleNext} fullWidth>
                Continue
              </Button>
              <Button variant="ghost" onPress={handleSkip} fullWidth>
                Skip for now
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
