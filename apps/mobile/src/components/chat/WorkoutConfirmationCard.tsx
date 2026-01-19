import { View, Text, TouchableOpacity } from 'react-native';
import { Check, X, ChevronDown, ChevronUp, Edit } from 'lucide-react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Button } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface WorkoutConfirmationCardProps {
  visible: boolean;
  exerciseName: string;
  weight: number;
  weightUnit: 'lbs' | 'kg';
  reps: number;
  transcript: string;
  confidence?: number;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function WorkoutConfirmationCard({
  visible,
  exerciseName,
  weight,
  weightUnit,
  reps,
  transcript,
  confidence = 0.8,
  onConfirm,
  onEdit,
  onCancel,
}: WorkoutConfirmationCardProps) {
  const { colors } = useTheme();
  const [showTranscript, setShowTranscript] = useState(false);

  const isLowConfidence = confidence < 0.7;

  if (!visible) return null;

  return (
    <Animated.View entering={SlideInUp.springify()} style={{ marginBottom: spacing.md }}>
      <Card
        style={{
          borderWidth: 2,
          borderColor: isLowConfidence ? colors.semantic.warning : colors.accent.blue,
          backgroundColor: isLowConfidence ? colors.tint.warning : colors.tint.info,
        }}
      >
        {isLowConfidence && (
          <View
            style={{
              backgroundColor: colors.semantic.warning + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.sm,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: fontSize.xs, color: colors.semantic.warning, fontWeight: fontWeight.medium }}>
              Low Confidence ({Math.round(confidence * 100)}%) - Please verify
            </Text>
          </View>
        )}

        <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginBottom: spacing.xs }}>
          I heard:
        </Text>

        <View
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            {exerciseName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs }}>
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.accent.blue }}>
              {weight}
            </Text>
            <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginLeft: spacing.xs }}>
              {weightUnit}
            </Text>
            <Text style={{ fontSize: fontSize.xl, color: colors.text.tertiary, marginHorizontal: spacing.sm }}>
              ×
            </Text>
            <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.accent.blue }}>
              {reps}
            </Text>
            <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginLeft: spacing.xs }}>
              reps
            </Text>
          </View>
        </View>

        {/* Transcript toggle */}
        <TouchableOpacity
          onPress={() => {
            setShowTranscript(!showTranscript);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, marginRight: spacing.xs }}>
            {showTranscript ? 'Hide' : 'Show'} Raw Transcript
          </Text>
          {showTranscript ? (
            <ChevronUp size={16} color={colors.text.secondary} />
          ) : (
            <ChevronDown size={16} color={colors.text.secondary} />
          )}
        </TouchableOpacity>

        {showTranscript && (
          <Animated.View
            entering={FadeIn}
            style={{
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.sm,
              padding: spacing.sm,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, fontStyle: 'italic' }}>
              "{transcript}"
            </Text>
          </Animated.View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEdit();
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
            }}
          >
            <Edit size={18} color={colors.text.secondary} />
            <Text style={{ fontSize: fontSize.sm, color: colors.text.primary, marginLeft: spacing.xs }}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.semantic.error + '20',
              borderRadius: borderRadius.md,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <X size={18} color={colors.semantic.error} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onConfirm();
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              backgroundColor: colors.semantic.success,
              borderRadius: borderRadius.md,
            }}
          >
            <Check size={18} color={colors.text.onAccent} />
            <Text
              style={{
                fontSize: fontSize.sm,
                color: colors.text.onAccent,
                marginLeft: spacing.xs,
                fontWeight: fontWeight.semibold,
              }}
            >
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
}
