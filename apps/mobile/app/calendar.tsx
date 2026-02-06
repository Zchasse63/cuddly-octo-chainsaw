import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  ArrowLeft,
  Dumbbell,
  Footprints,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';
import { DayDetailSheet } from '../src/components/calendar/DayDetailSheet';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate week end date
  const weekEndDate = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 6);
    return end;
  }, [currentWeekStart]);

  // Fetch calendar entries for the week
  const { data: calendarEntries, refetch } = api.calendar.getEntries.useQuery({
    startDate: currentWeekStart.toISOString().split('T')[0],
    endDate: weekEndDate.toISOString().split('T')[0],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Generate 7 days for the week
  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = calendarEntries?.find(
        (e: any) => e.date.split('T')[0] === dateStr
      );

      days.push({
        date,
        dayName: DAYS[date.getDay()],
        dayNum: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        entry,
      });
    }

    return days;
  }, [currentWeekStart, calendarEntries]);

  const goToPreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    setCurrentWeekStart(weekStart);
  };

  // Swipe gesture handlers
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 100) {
        goToPreviousWeek();
      } else if (event.translationX < -100) {
        goToNextWeek();
      }
    });

  const getActivityIcon = (entry: any) => {
    if (!entry) return null;

    if (entry.activityType === 'running') {
      return <Footprints size={24} color={colors.activity.running} />;
    }
    if (entry.title?.toLowerCase().includes('rest')) {
      return <Moon size={24} color={colors.text.tertiary} />;
    }
    return <Dumbbell size={24} color={colors.accent.blue} />;
  };

  const getStatusColor = (entry: any) => {
    if (!entry) return colors.background.secondary;

    if (entry.status === 'completed') return colors.status.success;
    if (entry.status === 'missed') return colors.status.error;
    if (entry.title?.toLowerCase().includes('rest')) return colors.text.tertiary;
    return colors.accent.blue;
  };

  // Format week range header
  const weekRangeText = useMemo(() => {
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const startDay = currentWeekStart.getDate();
    const endMonth = weekEndDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekEndDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }, [currentWeekStart, weekEndDate]);

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
          Calendar
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
        {/* Week Navigation */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.md,
          }}
        >
          <TouchableOpacity onPress={goToPreviousWeek}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
            }}
          >
            {weekRangeText}
          </Text>
          <TouchableOpacity onPress={goToNextWeek}>
            <ChevronRight size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* 7-Day Horizontal ScrollView with Swipe Gesture */}
        <GestureDetector gesture={swipeGesture}>
          <View style={{ paddingHorizontal: spacing.md }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {weekDays.map((day, index) => {
                const statusColor = getStatusColor(day.entry);
                const isSelected = selectedDate?.toDateString() === day.date.toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedDate(day.date);
                      setSheetVisible(true);
                    }}
                    style={{
                      width: 80,
                      alignItems: 'center',
                      padding: spacing.sm,
                      borderRadius: borderRadius.lg,
                      backgroundColor: isSelected
                        ? colors.accent.blue
                        : colors.background.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.xs,
                        fontWeight: fontWeight.medium,
                        color: isSelected ? colors.text.onAccent : colors.text.tertiary,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {day.dayName}
                    </Text>

                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor: day.isToday && !isSelected
                          ? colors.accent.blue + '20'
                          : isSelected
                          ? colors.background.primary
                          : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: spacing.xs,
                        borderWidth: day.isToday ? 2 : 0,
                        borderColor: colors.accent.blue,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.xl,
                          fontWeight: fontWeight.bold,
                          color: isSelected
                            ? colors.text.primary
                            : day.isToday
                            ? colors.accent.blue
                            : colors.text.primary,
                        }}
                      >
                        {day.dayNum}
                      </Text>
                    </View>

                    {/* Activity Icon */}
                    <View style={{ height: 32, justifyContent: 'center' }}>
                      {getActivityIcon(day.entry)}
                    </View>

                    {/* Status Indicator */}
                    {day.entry && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: statusColor,
                          marginTop: spacing.xs,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </GestureDetector>

        {/* Legend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.lg,
            padding: spacing.md,
            marginTop: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Dumbbell size={16} color={colors.accent.blue} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Strength</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Footprints size={16} color={colors.activity.running} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Running</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Moon size={16} color={colors.text.tertiary} />
            <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>Rest</Text>
          </View>
        </View>
      </ScrollView>

      {selectedDate && (
        <DayDetailSheet
          visible={sheetVisible}
          date={selectedDate.toISOString().split('T')[0]}
          onClose={() => setSheetVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}
