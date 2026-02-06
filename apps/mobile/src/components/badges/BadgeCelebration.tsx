import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Award } from 'lucide-react-native';
import Animated, { SlideInUp, FadeOut } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, medalColors } from '../../theme/tokens';

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  badgeType: string;
  tier: string;
}

interface BadgeCelebrationProps {
  visible: boolean;
  badge: BadgeDefinition | null;
  onDismiss: () => void;
}

const tierColorMap: Record<string, string> = {
  bronze: medalColors.bronze,
  silver: medalColors.silver,
  gold: medalColors.gold,
  diamond: '#B9F2FF',
  platinum: medalColors.platinum,
};

export function BadgeCelebration({ visible, badge, onDismiss }: BadgeCelebrationProps) {
  const { colors } = useTheme();
  const confettiRef = useRef<ConfettiCannon>(null);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (visible && badge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confettiRef.current?.start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible, badge]);

  if (!visible || !badge) return null;

  const tierColor = tierColorMap[badge.tier] || medalColors.gold;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        activeOpacity={1}
        onPress={onDismiss}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: width / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={3000}
        />

        <Animated.View
          entering={SlideInUp.springify()}
          exiting={FadeOut}
          style={{
            backgroundColor: colors.background.primary,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            alignItems: 'center',
            maxWidth: '85%',
            minWidth: 300,
          }}
        >
          {/* Header */}
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.tertiary,
              marginBottom: spacing.sm,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            New Badge Unlocked!
          </Text>

          {/* Badge Icon */}
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: tierColor + '20',
              borderWidth: 4,
              borderColor: tierColor,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Award size={56} color={tierColor} />
          </View>

          {/* Badge Name */}
          <Text
            style={{
              fontSize: fontSize['2xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              textAlign: 'center',
              marginBottom: spacing.xs,
            }}
          >
            {badge.name}
          </Text>

          {/* Tier Chip */}
          <View
            style={{
              backgroundColor: tierColor + '20',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.bold,
                color: tierColor,
                textTransform: 'uppercase',
              }}
            >
              {badge.tier}
            </Text>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.secondary,
              textAlign: 'center',
              marginBottom: spacing.lg,
            }}
          >
            {badge.description}
          </Text>

          {/* Tap to dismiss hint */}
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.text.disabled,
            }}
          >
            Tap anywhere to dismiss
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
