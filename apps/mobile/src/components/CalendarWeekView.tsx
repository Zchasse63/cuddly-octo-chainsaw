import { View, Text, TouchableOpacity, ScrollView, Dimensions, PanResponder } from 'react-native';
import { useState, useRef, useCallback, useMemo } from 'react';
import { Dumbbell, Activity, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - spacing.lg * 2) / 7;

type WorkoutType = 'strength' | 'running' | 'rest';

type ScheduledWorkout = {
  id: string;
  date: string; // ISO date string
  type: WorkoutType;
  name: string;
  duration?: number; // minutes
  completed?: boolean;
};

type CalendarWeekViewProps = {
  workouts: ScheduledWorkout[];
  onWorkoutPress?: (workout: ScheduledWorkout) => void;
  onWorkoutReschedule?: (workoutId: string, newDate: string) => void;
  onAddWorkout?: (date: string) => void;
  startOfWeek?: 'sunday' | 'monday';
};

export function CalendarWeekView({
  workouts,
  onWorkoutPress,
  onWorkoutReschedule,
  onAddWorkout,
  startOfWeek = 'monday',
}: CalendarWeekViewProps) {
  const { colors } = useTheme();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date(), startOfWeek));
  const [draggingWorkout, setDraggingWorkout] = useState<ScheduledWorkout | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [targetDay, setTargetDay] = useState<number | null>(null);

  // Get days of the week
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  // Get workouts for each day
  const workoutsByDay = useMemo(() => {
    const map: Record<string, ScheduledWorkout[]> = {};
    weekDays.forEach((day) => {
      const dateStr = day.toISOString().split('T')[0];
      map[dateStr] = workouts.filter((w) => w.date === dateStr);
    });
    return map;
  }, [weekDays, workouts]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatWeekHeader = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  };

  const getWorkoutIcon = (type: WorkoutType) => {
    switch (type) {
      case 'strength':
        return Dumbbell;
      case 'running':
        return Activity;
      case 'rest':
        return RotateCcw;
    }
  };

  const getWorkoutColor = (type: WorkoutType) => {
    switch (type) {
      case 'strength':
        return colors.accent.blue;
      case 'running':
        return colors.accent.green;
      case 'rest':
        return colors.accent.purple;
    }
  };

  const handleDragStart = (workout: ScheduledWorkout, event: any) => {
    setDraggingWorkout(workout);
    setDragPosition({
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    });
  };

  const handleDragMove = useCallback(
    (event: any) => {
      if (!draggingWorkout) return;

      const x = event.nativeEvent.pageX;
      const y = event.nativeEvent.pageY;
      setDragPosition({ x, y });

      // Calculate which day column we're over
      const relativeX = x - spacing.lg;
      const dayIndex = Math.floor(relativeX / DAY_WIDTH);
      if (dayIndex >= 0 && dayIndex < 7) {
        setTargetDay(dayIndex);
      } else {
        setTargetDay(null);
      }
    },
    [draggingWorkout]
  );

  const handleDragEnd = useCallback(() => {
    if (draggingWorkout && targetDay !== null && onWorkoutReschedule) {
      const newDate = weekDays[targetDay].toISOString().split('T')[0];
      if (newDate !== draggingWorkout.date) {
        onWorkoutReschedule(draggingWorkout.id, newDate);
      }
    }
    setDraggingWorkout(null);
    setTargetDay(null);
  }, [draggingWorkout, targetDay, weekDays, onWorkoutReschedule]);

  const WorkoutChip = ({ workout, dayIndex }: { workout: ScheduledWorkout; dayIndex: number }) => {
    const Icon = getWorkoutIcon(workout.type);
    const color = getWorkoutColor(workout.type);
    const isDragging = draggingWorkout?.id === workout.id;

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleDragStart(workout, e),
      onPanResponderMove: (e) => handleDragMove(e),
      onPanResponderRelease: handleDragEnd,
      onPanResponderTerminate: handleDragEnd,
    });

    return (
      <View
        {...panResponder.panHandlers}
        style={{
          backgroundColor: color + '20',
          borderRadius: borderRadius.sm,
          padding: spacing.xs,
          marginBottom: spacing.xs,
          borderLeftWidth: 3,
          borderLeftColor: color,
          opacity: isDragging ? 0.3 : workout.completed ? 0.6 : 1,
        }}
      >
        <TouchableOpacity
          onPress={() => onWorkoutPress?.(workout)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon size={12} color={color} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: fontSize.xs,
                color: colors.text.primary,
                marginLeft: 4,
                textDecorationLine: workout.completed ? 'line-through' : 'none',
              }}
            >
              {workout.name}
            </Text>
          </View>
          {workout.duration && (
            <Text
              style={{
                fontSize: 10,
                color: colors.text.tertiary,
                marginTop: 2,
              }}
            >
              {workout.duration}min
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: colors.background.primary }}>
      {/* Week Navigation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <TouchableOpacity onPress={() => navigateWeek('prev')}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          {formatWeekHeader()}
        </Text>
        <TouchableOpacity onPress={() => navigateWeek('next')}>
          <ChevronRight size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border.primary,
        }}
      >
        {weekDays.map((day, index) => {
          const dayName = day.toLocaleString('default', { weekday: 'short' });
          const dayNum = day.getDate();
          const today = isToday(day);

          return (
            <View
              key={index}
              style={{
                width: DAY_WIDTH,
                alignItems: 'center',
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: fontSize.xs,
                  color: today ? colors.accent.blue : colors.text.tertiary,
                  fontWeight: fontWeight.medium,
                }}
              >
                {dayName}
              </Text>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: today ? colors.accent.blue : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: spacing.xs,
                }}
              >
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    fontWeight: today ? fontWeight.bold : fontWeight.normal,
                    color: today ? colors.text.onAccent : colors.text.primary,
                  }}
                >
                  {dayNum}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Workout Grid */}
      <ScrollView
        style={{ maxHeight: 200 }}
        contentContainerStyle={{
          flexDirection: 'row',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}
      >
        {weekDays.map((day, index) => {
          const dateStr = day.toISOString().split('T')[0];
          const dayWorkouts = workoutsByDay[dateStr] || [];
          const isTarget = targetDay === index && draggingWorkout !== null;

          return (
            <View
              key={index}
              style={{
                width: DAY_WIDTH,
                minHeight: 80,
                paddingHorizontal: 2,
                backgroundColor: isTarget ? colors.accent.blue + '10' : 'transparent',
                borderRadius: borderRadius.sm,
              }}
            >
              {dayWorkouts.map((workout) => (
                <WorkoutChip key={workout.id} workout={workout} dayIndex={index} />
              ))}

              {/* Add workout button */}
              {dayWorkouts.length === 0 && (
                <TouchableOpacity
                  onPress={() => onAddWorkout?.(dateStr)}
                  style={{
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border.primary,
                    borderStyle: 'dashed',
                    borderRadius: borderRadius.sm,
                  }}
                >
                  <Text style={{ fontSize: fontSize.lg, color: colors.text.tertiary }}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Dragging overlay */}
      {draggingWorkout && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: dragPosition.x - 40,
            top: dragPosition.y - 20,
            width: 80,
            backgroundColor: getWorkoutColor(draggingWorkout.type),
            borderRadius: borderRadius.sm,
            padding: spacing.xs,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontSize: fontSize.xs,
              color: colors.text.onAccent,
              fontWeight: fontWeight.medium,
              textAlign: 'center',
            }}
          >
            {draggingWorkout.name}
          </Text>
        </View>
      )}
    </View>
  );
}

// Helper function to get the start of the week
function getWeekStart(date: Date, startOfWeek: 'sunday' | 'monday'): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = startOfWeek === 'monday' ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default CalendarWeekView;
