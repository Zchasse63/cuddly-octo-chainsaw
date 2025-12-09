import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Check,
  X,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasWorkout: boolean;
  hasRun: boolean;
  isRestDay: boolean;
  isCompleted: boolean;
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Get start and end of current month view
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    // Extend to full weeks
    start.setDate(start.getDate() - start.getDay());
    end.setDate(end.getDate() + (6 - end.getDay()));
    return { startDate: start, endDate: end };
  }, [currentDate]);

  // Fetch calendar entries for the visible range
  const { data: calendarEntries, refetch } = api.calendar.getEntries.useQuery({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  });

  // Fetch scheduled items for selected date
  const { data: selectedDayItems } = api.calendar.getToday.useQuery(
    undefined,
    { enabled: !!selectedDate }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const current = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const entry = calendarEntries?.find(
        (e: any) => e.date.split('T')[0] === dateStr
      );

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: current.getTime() === today.getTime(),
        hasWorkout: entry?.activityType === 'strength' || entry?.activityType === 'crossfit',
        hasRun: entry?.activityType === 'running',
        isRestDay: entry?.activityType === 'custom' && entry?.title?.toLowerCase().includes('rest'),
        isCompleted: entry?.status === 'completed',
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [startDate, endDate, currentDate, calendarEntries]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isSelectedDate = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
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
          Training Calendar
        </Text>
        <TouchableOpacity onPress={goToToday}>
          <Text style={{ fontSize: fontSize.sm, color: colors.accent.blue }}>
            Today
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Month Navigation */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
          }}
        >
          <TouchableOpacity onPress={goToPreviousMonth}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={goToNextMonth}>
            <ChevronRight size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          {DAYS.map((day) => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: fontSize.xs,
                  fontWeight: fontWeight.medium,
                  color: colors.text.tertiary,
                }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={{ paddingHorizontal: spacing.sm }}>
          {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
            <View key={weekIndex} style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
              {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => (
                <TouchableOpacity
                  key={dayIndex}
                  onPress={() => setSelectedDate(day.date)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: borderRadius.md,
                    backgroundColor: isSelectedDate(day.date)
                      ? colors.accent.blue
                      : day.isToday
                      ? colors.accent.blue + '20'
                      : 'transparent',
                    margin: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: day.isToday ? fontWeight.bold : fontWeight.regular,
                      color: isSelectedDate(day.date)
                        ? colors.text.onAccent
                        : day.isCurrentMonth
                        ? colors.text.primary
                        : colors.text.disabled,
                    }}
                  >
                    {day.date.getDate()}
                  </Text>

                  {/* Activity indicators */}
                  <View style={{ flexDirection: 'row', marginTop: 2, gap: 2 }}>
                    {day.hasWorkout && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: day.isCompleted ? colors.accent.green : colors.accent.blue,
                        }}
                      />
                    )}
                    {day.hasRun && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: day.isCompleted ? colors.accent.green : '#4ECDC4',
                        }}
                      />
                    )}
                    {day.isRestDay && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.text.disabled,
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.lg,
            padding: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.light,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.blue }} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Strength</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ECDC4' }} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Running</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent.green }} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Completed</Text>
          </View>
        </View>

        {/* Selected Day Details */}
        {selectedDate && (
          <View style={{ padding: spacing.md }}>
            <Text
              style={{
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>

            {selectedDayItems && selectedDayItems.length > 0 ? (
              selectedDayItems.map((item: any) => (
                <Card key={item.id} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: borderRadius.md,
                        backgroundColor: item.activityType === 'running'
                          ? '#4ECDC420'
                          : colors.accent.blue + '20',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      {item.activityType === 'running' ? (
                        <Footprints size={24} color="#4ECDC4" />
                      ) : (
                        <Dumbbell size={24} color={colors.accent.blue} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: fontWeight.semibold,
                          color: colors.text.primary,
                        }}
                      >
                        {item.title}
                      </Text>
                      {item.estimatedDuration && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Clock size={14} color={colors.text.tertiary} />
                          <Text
                            style={{
                              fontSize: fontSize.sm,
                              color: colors.text.tertiary,
                              marginLeft: spacing.xs,
                            }}
                          >
                            ~{Math.round(item.estimatedDuration / 60)} min
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.status === 'completed' ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.accent.green + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Check size={18} color={colors.accent.green} />
                      </View>
                    ) : item.status === 'skipped' ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.semantic.error + '20',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <X size={18} color={colors.semantic.error} />
                      </View>
                    ) : (
                      <Button
                        size="sm"
                        onPress={() => {
                          if (item.activityType === 'running') {
                            router.push('/(tabs)/run');
                          } else {
                            router.push('/(tabs)/workout');
                          }
                        }}
                      >
                        Start
                      </Button>
                    )}
                  </View>
                </Card>
              ))
            ) : (
              <Card>
                <View style={{ alignItems: 'center', padding: spacing.md }}>
                  <CalendarIcon size={32} color={colors.text.disabled} />
                  <Text
                    style={{
                      fontSize: fontSize.base,
                      color: colors.text.tertiary,
                      marginTop: spacing.sm,
                      textAlign: 'center',
                    }}
                  >
                    No training scheduled
                  </Text>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(tabs)/chat')}
                    style={{ marginTop: spacing.md }}
                  >
                    Ask Coach to Plan
                  </Button>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
