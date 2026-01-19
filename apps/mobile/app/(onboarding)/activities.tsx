import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Dumbbell, PersonStanding, Activity, Bike, Waves, Hand, Plus, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, ActivityType, activityTypeLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

const activityIcons: Record<ActivityType, any> = {
  weight_training: Dumbbell,
  running: PersonStanding,
  crossfit: Activity,
  bodyweight: Hand,
  cycling: Bike,
  swimming: Waves,
  yoga: Hand,
  other: Plus,
};

export default function ActivitiesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setActivities, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleToggle = (activity: ActivityType) => {
    const newActivities = data.activities.includes(activity)
      ? data.activities.filter((a) => a !== activity)
      : [...data.activities, activity];
    setActivities(newActivities);
  };

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/equipment');
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
            What activities do you do?
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            Select all that apply. This helps us personalize your experience.
          </Text>
        </View>

        {/* Activities grid */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {(Object.keys(activityTypeLabels) as ActivityType[]).map((activity) => {
            const Icon = activityIcons[activity];
            const isSelected = data.activities.includes(activity);

            return (
              <TouchableOpacity
                key={activity}
                onPress={() => handleToggle(activity)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  backgroundColor: isSelected ? colors.accent.blue + '15' : colors.background.secondary,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.accent.blue : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: borderRadius.md,
                    backgroundColor: isSelected ? colors.accent.blue : colors.background.tertiary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Icon size={24} color={isSelected ? colors.text.onAccent : colors.icon.secondary} />
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.medium,
                    color: colors.text.primary,
                  }}
                >
                  {activityTypeLabels[activity]}
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
        </ScrollView>

        {/* Next button */}
        <View style={{ marginTop: spacing.lg }}>
          <Button
            onPress={handleNext}
            disabled={data.activities.length === 0}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
