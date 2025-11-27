import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Dumbbell, PersonStanding, Activity, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, ActivityType, activityTypeLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

const activityIcons: Record<ActivityType, any> = {
  strength: Dumbbell,
  running: PersonStanding,
  hybrid: Activity,
};

export default function ActivitiesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setActivityType, nextStep, prevStep, currentStep, totalSteps } = useOnboardingStore();

  const handleSelect = (type: ActivityType) => {
    setActivityType(type);
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
            What type of training?
          </Text>
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
            }}
          >
            Choose your primary focus. You can always do both!
          </Text>
        </View>

        {/* Options */}
        <View style={{ flex: 1, gap: spacing.md }}>
          {(Object.keys(activityTypeLabels) as ActivityType[]).map((type) => {
            const { label, description } = activityTypeLabels[type];
            const Icon = activityIcons[type];
            const isSelected = data.activityType === type;

            return (
              <TouchableOpacity
                key={type}
                onPress={() => handleSelect(type)}
                style={{
                  padding: spacing.lg,
                  borderRadius: borderRadius.xl,
                  backgroundColor: isSelected ? colors.accent.blue + '15' : colors.background.secondary,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.accent.blue : 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: borderRadius.lg,
                      backgroundColor: isSelected ? colors.accent.blue : colors.background.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Icon size={28} color={isSelected ? colors.text.onAccent : colors.icon.secondary} />
                  </View>
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
            disabled={!data.activityType}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
