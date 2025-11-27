import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Dumbbell,
  Footprints,
  ChevronRight,
  Sparkles,
  Plus,
  CheckCircle2,
  Play,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card, Button } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type ProgramFilter = 'all' | 'strength' | 'running' | 'hybrid';

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<ProgramFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch programs
  const { data: programs, isLoading, refetch } = api.calendar.getPrograms.useQuery({
    type: filter === 'all' ? undefined : filter,
  });

  // Fetch active program
  const { data: activeProgram } = api.calendar.getActiveProgram.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filterOptions: { value: ProgramFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'strength', label: 'Strength' },
    { value: 'running', label: 'Running' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  const renderProgram = ({ item }: { item: any }) => {
    const isActive = activeProgram?.id === item.id;
    const completedWorkouts = item.completedCount || 0;
    const totalWorkouts = item.totalCount || 0;
    const progressPercent = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

    return (
      <TouchableOpacity onPress={() => router.push(`/program-detail?id=${item.id}`)}>
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: borderRadius.md,
                backgroundColor: item.type === 'running'
                  ? '#4ECDC420'
                  : item.type === 'hybrid'
                  ? '#FFE66D20'
                  : colors.accent.blue + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              {item.type === 'running' ? (
                <Footprints size={24} color="#4ECDC4" />
              ) : item.type === 'hybrid' ? (
                <Sparkles size={24} color="#FFE66D" />
              ) : (
                <Dumbbell size={24} color={colors.accent.blue} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: fontSize.base,
                    fontWeight: fontWeight.semibold,
                    color: colors.text.primary,
                    flex: 1,
                  }}
                >
                  {item.name}
                </Text>
                {isActive && (
                  <View
                    style={{
                      backgroundColor: colors.accent.green + '20',
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                      borderRadius: borderRadius.sm,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: colors.accent.green, fontWeight: fontWeight.medium }}>
                      ACTIVE
                    </Text>
                  </View>
                )}
              </View>

              {item.description && (
                <Text
                  style={{ fontSize: fontSize.sm, color: colors.text.tertiary, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={14} color={colors.text.tertiary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                    {item.weeks || 0} weeks
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Clock size={14} color={colors.text.tertiary} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginLeft: spacing.xs }}>
                    {totalWorkouts} workouts
                  </Text>
                </View>
              </View>

              {/* Progress bar for active program */}
              {isActive && totalWorkouts > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      Progress
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary }}>
                      {completedWorkouts}/{totalWorkouts}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.background.tertiary,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: colors.accent.green,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>

            <ChevronRight size={20} color={colors.icon.secondary} style={{ marginLeft: spacing.xs }} />
          </View>
        </Card>
      </TouchableOpacity>
    );
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
          Training Programs
        </Text>
      </View>

      {/* Filter Tabs */}
      <View
        style={{
          flexDirection: 'row',
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setFilter(option.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: filter === option.value ? colors.accent.blue : colors.background.secondary,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: filter === option.value ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ask Coach to Generate */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/chat')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          padding: spacing.md,
          backgroundColor: colors.accent.blue + '15',
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.accent.blue + '30',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.accent.blue,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: spacing.md,
          }}
        >
          <Sparkles size={20} color={colors.text.onAccent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text.primary }}>
            Generate Custom Program
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.secondary }}>
            Ask Coach to create a personalized training plan
          </Text>
        </View>
        <ChevronRight size={20} color={colors.accent.blue} />
      </TouchableOpacity>

      {/* Program List */}
      <FlatList
        data={programs}
        keyExtractor={(item) => item.id}
        renderItem={renderProgram}
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading programs...</Text>
            ) : (
              <>
                <Calendar size={48} color={colors.text.disabled} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: colors.text.secondary,
                    marginTop: spacing.md,
                  }}
                >
                  No programs yet
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                  Ask Coach to generate a personalized training program
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
