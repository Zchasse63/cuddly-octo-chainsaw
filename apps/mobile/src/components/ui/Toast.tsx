import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing, fontSize, fontWeight, shadows, springs } from '../../theme/tokens';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}: ToastProps) {
  const { colors } = useTheme();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, springs.snappy);

      // Auto hide
      if (duration > 0 && onHide) {
        const timer = setTimeout(() => {
          translateY.value = withSpring(-100, springs.default, () => {
            runOnJS(onHide)();
          });
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      translateY.value = withSpring(-100, springs.default);
    }
  }, [visible, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.tint.success;
      case 'error':
        return colors.tint.danger;
      case 'warning':
        return colors.tint.warning;
      default:
        return colors.tint.info;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return colors.semantic.success;
      case 'error':
        return colors.semantic.error;
      case 'warning':
        return colors.semantic.warning;
      default:
        return colors.semantic.info;
    }
  };

  const Icon = () => {
    const iconProps = { size: 20, color: getIconColor() };
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      default:
        return <Info {...iconProps} />;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 60,
          left: spacing.md,
          right: spacing.md,
          backgroundColor: getBackgroundColor(),
          borderRadius: borderRadius.md,
          padding: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          zIndex: 9999,
          ...shadows.lg,
        },
        animatedStyle,
      ]}
    >
      <Icon />
      <Text
        style={{
          flex: 1,
          color: colors.text.primary,
          fontSize: fontSize.base,
          fontWeight: fontWeight.medium,
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}
