import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  GripVertical,
  Clock,
  Footprints,
  Zap,
  ChevronDown,
  Save,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type SegmentType = 'warmup' | 'work' | 'recovery' | 'cooldown';

interface WorkoutSegment {
  id: string;
  type: SegmentType;
  duration?: number; // seconds
  distance?: number; // meters
  targetPace?: string; // "5:30" format
  repeat?: number;
}

interface WorkoutTemplate {
  name: string;
  description: string;
  segments: WorkoutSegment[];
  totalDuration: number;
  totalDistance: number;
}

const SEGMENT_TYPES: { type: SegmentType; label: string; color: string }[] = [
  { type: 'warmup', label: 'Warm-up', color: '#4ECDC4' },
  { type: 'work', label: 'Work', color: '#FF6B6B' },
  { type: 'recovery', label: 'Recovery', color: '#95E1D3' },
  { type: 'cooldown', label: 'Cool-down', color: '#4ECDC4' },
];

const PRESET_WORKOUTS: WorkoutTemplate[] = [
  {
    name: '5x800m Intervals',
    description: 'Classic speed workout',
    segments: [
      { id: '1', type: 'warmup', duration: 600, targetPace: 'easy' },
      { id: '2', type: 'work', distance: 800, targetPace: '3:30', repeat: 5 },
      { id: '3', type: 'recovery', duration: 120, targetPace: 'jog' },
      { id: '4', type: 'cooldown', duration: 600, targetPace: 'easy' },
    ],
    totalDuration: 2400,
    totalDistance: 6000,
  },
  {
    name: 'Tempo Run',
    description: '20 min at threshold pace',
    segments: [
      { id: '1', type: 'warmup', duration: 600, targetPace: 'easy' },
      { id: '2', type: 'work', duration: 1200, targetPace: 'tempo' },
      { id: '3', type: 'cooldown', duration: 600, targetPace: 'easy' },
    ],
    totalDuration: 2400,
    totalDistance: 8000,
  },
  {
    name: 'Fartlek',
    description: 'Speed play with varying intensities',
    segments: [
      { id: '1', type: 'warmup', duration: 600, targetPace: 'easy' },
      { id: '2', type: 'work', duration: 60, targetPace: 'fast', repeat: 8 },
      { id: '3', type: 'recovery', duration: 60, targetPace: 'easy' },
      { id: '4', type: 'cooldown', duration: 600, targetPace: 'easy' },
    ],
    totalDuration: 2160,
    totalDistance: 5000,
  },
  {
    name: 'Pyramid',
    description: '200-400-800-400-200',
    segments: [
      { id: '1', type: 'warmup', duration: 600, targetPace: 'easy' },
      { id: '2', type: 'work', distance: 200, targetPace: '0:45' },
      { id: '3', type: 'recovery', duration: 60 },
      { id: '4', type: 'work', distance: 400, targetPace: '1:35' },
      { id: '5', type: 'recovery', duration: 90 },
      { id: '6', type: 'work', distance: 800, targetPace: '3:20' },
      { id: '7', type: 'recovery', duration: 90 },
      { id: '8', type: 'work', distance: 400, targetPace: '1:35' },
      { id: '9', type: 'recovery', duration: 60 },
      { id: '10', type: 'work', distance: 200, targetPace: '0:45' },
      { id: '11', type: 'cooldown', duration: 600, targetPace: 'easy' },
    ],
    totalDuration: 2700,
    totalDistance: 4000,
  },
];

export default function WorkoutBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState('');
  const [segments, setSegments] = useState<WorkoutSegment[]>([
    { id: '1', type: 'warmup', duration: 600 },
  ]);
  const [showPresets, setShowPresets] = useState(true);

  // Save workout mutation
  const saveMutation = api.running.saveWorkoutTemplate.useMutation({
    onSuccess: () => {
      Alert.alert('Saved', 'Workout template saved!');
      router.back();
    },
  });

  const addSegment = (type: SegmentType) => {
    const newSegment: WorkoutSegment = {
      id: Date.now().toString(),
      type,
      duration: type === 'work' ? 180 : 120,
    };
    setSegments([...segments, newSegment]);
    setShowPresets(false);
  };

  const updateSegment = (id: string, updates: Partial<WorkoutSegment>) => {
    setSegments(segments.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSegment = (id: string) => {
    setSegments(segments.filter((s) => s.id !== id));
  };

  const loadPreset = (preset: WorkoutTemplate) => {
    setWorkoutName(preset.name);
    setSegments(preset.segments);
    setShowPresets(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return segments.reduce((total, seg) => {
      const duration = seg.duration || 0;
      const repeat = seg.repeat || 1;
      return total + duration * repeat;
    }, 0);
  };

  const getTotalDistance = () => {
    return segments.reduce((total, seg) => {
      const distance = seg.distance || 0;
      const repeat = seg.repeat || 1;
      return total + distance * repeat;
    }, 0);
  };

  const handleSave = () => {
    if (!workoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    saveMutation.mutate({
      name: workoutName,
      segments,
    });
  };

  const startWorkout = () => {
    router.push({
      pathname: '/(tabs)/run',
      params: { workout: JSON.stringify({ name: workoutName, segments }) },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.light,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
            color: colors.text.primary,
            marginLeft: spacing.md,
          }}
        >
          Workout Builder
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending}>
          <Save size={24} color={colors.accent.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        {/* Workout Name */}
        <TextInput
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="Workout name..."
          placeholderTextColor={colors.text.disabled}
          style={{
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}
        />

        {/* Presets */}
        {showPresets && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text
              style={{
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Quick Start with a Template
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRESET_WORKOUTS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => loadPreset(preset)}
                  style={{
                    backgroundColor: colors.background.secondary,
                    borderRadius: borderRadius.lg,
                    padding: spacing.md,
                    marginRight: spacing.sm,
                    width: 160,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: fontWeight.semibold,
                      color: colors.text.primary,
                    }}
                  >
                    {preset.name}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 }}>
                    {preset.description}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Clock size={12} color={colors.text.tertiary} />
                      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: 2 }}>
                        ~{Math.round(preset.totalDuration / 60)}min
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Footprints size={12} color={colors.text.tertiary} />
                      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: 2 }}>
                        {(preset.totalDistance / 1000).toFixed(1)}km
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Workout Summary */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              alignItems: 'center',
            }}
          >
            <Clock size={20} color={colors.accent.blue} />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {formatDuration(getTotalDuration())}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Total Time</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              alignItems: 'center',
            }}
          >
            <Footprints size={20} color="#4ECDC4" />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {(getTotalDistance() / 1000).toFixed(1)}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>km Distance</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              alignItems: 'center',
            }}
          >
            <Zap size={20} color="#FF6B6B" />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary }}>
              {segments.filter((s) => s.type === 'work').length}
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Intervals</Text>
          </View>
        </View>

        {/* Segments */}
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing.sm,
          }}
        >
          Workout Segments
        </Text>

        {segments.map((segment, index) => {
          const segmentType = SEGMENT_TYPES.find((t) => t.type === segment.type);
          return (
            <Card key={segment.id} style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GripVertical size={20} color={colors.text.disabled} />
                <View
                  style={{
                    width: 8,
                    height: 40,
                    backgroundColor: segmentType?.color || colors.text.tertiary,
                    borderRadius: 4,
                    marginHorizontal: spacing.sm,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.background.tertiary,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        borderRadius: borderRadius.sm,
                      }}
                    >
                      <Text style={{ fontSize: fontSize.sm, color: colors.text.primary }}>
                        {segmentType?.label}
                      </Text>
                      <ChevronDown size={14} color={colors.text.tertiary} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                    {segment.repeat && segment.repeat > 1 && (
                      <View
                        style={{
                          backgroundColor: segmentType?.color + '20',
                          paddingHorizontal: spacing.xs,
                          paddingVertical: 2,
                          borderRadius: borderRadius.sm,
                          marginLeft: spacing.xs,
                        }}
                      >
                        <Text style={{ fontSize: fontSize.xs, color: segmentType?.color }}>
                          x{segment.repeat}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Duration</Text>
                      <TextInput
                        value={segment.duration ? formatDuration(segment.duration) : ''}
                        onChangeText={(text) => {
                          const [mins, secs] = text.split(':').map(Number);
                          if (!isNaN(mins)) {
                            updateSegment(segment.id, { duration: mins * 60 + (secs || 0) });
                          }
                        }}
                        placeholder="0:00"
                        placeholderTextColor={colors.text.disabled}
                        style={{
                          fontSize: fontSize.base,
                          color: colors.text.primary,
                          backgroundColor: colors.background.tertiary,
                          borderRadius: borderRadius.sm,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          marginTop: 2,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Target Pace</Text>
                      <TextInput
                        value={segment.targetPace || ''}
                        onChangeText={(text) => updateSegment(segment.id, { targetPace: text })}
                        placeholder="5:30"
                        placeholderTextColor={colors.text.disabled}
                        style={{
                          fontSize: fontSize.base,
                          color: colors.text.primary,
                          backgroundColor: colors.background.tertiary,
                          borderRadius: borderRadius.sm,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          marginTop: 2,
                        }}
                      />
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeSegment(segment.id)}
                  style={{ padding: spacing.sm }}
                >
                  <Trash2 size={18} color={colors.semantic.error} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}

        {/* Add Segment Buttons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
          {SEGMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.type}
              onPress={() => addSegment(type.type)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: type.color + '20',
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.full,
              }}
            >
              <Plus size={16} color={type.color} />
              <Text style={{ fontSize: fontSize.sm, color: type.color, marginLeft: spacing.xs }}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={{ padding: spacing.md, paddingBottom: spacing.lg }}>
        <Button onPress={startWorkout} disabled={segments.length === 0}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Play size={20} color={colors.text.onAccent} />
            <Text
              style={{
                color: colors.text.onAccent,
                fontWeight: fontWeight.semibold,
                marginLeft: spacing.sm,
              }}
            >
              Start Workout
            </Text>
          </View>
        </Button>
      </View>
    </SafeAreaView>
  );
}
