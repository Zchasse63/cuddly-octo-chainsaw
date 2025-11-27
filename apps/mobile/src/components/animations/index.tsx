import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Extrapolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

// Spring configurations
export const SPRING_CONFIG = {
  default: { damping: 15, stiffness: 150 },
  bouncy: { damping: 10, stiffness: 200 },
  gentle: { damping: 20, stiffness: 100 },
  snappy: { damping: 12, stiffness: 250 },
};

// Fade In Animation
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

export function FadeIn({ children, delay = 0, duration = 300, style }: FadeInProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Slide Up Animation
interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideUp({ children, delay = 0, duration = 400, distance = 20, style }: SlideUpProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG.default));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Scale In Animation
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function ScaleIn({ children, delay = 0, style }: ScaleInProps) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, SPRING_CONFIG.bouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Pulse Animation (for loading states)
interface PulseProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Pulse({ children, style }: PulseProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// PR Celebration Animation
interface CelebrationProps {
  visible: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PRCelebration({ visible, onComplete, children, style }: CelebrationProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Burst scale and rotate
      scale.value = withSequence(
        withSpring(1.3, SPRING_CONFIG.bouncy),
        withSpring(1, SPRING_CONFIG.default)
      );
      rotate.value = withSequence(
        withSpring(-5, { damping: 5 }),
        withSpring(5, { damping: 5 }),
        withSpring(0, SPRING_CONFIG.default, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        })
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Badge Unlock Animation
interface BadgeUnlockProps {
  visible: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BadgeUnlock({ visible, onComplete, children, style }: BadgeUnlockProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withSpring(1.5, SPRING_CONFIG.bouncy),
        withSpring(1, SPRING_CONFIG.default, () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        })
      );
      glow.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 500 })
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    shadowOpacity: interpolate(glow.value, [0, 1], [0, 0.8]),
    shadowRadius: interpolate(glow.value, [0, 1], [0, 20]),
    shadowColor: '#FFD700',
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Shake Animation (for errors)
interface ShakeProps {
  shake: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Shake({ shake, children, style }: ShakeProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (shake) {
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

// Staggered List Animation
interface StaggeredListProps {
  children: React.ReactNode[];
  stagger?: number;
  style?: ViewStyle;
}

export function StaggeredList({ children, stagger = 50, style }: StaggeredListProps) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <SlideUp key={index} delay={index * stagger}>
          {child}
        </SlideUp>
      ))}
    </View>
  );
}

// Progress Bar Animation
interface AnimatedProgressProps {
  progress: number; // 0-100
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function AnimatedProgress({
  progress,
  height = 8,
  color = '#007AFF',
  backgroundColor = '#E5E5EA',
  style,
}: AnimatedProgressProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(progress, SPRING_CONFIG.gentle);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            backgroundColor: color,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

// Counter Animation
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: any;
}

export function AnimatedCounter({ value, duration = 1000, style }: AnimatedCounterProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedStyle(() => ({
    // Note: For text animation, you'd use react-native-reanimated's
    // useAnimatedProps with Text component
  }));

  return null; // Placeholder - implement with Text animation
}
