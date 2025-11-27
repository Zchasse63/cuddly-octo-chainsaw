import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Dumbbell,
  Filter,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { Card } from '../src/components/ui';
import { api } from '../src/lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../src/theme/tokens';

const muscleGroups = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
  'Glutes',
];

const difficultyColors: Record<string, string> = {
  beginner: '#4ECDC4',
  intermediate: '#FFE66D',
  advanced: '#FF6B6B',
};

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');

  // Fetch exercises
  const { data: exercises, isLoading } = api.exercise.list.useQuery({
    limit: 500,
  });

  // Filter exercises
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];

    return exercises.filter((exercise: any) => {
      const matchesSearch =
        search === '' ||
        exercise.name.toLowerCase().includes(search.toLowerCase()) ||
        exercise.aliases?.some((a: string) => a.toLowerCase().includes(search.toLowerCase()));

      const matchesMuscle =
        selectedMuscle === 'All' ||
        exercise.primaryMuscle?.toLowerCase() === selectedMuscle.toLowerCase() ||
        exercise.secondaryMuscles?.some(
          (m: string) => m.toLowerCase() === selectedMuscle.toLowerCase()
        );

      return matchesSearch && matchesMuscle;
    });
  }, [exercises, search, selectedMuscle]);

  const renderExercise = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/exercise/${item.id}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: colors.accent.blue + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: spacing.md,
        }}
      >
        <Dumbbell size={24} color={colors.accent.blue} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: fontSize.base,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          }}
        >
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
            {item.primaryMuscle}
          </Text>
          {item.difficulty && (
            <>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.text.disabled,
                  marginHorizontal: spacing.xs,
                }}
              />
              <Text
                style={{
                  fontSize: fontSize.sm,
                  color: difficultyColors[item.difficulty] || colors.text.tertiary,
                }}
              >
                {item.difficulty}
              </Text>
            </>
          )}
        </View>
      </View>

      <ChevronRight size={20} color={colors.icon.secondary} />
    </TouchableOpacity>
  );

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
          Exercise Library
        </Text>
      </View>

      {/* Search */}
      <View style={{ padding: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.lg,
            paddingHorizontal: spacing.md,
          }}
        >
          <Search size={20} color={colors.icon.secondary} />
          <TextInput
            style={{
              flex: 1,
              height: 44,
              marginLeft: spacing.sm,
              fontSize: fontSize.base,
              color: colors.text.primary,
            }}
            placeholder="Search exercises..."
            placeholderTextColor={colors.text.disabled}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={20} color={colors.icon.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Muscle Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}
        data={muscleGroups}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedMuscle(item)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: borderRadius.full,
              backgroundColor: selectedMuscle === item ? colors.accent.blue : colors.background.secondary,
              marginRight: spacing.xs,
            }}
          >
            <Text
              style={{
                fontSize: fontSize.sm,
                color: selectedMuscle === item ? colors.text.onAccent : colors.text.secondary,
              }}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExercise}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            {isLoading ? (
              <Text style={{ color: colors.text.secondary }}>Loading exercises...</Text>
            ) : (
              <>
                <Dumbbell size={48} color={colors.text.disabled} />
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: colors.text.secondary,
                    marginTop: spacing.md,
                  }}
                >
                  No exercises found
                </Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>
                  Try a different search or filter
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Results count */}
      {!isLoading && filteredExercises.length > 0 && (
        <View
          style={{
            padding: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border.light,
          }}
        >
          <Text
            style={{
              fontSize: fontSize.sm,
              color: colors.text.tertiary,
              textAlign: 'center',
            }}
          >
            {filteredExercises.length} exercises
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
