import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Target, Flame, Dumbbell, Heart, Activity, Award, Check } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button } from '../../src/components/ui';
import { useOnboardingStore, FitnessGoal, goalLabels } from '../../src/stores/onboarding';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

const goalIcons: Record<FitnessGoal, any> = {
  build_muscle: Dumbbell,
  lose_weight: Flame,
  get_stronger: Target,
  improve_endurance: Heart,
  general_fitness: Activity,
  sport_specific: Award,
};

export default function GoalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data, setGoals, nextStep, currentStep, totalSteps } = useOnboardingStore();

  const handleToggleGoal = (goal: FitnessGoal) => {
    const newGoals = data.goals.includes(goal)
      ? data.goals.filter((g) => g !== goal)
      : [...data.goals, goal];
    setGoals(newGoals);
  };

  const handleNext = () => {
    nextStep();
    router.push('/(onboarding)/experience');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
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
            What are your goals?
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

        {/* Goals grid */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {(Object.keys(goalLabels) as FitnessGoal[]).map((goal) => {
            const Icon = goalIcons[goal];
            const isSelected = data.goals.includes(goal);

            return (
              <TouchableOpacity
                key={goal}
                onPress={() => handleToggleGoal(goal)}
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
                  {goalLabels[goal]}
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
            disabled={data.goals.length === 0}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
