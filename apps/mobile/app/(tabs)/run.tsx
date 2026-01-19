import { View, Text, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  MapPin,
  Clock,
  Ruler,
  Heart,
  Zap,
  Footprints,
  History,
  ChevronDown,
  Check,
  TrendingUp,
  Activity,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  FadeIn,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeContext';
import { Button, Card, Toast } from '../../src/components/ui';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/lib/trpc';
import { useDistanceUnit, formatDistance, formatPace } from '../../src/stores/profile';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/tokens';
import { ActiveRunMap } from '../../src/components/running/ActiveRunMap';
import { RunStatsOverlay } from '../../src/components/running/RunStatsOverlay';
import { PreRunSetup } from '../../src/components/running/PreRunSetup';
import { BadgeCelebration } from '../../src/components/badges/BadgeCelebration';

type RunStatus = 'idle' | 'running' | 'paused';
type RunType = 'easy' | 'tempo' | 'interval' | 'long_run' | 'recovery' | 'fartlek' | 'hill' | 'race';

interface RunStats {
  distance: number; // meters
  duration: number; // seconds
  currentPace: number; // seconds per km
  avgPace: number; // seconds per km
  calories: number;
  heartRate?: number;
  cadence?: number;
  splits: Split[];
}

interface Split {
  distance: number; // 1km or 1mi
  time: number; // seconds for this split
  pace: number; // seconds per km/mi
  avgHeartRate?: number;
}

const RUN_TYPES: { id: RunType; label: string; description: string; color: string }[] = [
  { id: 'easy', label: 'Easy Run', description: 'Comfortable conversational pace', color: '#4ECDC4' },
  { id: 'tempo', label: 'Tempo Run', description: 'Comfortably hard sustained effort', color: '#FFE66D' },
  { id: 'interval', label: 'Intervals', description: 'High intensity with rest periods', color: '#FF6B6B' },
  { id: 'long_run', label: 'Long Run', description: 'Extended distance at easy pace', color: '#95E1D3' },
  { id: 'recovery', label: 'Recovery', description: 'Very easy post-workout jog', color: '#A8E6CF' },
  { id: 'fartlek', label: 'Fartlek', description: 'Varied speed play', color: '#DDA0DD' },
  { id: 'hill', label: 'Hill Training', description: 'Hill repeats or hilly route', color: '#F4A460' },
  { id: 'race', label: 'Race', description: 'Competition or time trial', color: '#FFD700' },
];

export default function RunScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const distanceUnit = useDistanceUnit();

  const [status, setStatus] = useState<RunStatus>('idle');
  const [runType, setRunType] = useState<RunType>('easy');
  const [showRunTypePicker, setShowRunTypePicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPreRunSetup, setShowPreRunSetup] = useState(false);
  const [selectedShoeId, setSelectedShoeId] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Array<{latitude: number; longitude: number}>>([]);
  const [stats, setStats] = useState<RunStats>({
    distance: 0,
    duration: 0,
    currentPace: 0,
    avgPace: 0,
    calories: 0,
    splits: [],
  });
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showBadgeCelebration, setShowBadgeCelebration] = useState(false);
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState<any>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastPosition = useRef<{ lat: number; lon: number; timestamp: number } | null>(null);
  const splitDistance = useRef(0);
  const splitStartTime = useRef(0);
  const startTimeRef = useRef<Date | null>(null);

  // Pulse animation for active run
  const pulseScale = useSharedValue(1);

  // Fetch user's shoes
  const { data: shoes } = api.shoes.getAll.useQuery(undefined, { enabled: !!user });

  // Badge check mutation
  const checkBadgesMutation = api.gamification.checkBadgesAfterRun.useMutation();

  // Save run mutation
  const saveRunMutation = api.running.logActivity.useMutation({
    onSuccess: async (data) => {
      setToast({ visible: true, message: 'Run saved!', type: 'success' });

      // Check for new badges
      try {
        const badgeResult = await checkBadgesMutation.mutateAsync({ activityId: data.activity.id });
        if (badgeResult?.newBadges && badgeResult.newBadges.length > 0) {
          const firstBadge = badgeResult.newBadges[0];
          if (firstBadge?.definition) {
            setNewlyEarnedBadge(firstBadge.definition);
            setShowBadgeCelebration(true);
          }
        }
      } catch (e) {
        // Badge check failed silently - don't block run completion
      }

      router.push(`/run/${data.activity.id}`);
    },
    onError: (error) => {
      setToast({ visible: true, message: error.message, type: 'error' });
    },
  });

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

  // Set default shoe
  useEffect(() => {
    if (shoes && !selectedShoeId) {
      const defaultShoe = shoes.find((s: any) => s.isDefault);
      if (defaultShoe) setSelectedShoeId(defaultShoe.id);
    }
  }, [shoes]);

  // Haversine formula for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
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
    startTimeRef.current = new Date();
    splitStartTime.current = 0;
    splitDistance.current = 0;

    // Start pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 10 }),
        withSpring(1, { damping: 10 })
      ),
      -1,
      true
    );

    // Start timer
    intervalRef.current = setInterval(() => {
      setStats((prev) => {
        const newDuration = prev.duration + 1;
        const avgPace = prev.distance > 0 ? (newDuration / (prev.distance / 1000)) : 0;
        const calories = Math.round((prev.distance / 1000) * 60);

        return {
          ...prev,
          duration: newDuration,
          avgPace: Math.round(avgPace),
          calories,
        };
      });
    }, 1000);

    // Start location tracking
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const timestamp = location.timestamp;

        // Track coordinates for map
        setCoordinates(prev => [...prev, { latitude, longitude }]);

        if (lastPosition.current) {
          const dist = calculateDistance(
            lastPosition.current.lat,
            lastPosition.current.lon,
            latitude,
            longitude
          );

          // Calculate current pace
          const timeDiff = (timestamp - lastPosition.current.timestamp) / 1000;
          const currentPace = dist > 0 ? (timeDiff / (dist / 1000)) : 0;

          setStats((prev) => {
            const newDistance = prev.distance + dist;
            splitDistance.current += dist;

            // Check for split (1km or 1mi)
            const splitThreshold = distanceUnit === 'mi' ? 1609.34 : 1000;
            const newSplits = [...prev.splits];

            if (splitDistance.current >= splitThreshold) {
              const splitTime = prev.duration - splitStartTime.current;
              newSplits.push({
                distance: splitThreshold,
                time: splitTime,
                pace: splitTime / (splitThreshold / 1000),
              });
              splitDistance.current = splitDistance.current - splitThreshold;
              splitStartTime.current = prev.duration;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            return {
              ...prev,
              distance: newDistance,
              currentPace: Math.round(currentPace),
              splits: newSplits,
            };
          });
        }

        lastPosition.current = { lat: latitude, lon: longitude, timestamp };
      }
    );
  };

  const pauseRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('paused');
    pulseScale.value = withSpring(1);

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
    pauseRun();

    if (stats.distance > 100) {
      setShowSaveModal(true);
    } else {
      resetRun();
    }
  };

  const resetRun = () => {
    setStatus('idle');
    setStats({ distance: 0, duration: 0, currentPace: 0, avgPace: 0, calories: 0, splits: [] });
    lastPosition.current = null;
    splitDistance.current = 0;
    splitStartTime.current = 0;
    startTimeRef.current = null;
    setShowSaveModal(false);
  };

  const saveRun = () => {
    if (!startTimeRef.current) return;

    saveRunMutation.mutate({
      runType,
      startedAt: startTimeRef.current,
      completedAt: new Date(),
      distanceMeters: stats.distance,
      durationSeconds: stats.duration,
      avgPaceSecondsPerKm: stats.avgPace,
      caloriesBurned: stats.calories,
      shoeId: selectedShoeId || undefined,
      splits: stats.splits.map((s, i) => ({
        splitNumber: i + 1,
        distanceMeters: s.distance,
        durationSeconds: s.time,
        paceSecondsPerKm: s.pace,
      })),
    });

    resetRun();
  };

  const discardRun = () => {
    Alert.alert(
      'Discard Run',
      'Are you sure you want to discard this run?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: resetRun },
      ]
    );
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

  const formatPaceDisplay = (secondsPerKm: number): string => {
    if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
    let pace = secondsPerKm;
    if (distanceUnit === 'mi') {
      pace = secondsPerKm * 1.60934;
    }
    const minutes = Math.floor(pace / 60);
    const seconds = Math.round(pace % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const currentRunType = RUN_TYPES.find((t) => t.id === runType)!;

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, textAlign: 'center' }}>
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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
            Run
          </Text>
          <TouchableOpacity onPress={() => router.push('/run-history')}>
            <History size={24} color={colors.icon.secondary} />
          </TouchableOpacity>
        </View>

        {/* Run Type Selector (only when idle) */}
        {status === 'idle' && (
          <TouchableOpacity
            onPress={() => setShowRunTypePicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              backgroundColor: currentRunType.color + '20',
              borderRadius: borderRadius.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Footprints size={24} color={currentRunType.color} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                {currentRunType.label}
              </Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                {currentRunType.description}
              </Text>
            </View>
            <ChevronDown size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}

        {/* Active Run Type Badge */}
        {status !== 'idle' && (
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: currentRunType.color + '20',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              marginBottom: spacing.md,
            }}
          >
            <Text style={{ fontSize: fontSize.sm, color: currentRunType.color, fontWeight: fontWeight.medium }}>
              {currentRunType.label}
            </Text>
          </View>
        )}

        {/* Map View (when running) */}
        {status !== 'idle' && coordinates.length > 0 && (
          <View style={{ height: 300, marginBottom: spacing.lg, borderRadius: borderRadius.lg, overflow: 'hidden' }}>
            <ActiveRunMap
              coordinates={coordinates}
              currentLocation={coordinates[coordinates.length - 1] || null}
            />
            <RunStatsOverlay
              elapsedTime={formatDuration(stats.duration)}
              currentPace={formatPaceDisplay(stats.currentPace)}
              distance={formatDistance(stats.distance, distanceUnit)}
              distanceUnit={distanceUnit}
              splitTime={splitDistance.current > 0 ? formatDuration(stats.duration - splitStartTime.current) : undefined}
            />
          </View>
        )}

        {/* Main Stats */}
        <Animated.View style={status === 'running' ? pulseStyle : {}}>
          <Card
            variant="elevated"
            style={{ marginBottom: spacing.lg, alignItems: 'center', paddingVertical: spacing.xl }}
          >
            <Text
              style={{
                fontSize: 64,
                fontWeight: fontWeight.bold,
                color: status === 'running' ? currentRunType.color : colors.text.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatDuration(stats.duration)}
            </Text>
            <Text style={{ fontSize: fontSize.lg, color: colors.text.secondary, marginTop: spacing.xs }}>
              Duration
            </Text>
          </Card>
        </Animated.View>

        {/* Secondary Stats */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <Ruler size={24} color={colors.accent.blue} />
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                {formatDistance(stats.distance, distanceUnit)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Distance</Text>
            </View>
          </Card>

          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <Activity size={24} color={currentRunType.color} />
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                {formatPaceDisplay(stats.currentPace)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Current /{distanceUnit}</Text>
            </View>
          </Card>

          <Card style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>
              <TrendingUp size={24} color={colors.accent.green} />
              <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary, marginTop: spacing.xs }}>
                {formatPaceDisplay(stats.avgPace)}
              </Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Avg /{distanceUnit}</Text>
            </View>
          </Card>
        </View>

        {/* Splits Preview */}
        {stats.splits.length > 0 && (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>
              Splits
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {stats.splits.map((split, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: colors.background.tertiary,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm,
                  }}
                >
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                    {distanceUnit === 'mi' ? 'Mile' : 'KM'} {index + 1}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary }}>
                    {formatPaceDisplay(split.pace)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Controls */}
        <View style={{ flex: 1, justifyContent: 'flex-end', gap: spacing.md }}>
          {status === 'idle' && (
            <Button onPress={() => setShowPreRunSetup(true)} fullWidth>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Play size={20} color={colors.text.onAccent} />
                <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs, fontWeight: fontWeight.semibold }}>
                  Start Run
                </Text>
              </View>
            </Button>
          )}

          {status === 'running' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" onPress={pauseRun} fullWidth>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pause size={18} color={colors.text.primary} />
                    <Text style={{ marginLeft: spacing.xs }}>Pause</Text>
                  </View>
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" onPress={stopRun} fullWidth>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Square size={18} color={colors.text.primary} />
                    <Text style={{ marginLeft: spacing.xs }}>Stop</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {status === 'paused' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button onPress={resumeRun} fullWidth>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Play size={18} color={colors.text.onAccent} />
                    <Text style={{ color: colors.text.onAccent, marginLeft: spacing.xs }}>Resume</Text>
                  </View>
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" onPress={stopRun} fullWidth>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Check size={18} color={colors.text.primary} />
                    <Text style={{ marginLeft: spacing.xs }}>Finish</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}
        </View>

        {/* Permission warning */}
        {locationPermission === false && (
          <Card style={{ marginTop: spacing.md, backgroundColor: colors.semantic.warning + '20' }}>
            <Text style={{ color: colors.text.primary, fontSize: fontSize.sm }}>
              Location permission is required to track your runs. Please enable it in settings.
            </Text>
          </Card>
        )}
      </ScrollView>

      {/* Run Type Picker Modal */}
      <Modal visible={showRunTypePicker} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.background.primary,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              padding: spacing.md,
              maxHeight: '70%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
                Select Run Type
              </Text>
              <TouchableOpacity onPress={() => setShowRunTypePicker(false)}>
                <Text style={{ fontSize: fontSize.base, color: colors.accent.blue }}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {RUN_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => {
                    setRunType(type.id);
                    setShowRunTypePicker(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    backgroundColor: runType === type.id ? type.color + '20' : colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    marginBottom: spacing.sm,
                    borderWidth: 2,
                    borderColor: runType === type.id ? type.color : 'transparent',
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: type.color + '30',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: spacing.md,
                    }}
                  >
                    <Footprints size={20} color={type.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
                      {type.label}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                      {type.description}
                    </Text>
                  </View>
                  {runType === type.id && <Check size={20} color={type.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Run Modal */}
      <Modal visible={showSaveModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.background.primary,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              padding: spacing.lg,
            }}
          >
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text.primary, marginBottom: spacing.lg, textAlign: 'center' }}>
              Save Run?
            </Text>

            {/* Run Summary */}
            <Card style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                    {formatDistance(stats.distance, distanceUnit)}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Distance</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                    {formatDuration(stats.duration)}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Duration</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: fontSize['2xl'], fontWeight: fontWeight.bold, color: colors.text.primary }}>
                    {formatPaceDisplay(stats.avgPace)}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Avg Pace</Text>
                </View>
              </View>
            </Card>

            {/* Shoe Selector */}
            {shoes && shoes.length > 0 && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary, marginBottom: spacing.sm }}>
                  Shoe Used
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => setSelectedShoeId(null)}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.md,
                        backgroundColor: !selectedShoeId ? colors.accent.blue : colors.background.secondary,
                      }}
                    >
                      <Text style={{ color: !selectedShoeId ? colors.text.onAccent : colors.text.secondary }}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {shoes.map((shoe: any) => (
                      <TouchableOpacity
                        key={shoe.id}
                        onPress={() => setSelectedShoeId(shoe.id)}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.md,
                          backgroundColor: selectedShoeId === shoe.id ? colors.accent.blue : colors.background.secondary,
                        }}
                      >
                        <Text style={{ color: selectedShoeId === shoe.id ? colors.text.onAccent : colors.text.secondary }}>
                          {shoe.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Actions */}
            <View style={{ gap: spacing.sm }}>
              <Button onPress={saveRun} loading={saveRunMutation.isPending} fullWidth>
                Save Run
              </Button>
              <Button variant="ghost" onPress={discardRun} fullWidth>
                Discard
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pre-Run Setup Modal */}
      <PreRunSetup
        visible={showPreRunSetup}
        shoes={(shoes || []).map(s => ({
          id: s.id,
          name: s.nickname || s.brand || 'Shoe',
          brand: s.brand || undefined,
          isDefault: s.isDefault || undefined
        }))}
        onStartRun={(options: {shoeId: string | null; runType: RunType; targetDistance?: number; targetTime?: number}) => {
          setRunType(options.runType);
          if (options.shoeId) setSelectedShoeId(options.shoeId);
          setShowPreRunSetup(false);
          startRun();
        }}
        onDismiss={() => setShowPreRunSetup(false)}
      />

      {/* Badge Celebration Modal */}
      <BadgeCelebration
        visible={showBadgeCelebration}
        badge={newlyEarnedBadge}
        onDismiss={() => {
          setShowBadgeCelebration(false);
          setNewlyEarnedBadge(null);
        }}
      />
    </SafeAreaView>
  );
}
