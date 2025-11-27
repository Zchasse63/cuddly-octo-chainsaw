import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import {
  ArrowLeft,
  ChevronRight,
  Target,
  Calendar,
  Dumbbell,
  Clock,
  Footprints,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type Step = 'goal' | 'experience' | 'days' | 'duration' | 'focus' | 'equipment' | 'limitations' | 'review';

interface QuestionnaireData {
  primaryGoal: string;
  secondaryGoal?: string;
  experienceLevel: string;
  daysPerWeek: number;
  sessionDuration: number;
  focusAreas: string[];
  equipment: string[];
  limitations: string[];
  notes?: string;
}

const GOALS = [
  { id: 'strength', label: 'Build Strength', icon: Dumbbell, description: 'Increase maximal strength' },
  { id: 'muscle', label: 'Build Muscle', icon: Dumbbell, description: 'Hypertrophy focus' },
  { id: 'endurance', label: 'Improve Endurance', icon: Footprints, description: 'Better cardio capacity' },
  { id: 'hybrid', label: 'Hybrid Athlete', icon: Target, description: 'Strength + Running' },
  { id: 'weightloss', label: 'Lose Weight', icon: Target, description: 'Fat loss with strength' },
  { id: 'maintenance', label: 'Maintain Fitness', icon: Target, description: 'Stay consistent' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: '< 1 year training' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years training' },
  { id: 'advanced', label: 'Advanced', description: '3+ years training' },
];

const FOCUS_AREAS = [
  'Upper Body Push', 'Upper Body Pull', 'Legs', 'Core',
  'Olympic Lifts', 'Powerlifting', 'CrossFit', 'Running',
];

const EQUIPMENT = [
  'Barbell', 'Dumbbells', 'Kettlebells', 'Pull-up Bar',
  'Cables', 'Machines', 'Bands', 'Cardio Equipment',
];

export default function ProgramQuestionnaireScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('goal');
  const [data, setData] = useState<QuestionnaireData>({
    primaryGoal: '',
    experienceLevel: '',
    daysPerWeek: 4,
    sessionDuration: 60,
    focusAreas: [],
    equipment: [],
    limitations: [],
  });

  // Generate program mutation
  const generateMutation = api.coach.generateProgram.useMutation({
    onSuccess: (result) => {
      router.replace(`/program-detail?id=${result.programId}`);
    },
  });

  const steps: Step[] = ['goal', 'experience', 'days', 'duration', 'focus', 'equipment', 'limitations', 'review'];
  const currentIndex = steps.indexOf(currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'goal':
        return !!data.primaryGoal;
      case 'experience':
        return !!data.experienceLevel;
      case 'days':
        return data.daysPerWeek > 0;
      case 'duration':
        return data.sessionDuration > 0;
      case 'focus':
        return data.focusAreas.length > 0;
      case 'equipment':
        return data.equipment.length > 0;
      default:
        return true;
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'goal':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>What's your primary fitness goal?</Text>
            <View style={{ gap: spacing.sm }}>
              {GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = data.primaryGoal === goal.id;
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => setData({ ...data, primaryGoal: goal.id })}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.md,
                      backgroundColor: isSelected ? colors.accent.blue + '20' : colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent.blue : 'transparent',
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isSelected ? colors.accent.blue : colors.background.tertiary,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      <Icon size={24} color={isSelected ? colors.text.onAccent : colors.text.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {goal.label}
                      </Text>
                      <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                        {goal.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'experience':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>What's your experience level?</Text>
            <View style={{ gap: spacing.sm }}>
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = data.experienceLevel === level.id;
                return (
                  <TouchableOpacity
                    key={level.id}
                    onPress={() => setData({ ...data, experienceLevel: level.id })}
                    style={{
                      padding: spacing.lg,
                      backgroundColor: isSelected ? colors.accent.blue + '20' : colors.background.secondary,
                      borderRadius: borderRadius.lg,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent.blue : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.lg,
                        fontWeight: fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      {level.label}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>{level.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'days':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>How many days per week can you train?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg }}>
              {[2, 3, 4, 5, 6].map((days) => {
                const isSelected = data.daysPerWeek === days;
                return (
                  <TouchableOpacity
                    key={days}
                    onPress={() => setData({ ...data, daysPerWeek: days })}
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: isSelected ? colors.accent.blue : colors.background.secondary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent.blue : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.xl,
                        fontWeight: fontWeight.bold,
                        color: isSelected ? colors.text.onAccent : colors.text.primary,
                      }}
                    >
                      {days}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ textAlign: 'center', marginTop: spacing.md, color: colors.text.tertiary }}>
              {data.daysPerWeek} days per week
            </Text>
          </Animated.View>
        );

      case 'duration':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>How long are your workout sessions?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
              {[30, 45, 60, 75, 90].map((duration) => {
                const isSelected = data.sessionDuration === duration;
                return (
                  <TouchableOpacity
                    key={duration}
                    onPress={() => setData({ ...data, sessionDuration: duration })}
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: borderRadius.lg,
                      backgroundColor: isSelected ? colors.accent.blue : colors.background.secondary,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent.blue : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                        color: isSelected ? colors.text.onAccent : colors.text.primary,
                      }}
                    >
                      {duration} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'focus':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>What areas do you want to focus on?</Text>
            <Text style={{ color: colors.text.tertiary, marginBottom: spacing.md }}>Select all that apply</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {FOCUS_AREAS.map((area) => {
                const isSelected = data.focusAreas.includes(area);
                return (
                  <TouchableOpacity
                    key={area}
                    onPress={() =>
                      setData({ ...data, focusAreas: toggleArrayItem(data.focusAreas, area) })
                    }
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: borderRadius.full,
                      backgroundColor: isSelected ? colors.accent.blue : colors.background.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: isSelected ? colors.text.onAccent : colors.text.primary,
                      }}
                    >
                      {area}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'equipment':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>What equipment do you have access to?</Text>
            <Text style={{ color: colors.text.tertiary, marginBottom: spacing.md }}>Select all that apply</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {EQUIPMENT.map((item) => {
                const isSelected = data.equipment.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() =>
                      setData({ ...data, equipment: toggleArrayItem(data.equipment, item) })
                    }
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: borderRadius.full,
                      backgroundColor: isSelected ? colors.accent.blue : colors.background.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: isSelected ? colors.text.onAccent : colors.text.primary,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'limitations':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={styles.question(colors)}>Any injuries or limitations?</Text>
            <Text style={{ color: colors.text.tertiary, marginBottom: spacing.md }}>Optional - helps us customize</Text>
            <TextInput
              value={data.notes}
              onChangeText={(text) => setData({ ...data, notes: text })}
              placeholder="E.g., bad lower back, knee issues, shoulder injury..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: colors.background.secondary,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                fontSize: fontSize.base,
                color: colors.text.primary,
                minHeight: 120,
                textAlignVertical: 'top',
              }}
            />
          </Animated.View>
        );

      case 'review':
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.accent.blue + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Sparkles size={32} color={colors.accent.blue} />
              </View>
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.md,
                }}
              >
                Ready to Generate!
              </Text>
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.tertiary,
                  textAlign: 'center',
                  marginTop: spacing.xs,
                }}
              >
                Our AI coach will create a personalized program based on your preferences
              </Text>
            </View>

            <Card>
              <ReviewItem
                icon={<Target size={18} color={colors.accent.blue} />}
                label="Goal"
                value={GOALS.find((g) => g.id === data.primaryGoal)?.label || ''}
                colors={colors}
              />
              <ReviewItem
                icon={<Dumbbell size={18} color={colors.accent.blue} />}
                label="Experience"
                value={EXPERIENCE_LEVELS.find((l) => l.id === data.experienceLevel)?.label || ''}
                colors={colors}
              />
              <ReviewItem
                icon={<Calendar size={18} color={colors.accent.blue} />}
                label="Frequency"
                value={`${data.daysPerWeek} days/week`}
                colors={colors}
              />
              <ReviewItem
                icon={<Clock size={18} color={colors.accent.blue} />}
                label="Duration"
                value={`${data.sessionDuration} min/session`}
                colors={colors}
              />
              <ReviewItem
                icon={<Target size={18} color={colors.accent.blue} />}
                label="Focus"
                value={data.focusAreas.join(', ')}
                colors={colors}
                isLast
              />
            </Card>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <TouchableOpacity onPress={goBack}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <View
            style={{
              height: 4,
              backgroundColor: colors.background.tertiary,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: colors.accent.blue,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
        <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
          {currentIndex + 1}/{steps.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, flex: 1 }}>{renderStep()}</ScrollView>

      {/* Bottom Button */}
      <View style={{ padding: spacing.md, paddingBottom: spacing.lg }}>
        {currentStep === 'review' ? (
          <Button
            onPress={() => generateMutation.mutate(data)}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating Program...' : 'Generate My Program'}
          </Button>
        ) : (
          <Button onPress={goNext} disabled={!canProceed()}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: colors.text.onAccent, fontWeight: fontWeight.semibold }}>Continue</Text>
              <ChevronRight size={20} color={colors.text.onAccent} style={{ marginLeft: spacing.xs }} />
            </View>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

function ReviewItem({
  icon,
  label,
  value,
  colors,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border.light,
      }}
    >
      {icon}
      <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginLeft: spacing.sm, width: 80 }}>
        {label}
      </Text>
      <Text
        style={{ flex: 1, fontSize: fontSize.sm, color: colors.text.primary, fontWeight: fontWeight.medium }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = {
  question: (colors: any) => ({
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  }),
};
