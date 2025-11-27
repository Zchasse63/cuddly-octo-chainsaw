import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing, shadows } from '../../theme/tokens';

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({
  variant = 'default',
  padding = 'md',
  onPress,
  children,
  style,
}: CardProps) {
  const { colors } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'md':
        return spacing.md;
      case 'lg':
        return spacing.lg;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor:
      variant === 'outlined' ? 'transparent' : colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: getPadding(),
    ...(variant === 'elevated' && shadows.md),
    ...(variant === 'outlined' && {
      borderWidth: 1,
      borderColor: colors.border.light,
    }),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
