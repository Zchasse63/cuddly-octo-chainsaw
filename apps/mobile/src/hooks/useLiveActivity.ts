import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import { useWorkoutStore, useActiveWorkout } from '../stores/workout';

const { LiveActivityModule } = NativeModules;

interface LiveActivityState {
  workoutName: string;
  currentExercise: string;
  setNumber: number;
  totalSets: number;
  weight: number;
  weightUnit: string;
  reps: number;
  elapsedSeconds: number;
  totalVolume: number;
  isPaused: boolean;
}

interface UseLiveActivityReturn {
  isAvailable: boolean;
  isActive: boolean;
  start: () => Promise<void>;
  update: (state: Partial<LiveActivityState>) => Promise<void>;
  end: () => Promise<void>;
}

/**
 * useLiveActivity - Hook to manage iOS Live Activities for workouts
 *
 * Live Activities show on the Lock Screen and Dynamic Island during active workouts,
 * displaying:
 * - Current exercise and set number
 * - Weight × Reps
 * - Elapsed time
 * - Total volume
 *
 * Requirements:
 * - iOS 16.1+
 * - User must enable Live Activities in Settings
 * - Only works on physical devices (not simulator)
 */
export function useLiveActivity(): UseLiveActivityReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const activeWorkout = useActiveWorkout();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS !== 'ios' || !LiveActivityModule) {
        setIsAvailable(false);
        return;
      }

      try {
        const result = await LiveActivityModule.isAvailable();
        setIsAvailable(result.enabled);
      } catch {
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  // Auto-update elapsed time
  useEffect(() => {
    if (isActive && startTimeRef.current) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000);
        updateElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  const updateElapsedTime = async (seconds: number) => {
    if (!LiveActivityModule || !isActive) return;

    try {
      await LiveActivityModule.updateWorkoutActivity({
        elapsedSeconds: seconds,
      });
    } catch {
      // Ignore update errors
    }
  };

  const start = useCallback(async () => {
    if (!isAvailable || !LiveActivityModule || !activeWorkout) {
      return;
    }

    try {
      await LiveActivityModule.startWorkoutActivity(
        activeWorkout.id,
        activeWorkout.name
      );
      startTimeRef.current = new Date(activeWorkout.startedAt);
      setIsActive(true);
    } catch (error) {
      console.warn('Failed to start Live Activity:', error);
    }
  }, [isAvailable, activeWorkout]);

  const update = useCallback(async (state: Partial<LiveActivityState>) => {
    if (!isAvailable || !LiveActivityModule || !isActive) {
      return;
    }

    try {
      const elapsed = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
        : 0;

      await LiveActivityModule.updateWorkoutActivity({
        ...state,
        elapsedSeconds: elapsed,
      });
    } catch (error) {
      console.warn('Failed to update Live Activity:', error);
    }
  }, [isAvailable, isActive]);

  const end = useCallback(async () => {
    if (!LiveActivityModule || !isActive) {
      return;
    }

    try {
      const elapsed = startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
        : 0;

      await LiveActivityModule.endWorkoutActivity({
        elapsedSeconds: elapsed,
        // Final stats would come from workout store
      });
      setIsActive(false);
      startTimeRef.current = null;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (error) {
      console.warn('Failed to end Live Activity:', error);
    }
  }, [isActive]);

  return {
    isAvailable,
    isActive,
    start,
    update,
    end,
  };
}

/**
 * Integration with workout store example:
 *
 * ```tsx
 * function WorkoutScreen() {
 *   const { start, update, end, isAvailable } = useLiveActivity();
 *   const activeWorkout = useActiveWorkout();
 *   const { completeSet } = useWorkoutStore();
 *
 *   // Start Live Activity when workout begins
 *   useEffect(() => {
 *     if (activeWorkout && isAvailable) {
 *       start();
 *     }
 *   }, [activeWorkout?.id, isAvailable]);
 *
 *   // Update Live Activity when set is completed
 *   const handleSetComplete = async (exerciseId: string, setId: string) => {
 *     completeSet(exerciseId, setId);
 *
 *     // Get current state
 *     const exercise = activeWorkout?.exercises.find(e => e.id === exerciseId);
 *     const set = exercise?.sets.find(s => s.id === setId);
 *
 *     await update({
 *       currentExercise: exercise?.name || '',
 *       setNumber: set?.setNumber || 1,
 *       totalSets: exercise?.sets.length || 0,
 *       weight: set?.weight || 0,
 *       reps: set?.reps || 0,
 *       totalVolume: calculateTotalVolume(activeWorkout),
 *     });
 *   };
 *
 *   // End Live Activity when workout ends
 *   const handleEndWorkout = async () => {
 *     await end();
 *     // ... rest of end workout logic
 *   };
 * }
 * ```
 */
