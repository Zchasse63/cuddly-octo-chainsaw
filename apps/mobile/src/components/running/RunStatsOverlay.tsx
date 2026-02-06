import { View, Text } from 'react-native';
import { Clock, Zap, Ruler, Heart } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius, shadows } from '../../theme/tokens';

interface RunStatsOverlayProps {
  elapsedTime: string;
  currentPace: string;
  distance: string;
  distanceUnit: 'km' | 'mi';
  splitTime?: string;
  heartRate?: number;
}

export function RunStatsOverlay({
  elapsedTime,
  currentPace,
  distance,
  distanceUnit,
  splitTime,
  heartRate,
}: RunStatsOverlayProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        right: spacing.md,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        ...shadows.lg,
      }}
    >
      <BlurView
        intensity={80}
        tint="dark"
        style={{
          padding: spacing.md,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Main elapsed time */}
        <Text
          style={{
            fontSize: 48,
            fontWeight: fontWeight.bold,
            color: '#FFFFFF',
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
            marginBottom: spacing.sm,
          }}
        >
          {elapsedTime}
        </Text>

        {/* Secondary stats */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {/* Current Pace */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs / 2 }}>
              <Zap size={14} color="#4ECDC4" />
              <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7, marginLeft: spacing.xs / 2 }}>
                PACE
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFFFFF' }}>
              {currentPace}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7 }}>/{distanceUnit}</Text>
          </View>

          {/* Distance */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs / 2 }}>
              <Ruler size={14} color="#4ECDC4" />
              <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7, marginLeft: spacing.xs / 2 }}>
                DISTANCE
              </Text>
            </View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFFFFF' }}>
              {distance}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7 }}>{distanceUnit}</Text>
          </View>

          {/* Split Time or Heart Rate */}
          {splitTime ? (
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs / 2 }}>
                <Clock size={14} color="#4ECDC4" />
                <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7, marginLeft: spacing.xs / 2 }}>
                  SPLIT
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFFFFF' }}>
                {splitTime}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7 }}>current</Text>
            </View>
          ) : heartRate ? (
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs / 2 }}>
                <Heart size={14} color="#FF6B6B" />
                <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7, marginLeft: spacing.xs / 2 }}>
                  HR
                </Text>
              </View>
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFFFFF' }}>
                {heartRate}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: '#FFFFFF', opacity: 0.7 }}>bpm</Text>
            </View>
          ) : null}
        </View>
      </BlurView>
    </View>
  );
}
