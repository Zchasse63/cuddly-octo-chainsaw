import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Mic, MicOff, Plus, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius, heights, springs } from '../../src/theme/tokens';

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [isRecording, setIsRecording] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Animation for recording pulse
  const pulseScale = useSharedValue(1);

  // Get active workout
  const { data: activeWorkout, refetch: refetchActive } = api.workout.active.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Start workout mutation
  const startWorkout = api.workout.start.useMutation({
    onSuccess: () => {
      refetchActive();
      setToast({ visible: true, message: 'Workout started!', type: 'success' });
    },
    onError: (error) => {
      setToast({ visible: true, message: error.message, type: 'error' });
    },
  });

  // Complete workout mutation
  const completeWorkout = api.workout.complete.useMutation({
    onSuccess: (data) => {
      refetchActive();
      setToast({
        visible: true,
        message: `Workout complete! ${data.summary.totalSets} sets logged.`,
        type: 'success',
      });
    },
    onError: (error) => {
      setToast({ visible: true, message: error.message, type: 'error' });
    },
  });

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startWorkout.mutate({});
  };

  const handleCompleteWorkout = () => {
    if (!activeWorkout?.workout.id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeWorkout.mutate({ workoutId: activeWorkout.workout.id });
  };

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(!isRecording);

    if (!isRecording) {
      // Start pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.1, springs.gentle),
          withSpring(1, springs.gentle)
        ),
        -1,
        true
      );
    } else {
      // Stop animation
      pulseScale.value = withSpring(1);
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            Sign in to start tracking workouts
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}>
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            {activeWorkout ? 'Active Workout' : 'Workout'}
          </Text>
        </View>

        {activeWorkout ? (
          <>
            {/* Voice FAB */}
            <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
              <Animated.View style={pulseStyle}>
                <TouchableOpacity
                  onPress={handleVoicePress}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: isRecording
                      ? colors.semantic.error
                      : colors.accent.blue,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: isRecording
                      ? colors.semantic.error
                      : colors.accent.blue,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  {isRecording ? (
                    <MicOff size={48} color={colors.text.inverse} />
                  ) : (
                    <Mic size={48} color={colors.text.onAccent} />
                  )}
                </TouchableOpacity>
              </Animated.View>
              <Text
                style={{
                  marginTop: spacing.md,
                  fontSize: fontSize.base,
                  color: colors.text.secondary,
                }}
              >
                {isRecording ? 'Listening...' : 'Tap to log set by voice'}
              </Text>
            </View>

            {/* Current Sets */}
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Sets Logged ({activeWorkout.sets?.length || 0})
            </Text>

            {activeWorkout.sets && activeWorkout.sets.length > 0 ? (
              activeWorkout.sets.map((set, index) => (
                <Card key={set.id} style={{ marginBottom: spacing.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                        color: colors.text.primary,
                      }}
                    >
                      Set {set.setNumber}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        color: colors.text.secondary,
                      }}
                    >
                      {set.weight}{set.weightUnit} × {set.reps}
                      {set.isPr && ' 🎉'}
                    </Text>
                  </View>
                </Card>
              ))
            ) : (
              <Card>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    color: colors.text.tertiary,
                    textAlign: 'center',
                  }}
                >
                  No sets logged yet. Use voice or tap + to add.
                </Text>
              </Card>
            )}

            {/* Workout Actions */}
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Button onPress={handleCompleteWorkout} loading={completeWorkout.isPending}>
                Complete Workout
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  // Cancel workout
                }}
              >
                Cancel Workout
              </Button>
            </View>
          </>
        ) : (
          // No active workout
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: colors.background.secondary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Plus size={48} color={colors.accent.blue} />
            </View>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.xs,
              }}
            >
              Ready to train?
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.lg,
                paddingHorizontal: spacing.xl,
              }}
            >
              Start a workout to log sets by voice or manually.
            </Text>
            <Button onPress={handleStartWorkout} loading={startWorkout.isPending}>
              Start Workout
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
