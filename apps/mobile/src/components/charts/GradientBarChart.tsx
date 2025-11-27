import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface DataPoint {
  label: string;
  value: number;
  date?: Date;
}

interface GradientBarChartProps {
  data: DataPoint[];
  height?: number;
  barWidth?: number;
  showLabels?: boolean;
  showValues?: boolean;
  goalValue?: number;
  gradientColors?: [string, string];
  onBarPress?: (index: number, value: number) => void;
  animate?: boolean;
  staggerDelay?: number;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GradientBarChart({
  data,
  height = 160,
  barWidth = 32,
  showLabels = true,
  showValues = false,
  goalValue,
  gradientColors,
  onBarPress,
  animate = true,
  staggerDelay = 50,
  accessibilityLabel,
}: GradientBarChartProps) {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => d.value), goalValue || 0);

  // Default gradient colors based on theme
  const defaultGradient: [string, string] = [colors.accent.blue, colors.accent.teal];
  const gradient = gradientColors || defaultGradient;

  return (
    <View
      style={[styles.container, { height: height + (showLabels ? 24 : 0) + (showValues ? 20 : 0) }]}
      accessibilityLabel={accessibilityLabel || `Bar chart with ${data.length} data points`}
      accessibilityRole="image"
    >
      {/* Goal line */}
      {goalValue && goalValue > 0 && (
        <View
          style={[
            styles.goalLine,
            {
              bottom: showLabels ? 24 : 0,
              height: (goalValue / maxValue) * height,
            },
          ]}
        >
          <View
            style={[
              styles.goalLineDash,
              { borderColor: colors.text.tertiary },
            ]}
          />
          <Text
            style={[
              styles.goalLabel,
              { color: colors.text.tertiary, backgroundColor: colors.background.primary },
            ]}
          >
            Goal
          </Text>
        </View>
      )}

      {/* Bars */}
      <View style={styles.barsContainer}>
        {data.map((item, index) => (
          <AnimatedBar
            key={`${item.label}-${index}`}
            item={item}
            index={index}
            maxValue={maxValue}
            height={height}
            barWidth={barWidth}
            gradient={gradient}
            showLabels={showLabels}
            showValues={showValues}
            onPress={onBarPress}
            animate={animate}
            staggerDelay={staggerDelay}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

interface AnimatedBarProps {
  item: DataPoint;
  index: number;
  maxValue: number;
  height: number;
  barWidth: number;
  gradient: [string, string];
  showLabels: boolean;
  showValues: boolean;
  onPress?: (index: number, value: number) => void;
  animate: boolean;
  staggerDelay: number;
  colors: any;
}

function AnimatedBar({
  item,
  index,
  maxValue,
  height,
  barWidth,
  gradient,
  showLabels,
  showValues,
  onPress,
  animate,
  staggerDelay,
  colors,
}: AnimatedBarProps) {
  const progress = useSharedValue(animate ? 0 : 1);
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);

  const barHeight = maxValue > 0 ? (item.value / maxValue) * height : 0;

  useEffect(() => {
    if (animate) {
      progress.value = withDelay(
        index * staggerDelay,
        withSpring(1, { damping: 12, stiffness: 100 })
      );
    }
  }, [animate, index, staggerDelay]);

  const barStyle = useAnimatedStyle(() => {
    const animatedHeight = interpolate(
      progress.value,
      [0, 1],
      [0, barHeight],
      Extrapolation.CLAMP
    );

    return {
      height: animatedHeight,
      transform: [{ scaleX: scale.value }],
    };
  });

  const valueStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [10, 0]),
      },
    ],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    isPressed.value = true;
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    isPressed.value = false;
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.(index, item.value);
  };

  return (
    <View style={styles.barWrapper}>
      {/* Value label (above bar) */}
      {showValues && (
        <Animated.Text
          style={[
            styles.valueLabel,
            { color: colors.text.secondary },
            valueStyle,
          ]}
        >
          {item.value}
        </Animated.Text>
      )}

      {/* Bar */}
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.barTouchArea, { height, width: barWidth + 16 }]}
        accessibilityLabel={`${item.label}: ${item.value}`}
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.bar,
            { width: barWidth },
            barStyle,
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={[styles.gradient, { borderRadius: borderRadius.sm }]}
          />
        </Animated.View>
      </AnimatedPressable>

      {/* Label */}
      {showLabels && (
        <Text
          style={[styles.label, { color: colors.text.tertiary }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      )}
    </View>
  );
}

// Progress Ring Chart Component
interface ProgressRingProps {
  value: number; // 0-1
  size?: number;
  strokeWidth?: number;
  gradientColors?: [string, string];
  backgroundColor?: string;
  animate?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 12,
  gradientColors,
  backgroundColor,
  animate = true,
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(animate ? 0 : value);

  const defaultGradient: [string, string] = [colors.accent.blue, colors.semantic.success];
  const gradient = gradientColors || defaultGradient;
  const bgColor = backgroundColor || colors.background.tertiary;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    if (animate) {
      progress.value = withSpring(value, { damping: 15, stiffness: 80 });
    } else {
      progress.value = value;
    }
  }, [value, animate]);

  const progressStyle = useAnimatedStyle(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* Background circle */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: bgColor,
        }}
      />

      {/* Progress arc - simplified without SVG */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: gradient[0],
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          transform: [{ rotate: `${-90 + (value * 360)}deg` }],
        }}
      />

      {/* Center content */}
      {children && (
        <View style={{ position: 'absolute' }}>
          {children}
        </View>
      )}
    </View>
  );
}

// Stat Card with animated number
interface AnimatedStatProps {
  value: number;
  label: string;
  unit?: string;
  trend?: number; // positive or negative percentage
  animate?: boolean;
}

export function AnimatedStat({
  value,
  label,
  unit,
  trend,
  animate = true,
}: AnimatedStatProps) {
  const { colors } = useTheme();
  const displayValue = useSharedValue(animate ? 0 : value);

  useEffect(() => {
    if (animate) {
      displayValue.value = withTiming(value, { duration: 1000 });
    } else {
      displayValue.value = value;
    }
  }, [value, animate]);

  const animatedText = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  return (
    <View style={styles.statContainer}>
      <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>
        {label}
      </Text>
      <View style={styles.statValueRow}>
        <Animated.Text style={[styles.statValue, { color: colors.text.primary }, animatedText]}>
          {Math.round(value).toLocaleString()}
        </Animated.Text>
        {unit && (
          <Text style={[styles.statUnit, { color: colors.text.tertiary }]}>
            {unit}
          </Text>
        )}
      </View>
      {trend !== undefined && (
        <Text
          style={[
            styles.statTrend,
            { color: trend >= 0 ? colors.semantic.success : colors.semantic.error },
          ]}
        >
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barTouchArea: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  valueLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  goalLineDash: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  goalLabel: {
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.xs,
  },
  statContainer: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  statUnit: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  statTrend: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
});
