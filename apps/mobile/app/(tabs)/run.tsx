import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, MapPin, Clock, Ruler } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';

type RunStatus = 'idle' | 'running' | 'paused';

interface RunStats {
  distance: number; // meters
  duration: number; // seconds
  pace: number; // min/km
  calories: number;
}

export default function RunScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [status, setStatus] = useState<RunStatus>('idle');
  const [stats, setStats] = useState<RunStats>({
    distance: 0,
    duration: 0,
    pace: 0,
    calories: 0,
  });
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPosition = useRef<{ lat: number; lon: number } | null>(null);

  // Request location permission
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  // Haversine formula for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startRun = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setLocationPermission(true);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStatus('running');

    // Start timer
    intervalRef.current = setInterval(() => {
      setStats((prev) => {
        const newDuration = prev.duration + 1;
        const pace = prev.distance > 0 ? (newDuration / 60) / (prev.distance / 1000) : 0;
        const calories = Math.round((prev.distance / 1000) * 60); // Rough estimate

        return {
          ...prev,
          duration: newDuration,
          pace: Math.round(pace * 100) / 100,
          calories,
        };
      });
    }, 1000);

    // Start location tracking
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      },
      (location) => {
        const { latitude, longitude } = location.coords;

        if (lastPosition.current) {
          const dist = calculateDistance(
            lastPosition.current.lat,
            lastPosition.current.lon,
            latitude,
            longitude
          );

          setStats((prev) => ({
            ...prev,
            distance: prev.distance + dist,
          }));
        }

        lastPosition.current = { lat: latitude, lon: longitude };
      }
    );
  };

  const pauseRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('paused');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const resumeRun = () => {
    startRun();
  };

  const stopRun = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStatus('idle');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // Reset stats
    setStats({ distance: 0, duration: 0, pace: 0, calories: 0 });
    lastPosition.current = null;
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatPace = (pace: number): string => {
    if (pace === 0 || !isFinite(pace)) return '--:--';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              textAlign: 'center',
            }}
          >
            Sign in to track your runs
          </Text>
          <View style={{ height: spacing.md }} />
          <Button onPress={() => router.push('/(auth)/login')}>Sign In</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}>
        {/* Header */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text
            style={{
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
            }}
          >
            Run
          </Text>
        </View>

        {/* Main Stats */}
        <Card
          variant="elevated"
          style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}
        >
          <Text
            style={{
              fontSize: 64,
              fontWeight: fontWeight.bold,
              color: colors.text.primary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatDuration(stats.duration)}
          </Text>
          <Text
            style={{
              fontSize: fontSize.lg,
              color: colors.text.secondary,
              marginTop: spacing.xs,
            }}
          >
            Duration
          </Text>
        </Card>

        {/* Secondary Stats */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.xl,
          }}
        >
          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <Ruler size={24} color={colors.accent.blue} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {formatDistance(stats.distance)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Distance
              </Text>
            </View>
          </Card>

          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <Clock size={24} color={colors.accent.green} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {formatPace(stats.pace)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Pace
              </Text>
            </View>
          </Card>

          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <MapPin size={24} color={colors.accent.orange} />
              <Text
                style={{
                  fontSize: fontSize.xl,
                  fontWeight: fontWeight.bold,
                  color: colors.text.primary,
                  marginTop: spacing.xs,
                }}
              >
                {stats.calories}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                Calories
              </Text>
            </View>
          </Card>
        </View>

        {/* Controls */}
        <View style={{ flex: 1, justifyContent: 'flex-end', gap: spacing.md }}>
          {status === 'idle' && (
            <Button onPress={startRun} fullWidth>
              Start Run
            </Button>
          )}

          {status === 'running' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" onPress={pauseRun} fullWidth>
                  Pause
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" onPress={stopRun} fullWidth>
                  Stop
                </Button>
              </View>
            </View>
          )}

          {status === 'paused' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button onPress={resumeRun} fullWidth>
                  Resume
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" onPress={stopRun} fullWidth>
                  Finish
                </Button>
              </View>
            </View>
          )}
        </View>

        {/* Permission warning */}
        {locationPermission === false && (
          <Card style={{ marginTop: spacing.md, backgroundColor: colors.tint.warning }}>
            <Text style={{ color: colors.text.primary, fontSize: fontSize.sm }}>
              Location permission is required to track your runs. Please enable it in settings.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
