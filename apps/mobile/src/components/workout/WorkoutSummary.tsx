import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { X, Trophy, Clock, Dumbbell, Target } from 'lucide-react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme/tokens';

interface WorkoutSummaryData {
  durationSeconds: number;
  totalVolume: number;
  exerciseCount: number;
  totalSets: number;
  prs: Array<{
    exerciseName: string;
    weight: number;
    reps: number;
  }>;
}

interface WorkoutSummaryProps {
  visible: boolean;
  data: WorkoutSummaryData;
  weightUnit: 'kg' | 'lb';
  onSave: () => void;
  onDiscard: () => void;
}

export function WorkoutSummary({ visible, data, weightUnit, onSave, onDiscard }: WorkoutSummaryProps) {
  const { colors } = useTheme();

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleDiscard = () => {
    Alert.alert('Discard Workout', 'Are you sure you want to discard this workout? All progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onDiscard },
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.overlay.scrim,
          justifyContent: 'center',
          padding: spacing.md,
        }}
      >
        <Animated.View
          entering={SlideInUp.springify()}
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            maxHeight: '80%',
            ...shadows.xl,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              Workout Complete!
            </Text>
            <TouchableOpacity onPress={handleDiscard}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            {/* Stats Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
              {/* Duration */}
              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: colors.background.secondary,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Clock size={16} color={colors.accent.blue} />
                  <Text
                    style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}
                  >
                    Duration
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: fontSize['2xl'],
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatDuration(data.durationSeconds)}
                </Text>
              </View>

              {/* Total Volume */}
              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: colors.background.secondary,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Target size={16} color={colors.accent.green} />
                  <Text
                    style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}
                  >
                    Total Volume
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: fontSize['2xl'],
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {data.totalVolume.toLocaleString()}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>{weightUnit}</Text>
              </View>

              {/* Exercises */}
              <View
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: colors.background.secondary,
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Dumbbell size={16} color={colors.accent.purple} />
                  <Text
                    style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}
                  >
                    Exercises
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: fontSize['2xl'],
                    fontWeight: fontWeight.bold,
                    color: colors.text.primary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {data.exerciseCount}
                </Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                  {data.totalSets} sets
                </Text>
              </View>
            </View>

            {/* PRs Section */}
            {data.prs.length > 0 && (
              <View
                style={{
                  backgroundColor: '#FFE66D20',
                  padding: spacing.md,
                  borderRadius: borderRadius.lg,
                  marginBottom: spacing.lg,
                  borderWidth: 1,
                  borderColor: '#FFE66D40',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Trophy size={20} color="#FFE66D" />
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: '#FFE66D',
                      marginLeft: spacing.xs,
                    }}
                  >
                    Personal Records ({data.prs.length})
                  </Text>
                </View>
                {data.prs.map((pr, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: spacing.xs,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: '#FFE66D20',
                    }}
                  >
                    <Text style={{ fontSize: fontSize.base, color: colors.text.primary }}>
                      {pr.exerciseName}
                    </Text>
                    <Text
                      style={{
                        fontSize: fontSize.base,
                        fontWeight: fontWeight.semibold,
                        color: '#FFE66D',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {pr.weight}{weightUnit} × {pr.reps}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Message */}
            <Text
              style={{
                fontSize: fontSize.base,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.lg,
              }}
            >
              {data.prs.length > 0
                ? `Amazing work! You set ${data.prs.length} new record${data.prs.length > 1 ? 's' : ''} today!`
                : 'Great job! Keep up the consistency!'}
            </Text>

            {/* Actions */}
            <View style={{ gap: spacing.sm }}>
              <Button onPress={onSave} fullWidth>
                Save Workout
              </Button>
              <Button variant="ghost" onPress={handleDiscard} fullWidth>
                Discard
              </Button>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
