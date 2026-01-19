import { View, Text, FlatList, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
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
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

type ProgramTab = 'active' | 'completed' | 'discover';

export default function ProgramsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<ProgramTab>('active');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all programs
  const { data: allPrograms, isLoading, refetch } = api.calendar.listPrograms.useQuery();

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter programs by tab
  const programs = allPrograms?.filter((p) => {
    if (selectedTab === 'active') {
      return p.status !== 'completed' && p.status !== 'cancelled';
    }
    if (selectedTab === 'completed') {
      return p.status === 'completed';
    }
    return false; // Discover tab doesn't filter existing programs
  });

  const renderProgram = ({ item }: { item: any }) => {
    const isActive = item.status !== 'completed' && item.status !== 'cancelled';
    const isCompleted = item.status === 'completed';
    const completedWorkouts = item.completedCount || 0;
    const totalWorkouts = item.totalCount || 0;
    const progressPercent = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;

    return (
      <TouchableOpacity onPress={() => router.push(`/program/${item.id}` as any)}>
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: borderRadius.md,
                backgroundColor: item.type === 'running'
                  ? colors.activity.running + '20'
                  : item.type === 'hybrid'
                  ? colors.activity.tempo + '20'
                  : colors.accent.blue + '20',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}
            >
              {item.type === 'running' ? (
                <Footprints size={24} color={colors.activity.running} />
              ) : item.type === 'hybrid' ? (
                <Sparkles size={24} color={colors.activity.tempo} />
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
                {isCompleted && (
                  <CheckCircle2 size={20} color={colors.accent.green} />
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

              {/* Progress bar for active/in-progress programs */}
              {(isActive || isCompleted) && totalWorkouts > 0 && (
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
                        backgroundColor: isCompleted ? colors.accent.green : colors.accent.blue,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              )}

              {isCompleted && item.completedAt && (
                <Text style={{ fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: spacing.xs }}>
                  Completed {new Date(item.completedAt).toLocaleDateString()}
                </Text>
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

      {/* Three-Tab Segmented Control */}
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <SegmentedControl
          values={['Active', 'Completed', 'Discover']}
          selectedIndex={
            selectedTab === 'active' ? 0 : selectedTab === 'completed' ? 1 : 2
          }
          onChange={(event: any) => {
            const index = event.nativeEvent.selectedSegmentIndex;
            setSelectedTab(index === 0 ? 'active' : index === 1 ? 'completed' : 'discover');
          }}
          style={{ height: 36 }}
        />
      </View>

      {/* Tab Content */}
      {selectedTab === 'discover' ? (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Ask Coach to Generate */}
          <TouchableOpacity
            onPress={() => router.push('/program-questionnaire' as any)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              backgroundColor: colors.accent.blue + '15',
              borderRadius: borderRadius.lg,
              borderWidth: 1,
              borderColor: colors.accent.blue + '30',
              marginBottom: spacing.lg,
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
                Answer a few questions to create a personalized training plan
              </Text>
            </View>
            <ChevronRight size={20} color={colors.accent.blue} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing.sm,
            }}
          >
            AI Suggestions
          </Text>

          <Card style={{ marginBottom: spacing.sm }}>
            <View style={{ alignItems: 'center', padding: spacing.md }}>
              <Sparkles size={32} color={colors.text.disabled} />
              <Text
                style={{
                  fontSize: fontSize.base,
                  color: colors.text.tertiary,
                  marginTop: spacing.sm,
                  textAlign: 'center',
                }}
              >
                Your coach will analyze your progress and suggest new programs tailored to your goals
              </Text>
            </View>
          </Card>
        </ScrollView>
      ) : (
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
                    No {selectedTab} programs
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                    {selectedTab === 'active'
                      ? 'Create a program to get started'
                      : 'You haven\'t completed any programs yet'}
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
