import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Check, Minus, Plus, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, springs } from '../theme/tokens';

interface QuickSetEditorProps {
  exerciseName: string;
  setNumber: number;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  reps: number;
  onWeightChange: (weight: number) => void;
  onRepsChange: (reps: number) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  isPending?: boolean;
  isVisible: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function QuickSetEditor({
  exerciseName,
  setNumber,
  weight,
  weightUnit,
  reps,
  onWeightChange,
  onRepsChange,
  onConfirm,
  onDismiss,
  isPending = false,
  isVisible,
}: QuickSetEditorProps) {
  const { colors } = useTheme();

  // Animation values
  const translateY = useSharedValue(100);
  const confirmScale = useSharedValue(1);
  const confirmBgProgress = useSharedValue(0);
  const weightFlash = useSharedValue(0);
  const repsFlash = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(isVisible ? 0 : 100, springs.snappy);
  }, [isVisible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const confirmButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confirmScale.value }],
    backgroundColor: interpolateColor(
      confirmBgProgress.value,
      [0, 1],
      [colors.semantic.success, colors.accent.green]
    ),
  }));

  const weightValueStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      weightFlash.value,
      [0, 1],
      ['transparent', colors.tint.info]
    ),
  }));

  const repsValueStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      repsFlash.value,
      [0, 1],
      ['transparent', colors.tint.info]
    ),
  }));

  const handleWeightIncrement = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const increment = weightUnit === 'kg' ? 2.5 : 5;
    const newWeight = Math.max(0, weight + (delta * increment));
    onWeightChange(newWeight);
    weightFlash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 200 })
    );
  };

  const handleRepsIncrement = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newReps = Math.max(1, reps + delta);
    onRepsChange(newReps);
    repsFlash.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 200 })
    );
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confirmScale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1, springs.bouncy)
    );
    confirmBgProgress.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
    // Delay the actual confirm to let animation play
    setTimeout(onConfirm, 200);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        {
          backgroundColor: colors.background.secondary,
          borderTopColor: colors.border.light,
        },
      ]}
    >
      {/* Header with exercise name and dismiss */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={[styles.exerciseName, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
          <Text style={[styles.setNumber, { color: colors.text.tertiary }]}>
            Set {setNumber}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={[styles.dismissButton, { backgroundColor: colors.background.tertiary }]}
          accessibilityLabel="Dismiss quick editor"
          accessibilityRole="button"
        >
          <X size={16} color={colors.icon.secondary} />
        </TouchableOpacity>
      </View>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        {/* Weight control */}
        <View style={styles.controlGroup}>
          <Text style={[styles.controlLabel, { color: colors.text.tertiary }]}>
            Weight
          </Text>
          <View style={styles.controlInputRow}>
            <TouchableOpacity
              onPress={() => handleWeightIncrement(-1)}
              style={[styles.incrementButton, { backgroundColor: colors.background.tertiary }]}
              accessibilityLabel={`Decrease weight by ${weightUnit === 'kg' ? '2.5' : '5'} ${weightUnit}`}
              accessibilityRole="button"
            >
              <Minus size={18} color={colors.icon.primary} />
            </TouchableOpacity>
            <Animated.View style={[styles.valueContainer, weightValueStyle]}>
              <Text style={[styles.valueText, { color: colors.text.primary }]}>
                {weight}
              </Text>
              <Text style={[styles.unitText, { color: colors.text.tertiary }]}>
                {weightUnit}
              </Text>
            </Animated.View>
            <TouchableOpacity
              onPress={() => handleWeightIncrement(1)}
              style={[styles.incrementButton, { backgroundColor: colors.background.tertiary }]}
              accessibilityLabel={`Increase weight by ${weightUnit === 'kg' ? '2.5' : '5'} ${weightUnit}`}
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.icon.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reps control */}
        <View style={styles.controlGroup}>
          <Text style={[styles.controlLabel, { color: colors.text.tertiary }]}>
            Reps
          </Text>
          <View style={styles.controlInputRow}>
            <TouchableOpacity
              onPress={() => handleRepsIncrement(-1)}
              style={[styles.incrementButton, { backgroundColor: colors.background.tertiary }]}
              accessibilityLabel="Decrease reps by 1"
              accessibilityRole="button"
            >
              <Minus size={18} color={colors.icon.primary} />
            </TouchableOpacity>
            <Animated.View style={[styles.valueContainer, repsValueStyle]}>
              <Text style={[styles.valueText, { color: colors.text.primary }]}>
                {reps}
              </Text>
            </Animated.View>
            <TouchableOpacity
              onPress={() => handleRepsIncrement(1)}
              style={[styles.incrementButton, { backgroundColor: colors.background.tertiary }]}
              accessibilityLabel="Increase reps by 1"
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.icon.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm button */}
        <AnimatedTouchable
          onPress={handleConfirm}
          disabled={isPending}
          style={[styles.confirmButton, confirmButtonStyle]}
          accessibilityLabel={`Confirm set: ${weight} ${weightUnit} for ${reps} reps`}
          accessibilityRole="button"
          accessibilityHint="Double tap to log this set"
        >
          <Check size={24} color="#FFFFFF" strokeWidth={3} />
        </AnimatedTouchable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  setNumber: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  controlGroup: {
    flex: 1,
  },
  controlLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  controlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  incrementButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 60,
  },
  valueText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  unitText: {
    fontSize: fontSize.sm,
    marginLeft: 2,
  },
  confirmButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
