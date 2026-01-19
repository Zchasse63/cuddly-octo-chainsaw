import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Plus,
  Check,
  X,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  GripVertical,
  MoreVertical,
  Timer,
  Trophy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { useWorkoutStore, useActiveWorkout, useRestTimer } from '../../src/stores/workout';
import { api } from '../../src/lib/trpc';
import { useWeightUnit, formatWeight } from '../../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius, heights, springs } from '../../src/theme/tokens';
import { ExerciseSelector } from '../../src/components/workout/ExerciseSelector';
import { SetLoggingForm } from '../../src/components/workout/SetLoggingForm';
import { VoiceLoggingButton } from '../../src/components/workout/VoiceLoggingButton';
import { RestTimer } from '../../src/components/workout/RestTimer';
import { PRCelebration } from '../../src/components/workout/PRCelebration';
import { WorkoutSummary } from '../../src/components/workout/WorkoutSummary';
import { BadgeCelebration } from '../../src/components/badges/BadgeCelebration';

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { exerciseId: preselectedExerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const user = useAuthStore((state) => state.user);
  const weightUnit = useWeightUnit();

  // Local state
  const [isRecording, setIsRecording] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [prData, setPRData] = useState<{ exerciseName: string; weight: number; reps: number; weightUnit: string } | null>(null);
  const [showCompleteSummary, setShowCompleteSummary] = useState(false);
  const [showBadgeCelebration, setShowBadgeCelebration] = useState(false);
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState<any>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Workout store
  const activeWorkout = useActiveWorkout();
  const restTimer = useRestTimer();
  const {
    startWorkout,
    endWorkout,
    cancelWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    completeSet,
    duplicateLastSet,
    startRestTimer,
    stopRestTimer,
    resetRestTimer,
    tickRestTimer,
  } = useWorkoutStore();

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // Get exercise details for preselected
  const { data: preselectedExercise } = api.exercise.byId.useQuery(
    { id: preselectedExerciseId || '' },
    { enabled: !!preselectedExerciseId }
  );

  // Badge check mutation
  const checkBadgesMutation = api.gamification.checkBadgesAfterWorkout.useMutation();

  // Save workout mutation
  const saveWorkoutMutation = api.workout.complete.useMutation({
    onSuccess: async (data) => {
      endWorkout();
      setToast({
        visible: true,
        message: `Workout saved! ${data.summary.totalSets} sets, ${data.summary.prsAchieved} PRs`,
        type: 'success',
      });

      // Check for new badges
      try {
        const badgeResult = await checkBadgesMutation.mutateAsync({ workoutId: data.workout.id });
        if (badgeResult?.newBadges && badgeResult.newBadges.length > 0) {
          const firstBadge = badgeResult.newBadges[0];
          if (firstBadge?.definition) {
            setNewlyEarnedBadge(firstBadge.definition);
            setShowBadgeCelebration(true);
          }
        }
      } catch (e) {
        // Badge check failed silently - don't block workout completion
      }

      router.push(`/workout/${data.workout.id}`);
    },
    onError: (error) => {
      setToast({ visible: true, message: error.message, type: 'error' });
    },
  });

  // Start workout timer
  useEffect(() => {
    if (activeWorkout) {
      const startTime = new Date(activeWorkout.startedAt).getTime();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeWorkout?.id]);

  // Rest timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (restTimer.running && restTimer.seconds > 0) {
      interval = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer.running, restTimer.seconds]);

  // Play sound when rest timer ends
  useEffect(() => {
    if (restTimer.running && restTimer.seconds === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [restTimer.seconds]);

  // Add preselected exercise
  useEffect(() => {
    if (preselectedExercise && activeWorkout) {
      addExercise({
        id: preselectedExercise.id,
        name: preselectedExercise.name,
        primaryMuscle: preselectedExercise.primaryMuscle,
      });
    }
  }, [preselectedExercise?.id, activeWorkout?.id]);

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startWorkout({ loggingMethod: 'manual' });
    if (preselectedExercise) {
      addExercise({
        id: preselectedExercise.id,
        name: preselectedExercise.name,
        primaryMuscle: preselectedExercise.primaryMuscle,
      });
    }
  };

  const handleCompleteWorkout = () => {
    if (!activeWorkout) return;

    // Calculate totals
    let totalSets = 0;
    activeWorkout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.completedAt && !set.isWarmup) {
          totalSets++;
        }
      });
    });

    if (totalSets === 0) {
      Alert.alert('No sets logged', 'Log at least one set before completing the workout.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCompleteSummary(true);
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel this workout? All progress will be lost.',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            setToast({ visible: true, message: 'Workout cancelled', type: 'error' });
          },
        },
      ]
    );
  };

  const handleVoicePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(!isRecording);
    // Voice recognition handled by VoiceLoggingButton component
    // Integrated with voice parsing API in future iteration
  };

  const handleAddExercise = (exercise: { id: string; name: string; primaryMuscle?: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addExercise({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle || 'Unknown',
    });
    setShowExerciseSearch(false);
    // Expand the new exercise
    const newExerciseId = activeWorkout?.exercises[activeWorkout.exercises.length - 1]?.id;
    if (newExerciseId) setExpandedExercise(newExerciseId);
  };

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeSet(exerciseId, setId);
    // Check for PR and trigger celebration if needed
    // PR detection would come from backend response in real implementation
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, textAlign: 'center' }}>
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

      {/* Rest Timer Overlay */}
      <RestTimer
        visible={restTimer.running}
        seconds={restTimer.seconds}
        initialDuration={restTimer.target}
        onReset={resetRestTimer}
        onClose={stopRestTimer}
        onChangeDuration={(duration) => {
          stopRestTimer();
          startRestTimer(duration);
        }}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: restTimer.running ? 100 : spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <View>
            <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {activeWorkout ? 'Active Workout' : 'Workout'}
            </Text>
            {activeWorkout && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                <Clock size={16} color={colors.text.tertiary} />
                <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginLeft: spacing.xs }}>
                  {formatTime(elapsedSeconds)}
                </Text>
              </View>
            )}
          </View>
          {activeWorkout && (
            <TouchableOpacity
              onPress={handleCancelWorkout}
              style={{
                padding: spacing.xs,
                backgroundColor: colors.semantic.error + '20',
                borderRadius: borderRadius.md,
              }}
            >
              <X size={20} color={colors.semantic.error} />
            </TouchableOpacity>
          )}
        </View>

        {activeWorkout ? (
          <>

            {/* Exercises */}
            <View style={{ marginBottom: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                  Exercises ({activeWorkout.exercises.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setShowExerciseSearch(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.accent.blue,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <Plus size={16} color={colors.text.onAccent} />
                  <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs, fontSize: fontSize.sm }}>
                    Add Exercise
                  </Text>
                </TouchableOpacity>
              </View>

              {activeWorkout.exercises.length === 0 ? (
                <Card>
                  <View style={{ alignItems: 'center', padding: spacing.md }}>
                    <Dumbbell size={32} color={colors.text.disabled} />
                    <Text style={{ fontSize: fontSize.base, color: colors.text.tertiary, marginTop: spacing.sm }}>
                      No exercises added yet
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setShowExerciseSearch(true)}
                      style={{ marginTop: spacing.md }}
                    >
                      Add First Exercise
                    </Button>
                  </View>
                </Card>
              ) : (
                activeWorkout.exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    isExpanded={expandedExercise === exercise.id}
                    onToggleExpand={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
                    onAddSet={() => addSet(exercise.id)}
                    onUpdateSet={(setId, data) => updateSet(exercise.id, setId, data)}
                    onRemoveSet={(setId) => removeSet(exercise.id, setId)}
                    onCompleteSet={(setId) => handleCompleteSet(exercise.id, setId)}
                    onDuplicateSet={() => duplicateLastSet(exercise.id)}
                    onRemoveExercise={() => removeExercise(exercise.id)}
                    weightUnit={weightUnit}
                    colors={colors}
                  />
                ))
              )}
            </View>

            {/* Complete Button */}
            <Button
              onPress={handleCompleteWorkout}
              loading={saveWorkoutMutation.isPending}
              fullWidth
              style={{ marginTop: spacing.md }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Check size={20} color={colors.text.onAccent} />
                <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs, fontWeight: fontWeight.semibold }}>
                  Complete Workout
                </Text>
              </View>
            </Button>
          </>
        ) : (
          // No active workout
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 }}>
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
              <Dumbbell size={48} color={colors.accent.blue} />
            </View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.xs }}>
              Ready to train?
            </Text>
            <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.xl }}>
              Start a workout to log sets by voice or manually.
            </Text>
            <Button onPress={handleStartWorkout}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Play size={20} color={colors.text.onAccent} />
                <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs, fontWeight: fontWeight.semibold }}>
                  Start Workout
                </Text>
              </View>
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Exercise Search Modal */}
      <ExerciseSelector
        visible={showExerciseSearch}
        onClose={() => setShowExerciseSearch(false)}
        onSelectExercise={handleAddExercise}
      />

      {/* Voice Logging Button - positioned bottom-right above tab bar */}
      {activeWorkout && (
        <VoiceLoggingButton isRecording={isRecording} onPress={handleVoicePress} />
      )}

      {/* PR Celebration Modal */}
      {showPRCelebration && prData && (
        <PRCelebration
          visible={showPRCelebration}
          exerciseName={prData.exerciseName}
          weight={prData.weight}
          reps={prData.reps}
          weightUnit={prData.weightUnit as 'kg' | 'lb'}
          onDismiss={() => {
            setShowPRCelebration(false);
            setPRData(null);
          }}
        />
      )}

      {/* Workout Summary Modal */}
      {showCompleteSummary && activeWorkout && (() => {
        // Calculate summary data
        const startTime = new Date(activeWorkout.startedAt).getTime();
        const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

        let totalVolume = 0;
        let totalSets = 0;
        activeWorkout.exercises.forEach((ex) => {
          ex.sets.forEach((set) => {
            if (set.completedAt && !set.isWarmup) {
              totalSets++;
              totalVolume += (set.weight || 0) * (set.reps || 0);
            }
          });
        });

        return (
          <WorkoutSummary
            visible={showCompleteSummary}
            data={{
              durationSeconds,
              totalVolume,
              exerciseCount: activeWorkout.exercises.length,
              totalSets,
              prs: [],
            }}
            weightUnit={weightUnit}
            onSave={() => {
              if (!activeWorkout) return;
              saveWorkoutMutation.mutate({ workoutId: activeWorkout.id });
              setShowCompleteSummary(false);
            }}
            onDiscard={() => {
              cancelWorkout();
              setShowCompleteSummary(false);
            }}
          />
        );
      })()}

      {/* Badge Celebration Modal */}
      <BadgeCelebration
        visible={showBadgeCelebration}
        badge={newlyEarnedBadge}
        onDismiss={() => {
          setShowBadgeCelebration(false);
          setNewlyEarnedBadge(null);
        }}
      />
    </SafeAreaView>
  );
}

// Exercise Card Component
function ExerciseCard({
  exercise,
  isExpanded,
  onToggleExpand,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onCompleteSet,
  onDuplicateSet,
  onRemoveExercise,
  weightUnit,
  colors,
}: {
  exercise: any;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, data: any) => void;
  onRemoveSet: (setId: string) => void;
  onCompleteSet: (setId: string) => void;
  onDuplicateSet: () => void;
  onRemoveExercise: () => void;
  weightUnit: 'kg' | 'lb';
  colors: any;
}) {
  return (
    <Card style={{ marginBottom: spacing.sm }} padding="none">
      {/* Header */}
      <TouchableOpacity
        onPress={onToggleExpand}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.accent.blue + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.sm,
          }}
        >
          <Dumbbell size={18} color={colors.accent.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            {exercise.name}
          </Text>
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
            {exercise.sets.filter((s: any) => s.completedAt).length}/{exercise.sets.length} sets completed
          </Text>
        </View>
        <TouchableOpacity onPress={onRemoveExercise} style={{ padding: spacing.xs }}>
          <Trash2 size={18} color={colors.text.tertiary} />
        </TouchableOpacity>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.text.tertiary} />
        ) : (
          <ChevronDown size={20} color={colors.text.tertiary} />
        )}
      </TouchableOpacity>

      {/* Sets */}
      {isExpanded && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {/* Sets Table Header */}
          <View
            style={{
              flexDirection: 'row',
              paddingVertical: spacing.xs,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ width: 40, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
              SET
            </Text>
            <Text style={{ flex: 1, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
              WEIGHT
            </Text>
            <Text style={{ flex: 1, fontSize: fontSize.xs, color: colors.text.tertiary, fontWeight: fontWeight.medium }}>
              REPS
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Sets */}
          {exercise.sets.map((set: any, index: number) => {
            // Get previous set data
            const previousSet = index > 0 ? exercise.sets[index - 1] : undefined;
            const prevSetData = previousSet?.completedAt
              ? { weight: previousSet.weight || 0, reps: previousSet.reps || 0 }
              : undefined;

            return (
              <SetLoggingForm
                key={set.id}
                set={set}
                setNumber={index + 1}
                previousSet={prevSetData}
                weightUnit={weightUnit}
                onUpdate={(data) => onUpdateSet(set.id, data)}
                onComplete={() => onCompleteSet(set.id)}
                onRemove={() => onRemoveSet(set.id)}
                showRPE={true}
              />
            );
          })}

          {/* Add Set Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TouchableOpacity
              onPress={onAddSet}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.sm,
                backgroundColor: colors.background.tertiary,
                borderRadius: borderRadius.md,
              }}
            >
              <Plus size={16} color={colors.accent.blue} />
              <Text style={{ color: colors.accent.blue, marginLeft: spacing.xs, fontSize: fontSize.sm }}>
                Add Set
              </Text>
            </TouchableOpacity>
            {exercise.sets.length > 0 && (
              <TouchableOpacity
                onPress={onDuplicateSet}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: spacing.sm,
                  backgroundColor: colors.background.tertiary,
                  borderRadius: borderRadius.md,
                }}
              >
                <Text style={{ color: colors.text.secondary, fontSize: fontSize.sm }}>
                  Duplicate Last
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}

