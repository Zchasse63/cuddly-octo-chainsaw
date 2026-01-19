import { View, Text, TouchableOpacity } from 'react-native';
import { Check, X, ArrowRight, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, ZoomIn } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface SubstitutionSuggestion {
  originalExercise: string;
  suggestedExercise: string;
  reason: string;
}

interface ExerciseSubstitutionCardProps {
  suggestion: SubstitutionSuggestion;
  onAccept: () => void;
  onKeepOriginal: () => void;
}

export function ExerciseSubstitutionCard({
  suggestion,
  onAccept,
  onKeepOriginal,
}: ExerciseSubstitutionCardProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={SlideInUp.springify()} style={{ marginBottom: spacing.md }}>
      <Card
        style={{
          borderWidth: 2,
          borderColor: colors.accent.blue,
          backgroundColor: colors.tint.info,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.semantic.info,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.sm,
            }}
          >
            <AlertCircle size={18} color={colors.text.onAccent} />
          </View>
          <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            Exercise Substitution Suggested
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.semantic.warning + '20',
            borderRadius: borderRadius.sm,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            marginBottom: spacing.md,
            alignSelf: 'flex-start',
          }}
        >
          <Text style={{ fontSize: fontSize.xs, color: colors.semantic.warning, fontWeight: fontWeight.medium }}>
            {suggestion.reason}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          {/* Original Exercise */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginBottom: spacing.xs }}>
              Current
            </Text>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
              {suggestion.originalExercise}
            </Text>
          </View>

          {/* Arrow */}
          <View style={{ marginHorizontal: spacing.md }}>
            <ArrowRight size={24} color={colors.accent.blue} />
          </View>

          {/* Suggested Exercise */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.accent.green, marginBottom: spacing.xs }}>
              Suggested
            </Text>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: colors.accent.green,
              }}
            >
              {suggestion.suggestedExercise}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onKeepOriginal();
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
            <X size={18} color={colors.text.secondary} />
            <Text style={{ fontSize: fontSize.sm, color: colors.text.primary, marginLeft: spacing.xs }}>
              Keep Original
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAccept();
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: spacing.sm,
              backgroundColor: colors.accent.green,
              borderRadius: borderRadius.md,
            }}
          >
              <Animated.View entering={ZoomIn.springify()}>
                <Check size={18} color={colors.text.onAccent} />
              </Animated.View>
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: colors.text.onAccent,
                  marginLeft: spacing.xs,
                  fontWeight: fontWeight.semibold,
                }}
              >
                Accept
              </Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Animated.View>
  );
}
