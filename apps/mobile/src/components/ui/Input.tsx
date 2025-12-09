import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { heights, borderRadius, fontSize, fontWeight, spacing } from '../../theme/tokens';

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disabled?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  autoFocus?: boolean;
}

export function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  leftIcon,
  rightIcon,
  disabled = false,
  autoCapitalize,
  autoCorrect,
  autoFocus = false,
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const isSecure = isPassword && !showPassword;

  const getBorderColor = (): string => {
    if (error) return colors.semantic.error;
    if (isFocused) return colors.accent.blue;
    return colors.border.light;
  };

  const containerStyle: ViewStyle = {
    marginBottom: spacing.md,
  };

  const labelStyle: TextStyle = {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  };

  const inputContainerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    height: heights.input,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: getBorderColor(),
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    opacity: disabled ? 0.5 : 1,
  };

  const inputStyle: TextStyle = {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
  };

  const helperStyle: TextStyle = {
    color: error ? colors.semantic.error : colors.text.tertiary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  };

  return (
    <View style={containerStyle}>
      {label && <Text style={labelStyle}>{label}</Text>}

      <View style={inputContainerStyle}>
        {leftIcon}

        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          editable={!disabled}
          secureTextEntry={isSecure}
          keyboardType={type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default'}
          autoCapitalize={autoCapitalize ?? (type === 'email' ? 'none' : 'sentences')}
          autoCorrect={autoCorrect ?? type !== 'email'}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={20} color={colors.icon.secondary} />
            ) : (
              <Eye size={20} color={colors.icon.secondary} />
            )}
          </TouchableOpacity>
        )}

        {rightIcon}
      </View>

      {(error || helperText) && (
        <Text style={helperStyle}>{error || helperText}</Text>
      )}
    </View>
  );
}
