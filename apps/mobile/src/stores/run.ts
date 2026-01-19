import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface ActiveRun {
  id: string;
  startedAt: Date;
  coordinates: Coordinate[];
  distance: number;
  duration: number;
  status: 'running' | 'paused';
}

interface RunState {
  activeRun: ActiveRun | null;
  runHistory: Array<{
    id: string;
    startedAt: Date;
    distance: number;
    duration: number;
  }>;
  startRun: () => void;
  pauseRun: () => void;
  endRun: () => void;
  addCoordinate: (coord: Coordinate) => void;
  updateStats: (distance: number, duration: number) => void;
  resetRun: () => void;
}

export const useRunStore = create<RunState>()(
  persist(
    (set) => ({
      activeRun: null,
      runHistory: [],

      startRun: () =>
        set({
          activeRun: {
            id: `run-${Date.now()}`,
            startedAt: new Date(),
            coordinates: [],
            distance: 0,
            duration: 0,
            status: 'running',
          },
        }),

      pauseRun: () =>
        set((state) => {
          if (!state.activeRun) return state;
          return {
            activeRun: {
              ...state.activeRun,
              status: 'paused',
            },
          };
        }),

      endRun: () =>
        set((state) => {
          if (!state.activeRun) return state;
          return {
            activeRun: null,
            runHistory: [
              {
                id: state.activeRun.id,
                startedAt: state.activeRun.startedAt,
                distance: state.activeRun.distance,
                duration: state.activeRun.duration,
              },
              ...state.runHistory.slice(0, 9),
            ],
          };
        }),

      addCoordinate: (coord) =>
        set((state) => {
          if (!state.activeRun) return state;
          return {
            activeRun: {
              ...state.activeRun,
              coordinates: [...state.activeRun.coordinates, coord],
            },
          };
        }),

      updateStats: (distance, duration) =>
        set((state) => {
          if (!state.activeRun) return state;
          return {
            activeRun: {
              ...state.activeRun,
              distance,
              duration,
            },
          };
        }),

      resetRun: () => set({ activeRun: null }),
    }),
    {
      name: 'run-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
