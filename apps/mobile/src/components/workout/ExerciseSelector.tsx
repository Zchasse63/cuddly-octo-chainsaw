import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { X, Dumbbell, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useDebounce } from '../../hooks/useDebounce';
import { api } from '../../lib/trpc';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/tokens';

interface Exercise {
  id: string;
  name: string;
  primaryMuscle?: string;
  equipment?: string[] | null;
}

interface ExerciseSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const;
const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable'] as const;

export function ExerciseSelector({ visible, onClose, onSelectExercise }: ExerciseSelectorProps) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedMuscle, setSelectedMuscle] = React.useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] = React.useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: exercises } = api.exercise.list.useQuery(
    {
      search: debouncedSearch || undefined,
      muscleGroup: selectedMuscle || undefined,
      equipment: selectedEquipment || undefined,
    },
    { enabled: visible && (debouncedSearch.length >= 2 || !!selectedMuscle || !!selectedEquipment) }
  );

  const { data: recentExercises } = api.exercise.list.useQuery(
    { limit: 5 },
    { enabled: visible && !debouncedSearch && !selectedMuscle && !selectedEquipment }
  );

  const handleSelectExercise = (exercise: Exercise) => {
    onSelectExercise(exercise);
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            flex: 1,
            marginTop: 100,
            backgroundColor: colors.background.primary,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.light,
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.semibold,
                color: colors.text.primary,
                marginLeft: spacing.md,
              }}
            >
              Add Exercise
            </Text>
          </View>

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
              <Dumbbell size={20} color={colors.icon.secondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={colors.text.disabled}
                autoFocus
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  marginLeft: spacing.sm,
                  fontSize: fontSize.base,
                  color: colors.text.primary,
                }}
              />
            </View>

            {/* Filter Chips - Muscle Groups */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {MUSCLE_GROUPS.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    onPress={() => setSelectedMuscle(selectedMuscle === muscle ? null : muscle)}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.full,
                      backgroundColor: selectedMuscle === muscle ? colors.accent.blue : colors.background.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: selectedMuscle === muscle ? '#FFFFFF' : colors.text.secondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Filter Chips - Equipment */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {EQUIPMENT_OPTIONS.map((equip) => (
                  <TouchableOpacity
                    key={equip}
                    onPress={() => setSelectedEquipment(selectedEquipment === equip ? null : equip)}
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.full,
                      backgroundColor: selectedEquipment === equip ? colors.accent.purple : colors.background.secondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: fontSize.sm,
                        color: selectedEquipment === equip ? '#FFFFFF' : colors.text.secondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {equip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md }}>
            {/* Recent Exercises Section */}
            {!debouncedSearch && !selectedMuscle && !selectedEquipment && recentExercises && recentExercises.length > 0 && (
              <View style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.secondary, marginBottom: spacing.sm }}>
                  Recent Exercises
                </Text>
                {recentExercises.map((exercise: Exercise) => (
                  <TouchableOpacity
                    key={exercise.id}
                    onPress={() => handleSelectExercise(exercise)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.sm,
                      backgroundColor: colors.background.tertiary,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.xs,
                    }}
                  >
                    <Dumbbell size={16} color={colors.icon.secondary} />
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.primary, marginLeft: spacing.sm }}>
                      {exercise.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {exercises?.map((exercise: Exercise) => (
              <TouchableOpacity
                key={exercise.id}
                onPress={() => handleSelectExercise(exercise)}
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
                    width: 40,
                    height: 40,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.accent.blue + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                  }}
                >
                  <Dumbbell size={20} color={colors.accent.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text.primary }}>
                    {exercise.name}
                  </Text>
                  {exercise.primaryMuscle && (
                    <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary }}>{exercise.primaryMuscle}</Text>
                  )}
                </View>
                <Plus size={20} color={colors.accent.blue} />
              </TouchableOpacity>
            ))}
            {searchQuery.length < 2 && !selectedMuscle && !selectedEquipment && (!recentExercises || recentExercises.length === 0) && (
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                Type to search or select a filter
              </Text>
            )}
            {(searchQuery.length >= 2 || selectedMuscle || selectedEquipment) && (!exercises || exercises.length === 0) && (
              <Text style={{ fontSize: fontSize.sm, color: colors.text.tertiary, textAlign: 'center' }}>
                No exercises found
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
