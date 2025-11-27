import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, TrainingFrequency, frequencyLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

export default function FrequencyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setTrainingFrequency, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleSelect = (frequency: TrainingFrequency) => {
    setTrainingFrequency(frequency);
  };

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/activities');
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
            How often do you train?
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            We'll use this to create personalized training recommendations.
          </Text>
        </View>

        {/* Options */}
        <View style={{ flex: 1, gap: spacing.sm }}>
          {(Object.keys(frequencyLabels) as TrainingFrequency[]).map((frequency) => {
            const isSelected = data.trainingFrequency === frequency;

            return (
              <TouchableOpacity
                key={frequency}
                onPress={() => handleSelect(frequency)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderRadius: borderRadius.lg,
                  backgroundColor: isSelected ? colors.accent.blue + '15' : colors.background.secondary,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.accent.blue : 'transparent',
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {frequencyLabels[frequency]}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.accent.blue,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Check size={14} color={colors.text.onAccent} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next button */}
        <View style={{ marginTop: spacing.lg }}>
          <Button
            onPress={handleNext}
            disabled={!data.trainingFrequency}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
