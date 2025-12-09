import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { useWorkoutStore, useActiveWorkout, useRestTimer } from '../../src/stores/workout';
import { api } from '../../src/lib/trpc';
import { useWeightUnit, formatWeight } from '../../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius, heights, springs } from '../../src/theme/tokens';

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { exerciseId: preselectedExerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const user = useAuthStore((state) => state.user);
  const weightUnit = useWeightUnit();

  // Local state
  const [isRecording, setIsRecording] = useState(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
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

  // Animation for recording pulse
  const pulseScale = useSharedValue(1);

  // Search exercises
  const { data: exercises } = api.exercise.list.useQuery(
    { search: exerciseSearchQuery },
    { enabled: showExerciseSearch && exerciseSearchQuery.length >= 2 }
  );

  // Get exercise details for preselected
  const { data: preselectedExercise } = api.exercise.byId.useQuery(
    { id: preselectedExerciseId || '' },
    { enabled: !!preselectedExerciseId }
  );

  // Save workout mutation
  const saveWorkoutMutation = api.workout.complete.useMutation({
    onSuccess: (data) => {
      endWorkout();
      setToast({
        visible: true,
        message: `Workout saved! ${data.summary.totalSets} sets, ${data.summary.prsAchieved} PRs`,
        type: 'success',
      });
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
    let totalReps = 0;
    let totalVolume = 0;

    activeWorkout.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.completedAt && !set.isWarmup) {
          totalSets++;
          totalReps += set.reps || 0;
          totalVolume += (set.weight || 0) * (set.reps || 0);
        }
      });
    });

    if (totalSets === 0) {
      Alert.alert('No sets logged', 'Log at least one set before completing the workout.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save to backend - use workoutId from active workout
    // Note: In offline-first mode, the workout may not have a backend ID yet
    // For now, we'll use the local ID and let the sync handle it
    saveWorkoutMutation.mutate({
      workoutId: activeWorkout.id,
      notes: activeWorkout.notes || undefined,
    });
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

    if (!isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.1, springs.gentle),
          withSpring(1, springs.gentle)
        ),
        -1,
        true
      );
      // TODO: Start voice recognition
    } else {
      pulseScale.value = withSpring(1);
      // TODO: Stop voice recognition
    }
  };

  const handleAddExercise = (exercise: { id: string; name: string; primaryMuscle: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addExercise(exercise);
    setShowExerciseSearch(false);
    setExerciseSearchQuery('');
    // Expand the new exercise
    const newExerciseId = activeWorkout?.exercises[activeWorkout.exercises.length - 1]?.id;
    if (newExerciseId) setExpandedExercise(newExerciseId);
  };

  const handleCompleteSet = (exerciseId: string, setId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeSet(exerciseId, setId);
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

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
      {restTimer.running && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background.secondary,
            padding: spacing.md,
            borderTopLeftRadius: borderRadius.lg,
            borderTopRightRadius: borderRadius.lg,
            zIndex: 100,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Timer size={20} color={colors.accent.blue} />
              <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginLeft: spacing.xs }}>
                Rest Timer
              </Text>
            </View>
            <Text
              style={{
                fontSize: fontSize['3xl'],
                fontWeight: fontWeight.bold,
                color: restTimer.seconds <= 10 ? colors.semantic.error : colors.text.primary,
              }}
            >
              {formatTime(restTimer.seconds)}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity onPress={resetRestTimer}>
                <RotateCcw size={24} color={colors.text.secondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRestTimer}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

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
            {/* Voice FAB */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Animated.View style={pulseStyle}>
                <TouchableOpacity
                  onPress={handleVoicePress}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: isRecording ? colors.semantic.error : colors.accent.blue,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: isRecording ? colors.semantic.error : colors.accent.blue,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  {isRecording ? (
                    <MicOff size={32} color={colors.text.inverse} />
                  ) : (
                    <Mic size={32} color={colors.text.onAccent} />
                  )}
                </TouchableOpacity>
              </Animated.View>
              <Text style={{ marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {isRecording ? 'Listening... Say "135 for 10"' : 'Tap to log by voice'}
              </Text>
            </View>

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
      <Modal visible={showExerciseSearch} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              flex: 1,
              marginTop: 100,
              backgroundColor: colors.background.primary,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border.light,
              }}
            >
              <TouchableOpacity onPress={() => setShowExerciseSearch(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={{ flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary, marginLeft: spacing.md }}>
                Add Exercise
              </Text>
            </View>

            <View style={{ padding: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.lg,
                  paddingHorizontal: spacing.md,
                }}
              >
                <Dumbbell size={20} color={colors.icon.secondary} />
                <TextInput
                  value={exerciseSearchQuery}
                  onChangeText={setExerciseSearchQuery}
                  placeholder="Search exercises..."
                  placeholderTextColor={colors.text.disabled}
                  autoFocus
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    marginLeft: spacing.sm,
                    fontSize: fontSize.base,
                    color: colors.text.primary,
                  }}
                />
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
              {exercises?.map((exercise: any) => (
                <TouchableOpacity
                  key={exercise.id}
                  onPress={() => handleAddExercise(exercise)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    backgroundColor: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.sm,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: borderRadius.md,
                      backgroundColor: colors.accent.blue + '20',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Dumbbell size={20} color={colors.accent.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text.primary }}>
                      {exercise.name}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                      {exercise.primaryMuscle}
                    </Text>
                  </View>
                  <Plus size={20} color={colors.accent.blue} />
                </TouchableOpacity>
              ))}
              {exerciseSearchQuery.length < 2 && (
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                  Type at least 2 characters to search
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
          {exercise.sets.map((set: any, index: number) => (
            <SetRow
              key={set.id}
              set={set}
              setNumber={index + 1}
              onUpdate={(data) => onUpdateSet(set.id, data)}
              onComplete={() => onCompleteSet(set.id)}
              onRemove={() => onRemoveSet(set.id)}
              weightUnit={weightUnit}
              colors={colors}
            />
          ))}

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

// Set Row Component
function SetRow({
  set,
  setNumber,
  onUpdate,
  onComplete,
  onRemove,
  weightUnit,
  colors,
}: {
  set: any;
  setNumber: number;
  onUpdate: (data: any) => void;
  onComplete: () => void;
  onRemove: () => void;
  weightUnit: 'kg' | 'lb';
  colors: any;
}) {
  const isCompleted = !!set.completedAt;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      {/* Set Number */}
      <View style={{ width: 40, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
          {set.isWarmup ? 'W' : setNumber}
        </Text>
        {set.isPR && <Trophy size={12} color="#FFE66D" style={{ marginLeft: 4 }} />}
      </View>

      {/* Weight Input */}
      <View style={{ flex: 1, marginRight: spacing.xs }}>
        <TextInput
          value={set.weight?.toString() || ''}
          onChangeText={(text) => onUpdate({ weight: parseFloat(text) || null })}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.text.disabled}
          editable={!isCompleted}
          style={{
            fontSize: fontSize.base,
            color: colors.text.primary,
            backgroundColor: colors.background.tertiary,
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        />
      </View>

      {/* Reps Input */}
      <View style={{ flex: 1, marginRight: spacing.sm }}>
        <TextInput
          value={set.reps?.toString() || ''}
          onChangeText={(text) => onUpdate({ reps: parseInt(text) || null })}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.text.disabled}
          editable={!isCompleted}
          style={{
            fontSize: fontSize.base,
            color: colors.text.primary,
            backgroundColor: colors.background.tertiary,
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
          }}
        />
      </View>

      {/* Actions */}
      <View style={{ width: 60, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs }}>
        {!isCompleted && (
          <TouchableOpacity
            onPress={onComplete}
            disabled={!set.weight || !set.reps}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: set.weight && set.reps ? colors.accent.green : colors.background.tertiary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Check size={18} color={set.weight && set.reps ? colors.text.onAccent : colors.text.disabled} />
          </TouchableOpacity>
        )}
        {isCompleted ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.accent.green + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Check size={18} color={colors.accent.green} />
          </View>
        ) : (
          <TouchableOpacity
            onPress={onRemove}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.semantic.error + '20',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Trash2 size={14} color={colors.semantic.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
