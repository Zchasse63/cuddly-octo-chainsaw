import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Battery,
  Brain,
  Activity,
  Utensils,
  Heart,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme/ThemeContext';
import { Button, Card, Toast } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

interface CheckInData {
  sleepHours: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  sorenessLevel: number | null;
  energyLevel: number | null;
  motivationLevel: number | null;
  nutritionQuality: number | null;
}

const initialData: CheckInData = {
  sleepHours: null,
  sleepQuality: null,
  stressLevel: null,
  sorenessLevel: null,
  energyLevel: null,
  motivationLevel: null,
  nutritionQuality: null,
};

export default function ReadinessScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<CheckInData>(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const submitMutation = api.readiness.checkIn.useMutation({
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToast({
        visible: true,
        message: `Readiness score: ${result.recoveryScore}%`,
        type: 'success',
      });
      setTimeout(() => router.back(), 1500);
    },
    onError: (error) => {
      setToast({ visible: true, message: error.message, type: 'error' });
    },
  });

  const steps = [
    {
      key: 'sleepHours',
      title: 'How many hours did you sleep?',
      icon: Moon,
      type: 'hours',
      options: [4, 5, 6, 7, 8, 9, 10],
    },
    {
      key: 'sleepQuality',
      title: 'How was your sleep quality?',
      icon: Moon,
      type: 'scale',
      labels: ['Terrible', 'Poor', 'Okay', 'Good', 'Great'],
    },
    {
      key: 'energyLevel',
      title: 'What\'s your energy level?',
      icon: Battery,
      type: 'scale',
      labels: ['Exhausted', 'Low', 'Moderate', 'Good', 'Energized'],
    },
    {
      key: 'stressLevel',
      title: 'How stressed are you?',
      icon: Brain,
      type: 'scale',
      labels: ['Very High', 'High', 'Moderate', 'Low', 'Very Low'],
    },
    {
      key: 'sorenessLevel',
      title: 'How sore are you?',
      icon: Activity,
      type: 'scale',
      labels: ['Very Sore', 'Sore', 'Moderate', 'Slight', 'None'],
    },
    {
      key: 'motivationLevel',
      title: 'How motivated are you to train?',
      icon: Heart,
      type: 'scale',
      labels: ['Not at all', 'Low', 'Moderate', 'High', 'Very High'],
    },
    {
      key: 'nutritionQuality',
      title: 'How was your nutrition yesterday?',
      icon: Utensils,
      type: 'scale',
      labels: ['Poor', 'Below Avg', 'Average', 'Good', 'Excellent'],
    },
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleSelect = (value: number) => {
    Haptics.selectionAsync();
    setData((prev) => ({
      ...prev,
      [currentStepData.key]: value,
    }));

    // Auto advance after short delay
    setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }, 300);
  };

  const handleSubmit = () => {
    // Validate all fields
    const isComplete = Object.values(data).every((v) => v !== null);
    if (!isComplete) {
      setToast({ visible: true, message: 'Please complete all questions', type: 'error' });
      return;
    }

    submitMutation.mutate({
      sleepHours: data.sleepHours!,
      sleepQuality: data.sleepQuality!,
      stressLevel: data.stressLevel!,
      sorenessLevel: data.sorenessLevel!,
      energyLevel: data.energyLevel!,
      motivationLevel: data.motivationLevel!,
      nutritionQuality: data.nutritionQuality!,
    });
  };

  const getValue = (key: string) => data[key as keyof CheckInData];
  const isComplete = Object.values(data).every((v) => v !== null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginLeft: spacing.md,
          }}
        >
          Readiness Check-In
        </Text>
      </View>

      {/* Progress */}
      <View style={{ flexDirection: 'row', padding: spacing.md, gap: spacing.xs }}>
        {steps.map((step, index) => (
          <View
            key={step.key}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: getValue(step.key) !== null
                ? colors.accent.blue
                : index === currentStep
                  ? colors.accent.blue + '50'
                  : colors.background.tertiary,
            }}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}>
        {/* Current Question */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent.blue + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Icon size={32} color={colors.accent.blue} />
          </View>
          <Text
            style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              textAlign: 'center',
            }}
          >
            {currentStepData.title}
          </Text>
        </View>

        {/* Options */}
        {currentStepData.type === 'hours' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
            {currentStepData.options?.map((hours) => (
              <TouchableOpacity
                key={hours}
                onPress={() => handleSelect(hours)}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: borderRadius.lg,
                  backgroundColor: getValue(currentStepData.key) === hours
                    ? colors.accent.blue
                    : colors.background.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.xl,
                    fontWeight: fontWeight.bold,
                    color: getValue(currentStepData.key) === hours
                      ? colors.text.onAccent
                      : colors.text.primary,
                  }}
                >
                  {hours}
                </Text>
                <Text
                  style={{
                    fontSize: fontSize.xs,
                    color: getValue(currentStepData.key) === hours
                      ? colors.text.onAccent
                      : colors.text.tertiary,
                  }}
                >
                  hrs
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {currentStepData.labels?.map((label, index) => {
              const value = index + 1;
              const isSelected = getValue(currentStepData.key) === value;

              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleSelect(value)}
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
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.accent.blue : colors.border.medium,
                      backgroundColor: isSelected ? colors.accent.blue : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    {isSelected && <Check size={14} color={colors.text.onAccent} />}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: fontSize.base,
                      color: colors.text.primary,
                    }}
                  >
                    {label}
                  </Text>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.background.tertiary,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
                      {value}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ flex: 1 }} />

        {/* Navigation */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
          {currentStep > 0 && (
            <Button
              variant="outline"
              onPress={() => setCurrentStep(currentStep - 1)}
              style={{ flex: 1 }}
            >
              Back
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              onPress={() => setCurrentStep(currentStep + 1)}
              disabled={getValue(currentStepData.key) === null}
              style={{ flex: 1 }}
            >
              Next
            </Button>
          ) : (
            <Button
              onPress={handleSubmit}
              loading={submitMutation.isPending}
              disabled={!isComplete}
              style={{ flex: 1 }}
            >
              Submit
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
