import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/tokens';

interface VoiceLoggingButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function VoiceLoggingButton({ isRecording, onPress, disabled = false }: VoiceLoggingButtonProps) {
  const { colors } = useTheme();
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(withSpring(1.1, { damping: 10, stiffness: 100 }), withSpring(1, { damping: 10, stiffness: 100 })),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(withSpring(0.6, { damping: 10, stiffness: 100 }), withSpring(0.3, { damping: 10, stiffness: 100 })),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
      glowOpacity.value = withSpring(0.3);
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 90,
        right: spacing.md,
        zIndex: 50,
        alignItems: 'center',
      }}
    >
      <Animated.View style={pulseStyle}>
        {/* Glow effect */}
        <Animated.View
          style={[
            glowStyle,
            {
              position: 'absolute',
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isRecording ? colors.semantic.error : colors.accent.blue,
              top: -8,
              left: -8,
            },
          ]}
        />
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isRecording ? colors.semantic.error : colors.accent.blue,
            justifyContent: 'center',
            alignItems: 'center',
            ...shadows.xl,
          }}
        >
          {isRecording ? (
            <MicOff size={28} color={colors.text.inverse} />
          ) : (
            <Mic size={28} color={colors.text.onAccent} />
          )}
        </TouchableOpacity>
      </Animated.View>
      {isRecording && (
        <Text
          style={{
            marginTop: spacing.xs,
            fontSize: fontSize.xs,
            color: colors.text.tertiary,
            backgroundColor: colors.background.primary + 'CC',
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs / 2,
            borderRadius: borderRadius.sm,
          }}
        >
          Listening...
        </Text>
      )}
    </View>
  );
}
