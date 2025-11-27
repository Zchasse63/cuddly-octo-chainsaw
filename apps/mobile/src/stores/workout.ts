import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for workout tracking
export interface WorkoutSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isPR: boolean;
  notes: string;
  completedAt: Date | null;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  sets: WorkoutSet[];
  notes: string;
  order: number;
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: Date;
  exercises: WorkoutExercise[];
  notes: string;
  loggingMethod: 'manual' | 'voice' | 'template';
  programId?: string;
  programDayId?: string;
}

export interface CompletedWorkout extends ActiveWorkout {
  completedAt: Date;
  durationSeconds: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
}

interface WorkoutState {
  // Active workout state
  activeWorkout: ActiveWorkout | null;
  isWorkoutActive: boolean;

  // Rest timer
  restTimerSeconds: number;
  restTimerRunning: boolean;
  restTimerTarget: number;

  // Recent workouts (local cache)
  recentWorkouts: CompletedWorkout[];

  // Exercise search/selection
  selectedExerciseId: string | null;

  // Actions - Workout Management
  startWorkout: (options?: {
    name?: string;
    loggingMethod?: 'manual' | 'voice' | 'template';
    programId?: string;
    programDayId?: string;
  }) => void;
  endWorkout: () => CompletedWorkout | null;
  cancelWorkout: () => void;
  updateWorkoutName: (name: string) => void;
  updateWorkoutNotes: (notes: string) => void;

  // Actions - Exercise Management
  addExercise: (exercise: { id: string; name: string; primaryMuscle: string }) => void;
  removeExercise: (exerciseId: string) => void;
  reorderExercises: (exerciseIds: string[]) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;

  // Actions - Set Management
  addSet: (exerciseId: string, setData?: Partial<WorkoutSet>) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<WorkoutSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  duplicateLastSet: (exerciseId: string) => void;

  // Actions - Rest Timer
  startRestTimer: (seconds?: number) => void;
  stopRestTimer: () => void;
  resetRestTimer: () => void;
  setRestTimerTarget: (seconds: number) => void;
  tickRestTimer: () => void;

  // Actions - Misc
  setSelectedExercise: (exerciseId: string | null) => void;
  clearRecentWorkouts: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      isWorkoutActive: false,
      restTimerSeconds: 0,
      restTimerRunning: false,
      restTimerTarget: 90, // Default 90 seconds
      recentWorkouts: [],
      selectedExerciseId: null,

      startWorkout: (options = {}) => {
        const workout: ActiveWorkout = {
          id: generateId(),
          name: options.name || `Workout ${new Date().toLocaleDateString()}`,
          startedAt: new Date(),
          exercises: [],
          notes: '',
          loggingMethod: options.loggingMethod || 'manual',
          programId: options.programId,
          programDayId: options.programDayId,
        };

        set({ activeWorkout: workout, isWorkoutActive: true });
      },

      endWorkout: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return null;

        // Calculate totals
        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;

        activeWorkout.exercises.forEach((exercise) => {
          exercise.sets.forEach((s) => {
            if (s.completedAt && !s.isWarmup) {
              totalSets++;
              totalReps += s.reps || 0;
              totalVolume += (s.weight || 0) * (s.reps || 0);
            }
          });
        });

        const completedWorkout: CompletedWorkout = {
          ...activeWorkout,
          completedAt: new Date(),
          durationSeconds: Math.floor(
            (new Date().getTime() - new Date(activeWorkout.startedAt).getTime()) / 1000
          ),
          totalVolume,
          totalSets,
          totalReps,
        };

        set((state) => ({
          activeWorkout: null,
          isWorkoutActive: false,
          recentWorkouts: [completedWorkout, ...state.recentWorkouts].slice(0, 10),
          restTimerRunning: false,
          restTimerSeconds: 0,
        }));

        return completedWorkout;
      },

      cancelWorkout: () => {
        set({
          activeWorkout: null,
          isWorkoutActive: false,
          restTimerRunning: false,
          restTimerSeconds: 0,
        });
      },

      updateWorkoutName: (name) => {
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? { ...state.activeWorkout, name }
            : null,
        }));
      },

      updateWorkoutNotes: (notes) => {
        set((state) => ({
          activeWorkout: state.activeWorkout
            ? { ...state.activeWorkout, notes }
            : null,
        }));
      },

      addExercise: (exercise) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const newExercise: WorkoutExercise = {
            id: generateId(),
            exerciseId: exercise.id,
            name: exercise.name,
            primaryMuscle: exercise.primaryMuscle,
            sets: [],
            notes: '',
            order: state.activeWorkout.exercises.length,
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: [...state.activeWorkout.exercises, newExercise],
            },
          };
        });
      },

      removeExercise: (exerciseId) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.filter(
                (e) => e.id !== exerciseId
              ),
            },
          };
        });
      },

      reorderExercises: (exerciseIds) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exerciseMap = new Map(
            state.activeWorkout.exercises.map((e) => [e.id, e])
          );

          const reorderedExercises = exerciseIds
            .map((id, index) => {
              const exercise = exerciseMap.get(id);
              return exercise ? { ...exercise, order: index } : null;
            })
            .filter((e): e is WorkoutExercise => e !== null);

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: reorderedExercises,
            },
          };
        });
      },

      updateExerciseNotes: (exerciseId, notes) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseId ? { ...e, notes } : e
              ),
            },
          };
        });
      },

      addSet: (exerciseId, setData = {}) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          const exerciseIndex = state.activeWorkout.exercises.findIndex(
            (e) => e.id === exerciseId
          );
          if (exerciseIndex === -1) return state;

          const exercise = state.activeWorkout.exercises[exerciseIndex];
          const lastSet = exercise.sets[exercise.sets.length - 1];

          const newSet: WorkoutSet = {
            id: generateId(),
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.name,
            setNumber: exercise.sets.length + 1,
            weight: setData.weight ?? lastSet?.weight ?? null,
            reps: setData.reps ?? lastSet?.reps ?? null,
            rpe: setData.rpe ?? null,
            isWarmup: setData.isWarmup ?? false,
            isPR: false,
            notes: setData.notes ?? '',
            completedAt: null,
          };

          const updatedExercises = [...state.activeWorkout.exercises];
          updatedExercises[exerciseIndex] = {
            ...exercise,
            sets: [...exercise.sets, newSet],
          };

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: updatedExercises,
            },
          };
        });
      },

      updateSet: (exerciseId, setId, data) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets.map((s) =>
                        s.id === setId ? { ...s, ...data } : s
                      ),
                    }
                  : e
              ),
            },
          };
        });
      },

      removeSet: (exerciseId, setId) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets
                        .filter((s) => s.id !== setId)
                        .map((s, index) => ({ ...s, setNumber: index + 1 })),
                    }
                  : e
              ),
            },
          };
        });
      },

      completeSet: (exerciseId, setId) => {
        set((state) => {
          if (!state.activeWorkout) return state;

          return {
            activeWorkout: {
              ...state.activeWorkout,
              exercises: state.activeWorkout.exercises.map((e) =>
                e.id === exerciseId
                  ? {
                      ...e,
                      sets: e.sets.map((s) =>
                        s.id === setId
                          ? { ...s, completedAt: new Date() }
                          : s
                      ),
                    }
                  : e
              ),
            },
          };
        });

        // Auto-start rest timer after completing a set
        const { restTimerTarget, startRestTimer } = get();
        startRestTimer(restTimerTarget);
      },

      duplicateLastSet: (exerciseId) => {
        const { activeWorkout, addSet } = get();
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find((e) => e.id === exerciseId);
        if (!exercise || exercise.sets.length === 0) {
          addSet(exerciseId);
          return;
        }

        const lastSet = exercise.sets[exercise.sets.length - 1];
        addSet(exerciseId, {
          weight: lastSet.weight,
          reps: lastSet.reps,
          isWarmup: false,
        });
      },

      startRestTimer: (seconds) => {
        const target = seconds ?? get().restTimerTarget;
        set({ restTimerSeconds: target, restTimerRunning: true });
      },

      stopRestTimer: () => {
        set({ restTimerRunning: false });
      },

      resetRestTimer: () => {
        set({ restTimerSeconds: 0, restTimerRunning: false });
      },

      setRestTimerTarget: (seconds) => {
        set({ restTimerTarget: seconds });
      },

      tickRestTimer: () => {
        set((state) => {
          if (!state.restTimerRunning || state.restTimerSeconds <= 0) {
            return { restTimerRunning: false, restTimerSeconds: 0 };
          }
          return { restTimerSeconds: state.restTimerSeconds - 1 };
        });
      },

      setSelectedExercise: (exerciseId) => {
        set({ selectedExerciseId: exerciseId });
      },

      clearRecentWorkouts: () => {
        set({ recentWorkouts: [] });
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        isWorkoutActive: state.isWorkoutActive,
        restTimerTarget: state.restTimerTarget,
        recentWorkouts: state.recentWorkouts,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useActiveWorkout = () => useWorkoutStore((state) => state.activeWorkout);
export const useIsWorkoutActive = () => useWorkoutStore((state) => state.isWorkoutActive);
export const useRestTimer = () => useWorkoutStore((state) => ({
  seconds: state.restTimerSeconds,
  running: state.restTimerRunning,
  target: state.restTimerTarget,
}));
