import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, ExperienceLevel, experienceLevelLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function ExperienceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setExperienceLevel, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleSelect = (level: ExperienceLevel) => {
    setExperienceLevel(level);
  };

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/frequency');
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
            What's your experience level?
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            This helps us recommend appropriate exercises and progression.
          </Text>
        </View>

        {/* Options */}
        <View style={{ flex: 1, gap: spacing.sm }}>
          {(Object.keys(experienceLevelLabels) as ExperienceLevel[]).map((level) => {
            const { label, description } = experienceLevelLabels[level];
            const isSelected = data.experienceLevel === level;

            return (
              <TouchableOpacity
                key={level}
                onPress={() => handleSelect(level)}
                style={{
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  backgroundColor: isSelected ? colors.accent.blue + '15' : colors.background.secondary,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.accent.blue : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: fontSize.lg,
                        fontWeight: fontWeight.semibold,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: colors.text.secondary,
                      }}
                    >
                      {description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.accent.blue,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginLeft: spacing.md,
                      }}
                    >
                      <Check size={14} color={colors.text.onAccent} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next button */}
        <View style={{ marginTop: spacing.lg }}>
          <Button
            onPress={handleNext}
            disabled={!data.experienceLevel}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
