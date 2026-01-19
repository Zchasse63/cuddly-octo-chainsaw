import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Timer, X, RotateCcw } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme/tokens';

interface RestTimerProps {
  visible: boolean;
  seconds: number;
  initialDuration: number;
  onReset: () => void;
  onClose: () => void;
  onChangeDuration: (duration: number) => void;
}

export function RestTimer({ visible, seconds, initialDuration, onReset, onClose, onChangeDuration }: RestTimerProps) {
  const { colors } = useTheme();
  const [soundObject, setSoundObject] = React.useState<Audio.Sound | null>(null);

  const durations = [30, 60, 90, 120];
  const progress = seconds / initialDuration;
  const circumference = 2 * Math.PI * 50;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    // Audio cues at 10s, 5s, 0s
    if (seconds === 10 || seconds === 5) {
      playBeep();
    } else if (seconds === 0) {
      playBeep();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [seconds]);

  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/beep.wav'),
        { shouldPlay: true }
      );
      setSoundObject(sound);
      await sound.playAsync();
    } catch (error) {
      // Fallback to haptic if sound fails
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  useEffect(() => {
    return () => {
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, [soundObject]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        zIndex: 100,
        ...shadows.xl,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Timer size={20} color={colors.accent.blue} />
          <Text style={{ fontSize: fontSize.base, color: colors.text.secondary, marginLeft: spacing.xs }}>Rest Timer</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={onReset}>
            <RotateCcw size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Circular Progress Ring */}
      <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ width: 120, height: 120, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
          <Svg width={120} height={120} style={{ position: 'absolute' }}>
            {/* Background circle */}
            <Circle cx={60} cy={60} r={50} stroke={colors.background.tertiary} strokeWidth={8} fill="none" />
            {/* Progress circle */}
            <Circle
              cx={60}
              cy={60}
              r={50}
              stroke={seconds <= 10 ? colors.semantic.error : colors.accent.blue}
              strokeWidth={8}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 60 60)`}
            />
          </Svg>
          <Text
            style={{
              fontSize: fontSize['4xl'],
              fontWeight: fontWeight.bold,
              color: seconds <= 10 ? colors.semantic.error : colors.text.primary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatTime(seconds)}
          </Text>
        </View>
      </View>

      {/* Duration Picker Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.sm }}>
        {durations.map((duration) => (
          <TouchableOpacity
            key={duration}
            onPress={() => onChangeDuration(duration)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: initialDuration === duration ? colors.accent.blue : colors.background.tertiary,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                color: initialDuration === duration ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {duration}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {seconds <= 10 && seconds > 0 && (
        <Text style={{ fontSize: fontSize.sm, color: colors.semantic.warning, textAlign: 'center', marginTop: spacing.sm }}>
          Almost done!
        </Text>
      )}
      {seconds === 0 && (
        <Text style={{ fontSize: fontSize.base, color: colors.accent.green, textAlign: 'center', marginTop: spacing.sm, fontWeight: fontWeight.semibold }}>
          Rest complete!
        </Text>
      )}
    </Animated.View>
  );
}
