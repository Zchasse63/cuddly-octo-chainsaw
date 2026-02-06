import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Check, Trash2, Trophy, TrendingUp } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface SetData {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  notes?: string | null;
  completedAt?: string | null;
  isPR?: boolean;
  isWarmup?: boolean;
}

interface PreviousSetData {
  weight: number;
  reps: number;
}

interface SetLoggingFormProps {
  set: SetData;
  setNumber: number;
  previousSet?: PreviousSetData;
  weightUnit: 'kg' | 'lb';
  onUpdate: (data: Partial<SetData>) => void;
  onComplete: () => void;
  onRemove: () => void;
  showRPE?: boolean;
}

export function SetLoggingForm({
  set,
  setNumber,
  previousSet,
  weightUnit,
  onUpdate,
  onComplete,
  onRemove,
  showRPE = true,
}: SetLoggingFormProps) {
  const { colors } = useTheme();
  const isCompleted = !!set.completedAt;

  const handleAutoIncrement = () => {
    if (previousSet) {
      const increment = weightUnit === 'kg' ? 2.5 : 5;
      const newWeight = previousSet.weight + increment;
      onUpdate({ weight: newWeight, reps: previousSet.reps });
    }
  };

  return (
    <View
      style={{
        paddingVertical: spacing.sm,
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      {/* Set Header with Previous Reference */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: fontWeight.semibold }}>
            {set.isWarmup ? 'Warmup' : `Set ${setNumber}`}
          </Text>
          {set.isPR && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: spacing.xs }}>
              <Trophy size={14} color="#FFE66D" />
              <Text style={{ fontSize: fontSize.xs, color: '#FFE66D', marginLeft: 2 }}>PR!</Text>
            </View>
          )}
        </View>
        {previousSet && !isCompleted && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
              Last: {previousSet.weight}{weightUnit} × {previousSet.reps}
            </Text>
            <TouchableOpacity onPress={handleAutoIncrement} style={{ marginLeft: spacing.xs }}>
              <View
                style={{
                  backgroundColor: colors.accent.blue + '20',
                  paddingHorizontal: spacing.xs,
                  paddingVertical: 2,
                  borderRadius: borderRadius.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TrendingUp size={10} color={colors.accent.blue} />
                <Text style={{ fontSize: fontSize.xs, color: colors.accent.blue, marginLeft: 2 }}>
                  +{weightUnit === 'kg' ? '2.5' : '5'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Weight and Reps Inputs */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: showRPE && !isCompleted ? spacing.sm : 0 }}>
        {/* Weight Input */}
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: 4 }}>Weight ({weightUnit})</Text>
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
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          />
        </View>

        {/* Reps Input */}
        <View style={{ flex: 1, marginRight: spacing.xs }}>
          <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: 4 }}>Reps</Text>
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
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
            }}
          />
        </View>

        {/* Actions */}
        <View style={{ width: 60, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs, alignSelf: 'flex-end' }}>
          {!isCompleted && (
            <TouchableOpacity
              onPress={onComplete}
              disabled={!set.weight || !set.reps}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
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
                width: 36,
                height: 36,
                borderRadius: 18,
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
                width: 36,
                height: 36,
                borderRadius: 18,
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

      {/* Optional RPE Slider */}
      {showRPE && !isCompleted && (
        <View style={{ marginTop: spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>RPE (Optional)</Text>
            {set.rpe && (
              <Text style={{ fontSize: fontSize.xs, color: colors.accent.purple, fontWeight: fontWeight.semibold }}>
                {set.rpe}/10
              </Text>
            )}
          </View>
          <Slider
            value={set.rpe || 5}
            onValueChange={(value: number) => onUpdate({ rpe: Math.round(value) })}
            minimumValue={1}
            maximumValue={10}
            step={1}
            minimumTrackTintColor={colors.accent.purple}
            maximumTrackTintColor={colors.background.tertiary}
            thumbTintColor={colors.accent.purple}
          />
        </View>
      )}
    </View>
  );
}
