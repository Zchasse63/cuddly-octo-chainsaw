import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { Card, Button } from '../ui';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
}

interface TodaysWorkout {
  id: string;
  title: string;
  estimatedDuration?: number;
  exercises?: Exercise[];
}

interface TodaysWorkoutCardProps {
  workout: TodaysWorkout | null;
}

export function TodaysWorkoutCard({ workout }: TodaysWorkoutCardProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  if (!workout) {
    return (
      <Card style={{ marginBottom: spacing.lg, backgroundColor: colors.background.secondary }}>
        <View style={{ alignItems: 'center', padding: spacing.md }}>
          <Dumbbell size={32} color={colors.text.disabled} />
          <Text
            style={{
              fontSize: fontSize.base,
              color: colors.text.tertiary,
              marginTop: spacing.sm,
              textAlign: 'center',
            }}
          >
            No workout scheduled today
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.disabled, marginTop: spacing.xs }}>
            Rest day or create a new workout
          </Text>
        </View>
      </Card>
    );
  }

  const exercises = workout.exercises || [];
  const visibleExercises = expanded ? exercises : exercises.slice(0, 3);

  return (
    <Card style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.accent.blue + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.md,
          }}
        >
          <Dumbbell size={20} color={colors.accent.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            {workout.title}
          </Text>
          {workout.estimatedDuration && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <Clock size={14} color={colors.text.tertiary} />
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                ~{Math.round(workout.estimatedDuration / 60)} min
              </Text>
            </View>
          )}
        </View>
      </View>

      {exercises.length > 0 && (
        <View
          style={{
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.md,
            padding: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          {visibleExercises.map((exercise, index) => (
            <View
              key={exercise.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, width: 20 }}>{index + 1}.</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.text.primary, flex: 1 }}>{exercise.name}</Text>
              {exercise.sets && exercise.reps && (
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                  {exercise.sets}×{exercise.reps}
                </Text>
              )}
            </View>
          ))}
          {exercises.length > 3 && (
            <TouchableOpacity
              onPress={() => {
                setExpanded(!expanded);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: spacing.xs,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, color: colors.accent.blue, marginRight: spacing.xs }}>
                {expanded ? 'Show less' : `+${exercises.length - 3} more`}
              </Text>
              {expanded ? (
                <ChevronUp size={16} color={colors.accent.blue} />
              ) : (
                <ChevronDown size={16} color={colors.accent.blue} />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/(tabs)/workout', params: { workoutId: workout.id } });
            }}
            fullWidth
          >
            Start Workout
          </Button>
        </View>
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            backgroundColor: colors.background.tertiary,
            borderRadius: borderRadius.md,
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>Skip</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}
