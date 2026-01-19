import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Trophy } from 'lucide-react-native';
import Animated, { SlideInUp, FadeOut } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface PRCelebrationProps {
  visible: boolean;
  exerciseName: string;
  weight: number;
  reps: number;
  weightUnit: 'kg' | 'lb';
  onDismiss: () => void;
}

export function PRCelebration({ visible, exerciseName, weight, reps, weightUnit, onDismiss }: PRCelebrationProps) {
  const { colors } = useTheme();
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confettiRef.current?.start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: 200, y: -10 }}
          autoStart={false}
          fadeOut
        />

        <Animated.View
          entering={SlideInUp.springify()}
          exiting={FadeOut}
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            alignItems: 'center',
            maxWidth: '80%',
            minWidth: 280,
          }}
        >
          {/* Trophy Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FFE66D20',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Trophy size={48} color="#FFE66D" />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: '#FFE66D',
              marginBottom: spacing.sm,
              textAlign: 'center',
            }}
          >
            New PR!
          </Text>

          {/* Exercise Details */}
          <Text
            style={{
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.xs,
              textAlign: 'center',
            }}
          >
            {exerciseName}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                color: colors.text.secondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {weight}{weightUnit} × {reps} reps
            </Text>
          </View>

          {/* Message */}
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.tertiary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            You just set a personal record!{'\n'}Keep crushing it! 💪
          </Text>

          {/* Tap anywhere hint */}
          <Text
            style={{
              fontSize: fontSize.xs,
              color: colors.text.disabled,
              marginTop: spacing.md,
              textAlign: 'center',
            }}
          >
            Tap anywhere to continue
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
