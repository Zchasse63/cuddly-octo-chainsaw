import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { heights, borderRadius, fontSize, fontWeight, springs } from '../../theme/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress: () => void;
  children: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onPress,
  children,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springs.default);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springs.default);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getBackgroundColor = (): string => {
    if (disabled) return colors.background.tertiary;

    switch (variant) {
      case 'primary':
        return colors.accent.blue;
      case 'secondary':
        return colors.background.secondary;
      case 'ghost':
      case 'outline':
        return 'transparent';
      default:
        return colors.accent.blue;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.text.disabled;

    switch (variant) {
      case 'primary':
        return colors.text.onAccent;
      case 'secondary':
        return colors.text.primary;
      case 'ghost':
      case 'outline':
        return colors.accent.blue;
      default:
        return colors.text.onAccent;
    }
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') {
      return disabled ? colors.border.light : colors.accent.blue;
    }
    return 'transparent';
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outline' ? 1 : 0,
    height: heights.button[size],
    borderRadius: borderRadius.md,
    paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    opacity: disabled ? 0.5 : 1,
    ...(fullWidth && { width: '100%' }),
  };

  const textStyle: TextStyle = {
    color: getTextColor(),
    fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.md : fontSize.base,
    fontWeight: fontWeight.semibold,
  };

  return (
    <AnimatedTouchable
      style={[buttonStyle, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>{children}</Text>
          {rightIcon}
        </>
      )}
    </AnimatedTouchable>
  );
}
