import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Profile types matching backend schema
export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type Theme = 'light' | 'dark' | 'system';
export type Tier = 'free' | 'pro' | 'elite';

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  experienceLevel: string | null;
  goals: string[];
  trainingFrequency: string | null;
  preferredEquipment: string[];
  injuries: string | null;
  tier: Tier;
  theme: Theme;
  preferredWeightUnit: WeightUnit;
  preferredDistanceUnit: DistanceUnit;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  totalRuns: number;
  totalDistance: number;
  currentStreak: number;
  longestStreak: number;
  prsThisMonth: number;
  badgesEarned: number;
}

interface ProfileState {
  // Profile data
  profile: UserProfile | null;
  stats: UserStats | null;

  // Loading states
  isLoading: boolean;
  isUpdating: boolean;

  // Actions
  setProfile: (profile: UserProfile) => void;
  setStats: (stats: UserStats) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Settings actions
  setWeightUnit: (unit: WeightUnit) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setTheme: (theme: Theme) => void;
  setNotificationsEnabled: (enabled: boolean) => void;

  // Utility
  clearProfile: () => void;
  setLoading: (loading: boolean) => void;
  setUpdating: (updating: boolean) => void;
}

const initialStats: UserStats = {
  totalWorkouts: 0,
  totalVolume: 0,
  totalRuns: 0,
  totalDistance: 0,
  currentStreak: 0,
  longestStreak: 0,
  prsThisMonth: 0,
  badgesEarned: 0,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      stats: null,
      isLoading: false,
      isUpdating: false,

      setProfile: (profile) => set({ profile }),

      setStats: (stats) => set({ stats }),

      updateProfile: (updates) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...updates, updatedAt: new Date().toISOString() }
            : null,
        }));
      },

      setWeightUnit: (preferredWeightUnit) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, preferredWeightUnit }
            : null,
        }));
      },

      setDistanceUnit: (preferredDistanceUnit) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, preferredDistanceUnit }
            : null,
        }));
      },

      setTheme: (theme) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, theme }
            : null,
        }));
      },

      setNotificationsEnabled: (notificationsEnabled) => {
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, notificationsEnabled }
            : null,
        }));
      },

      clearProfile: () => set({ profile: null, stats: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setUpdating: (isUpdating) => set({ isUpdating }),
    }),
    {
      name: 'profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        stats: state.stats,
      }),
    }
  )
);

// Helper hooks
export const useProfile = () => useProfileStore((state) => state.profile);
export const useUserStats = () => useProfileStore((state) => state.stats);
export const useWeightUnit = () => useProfileStore((state) => state.profile?.preferredWeightUnit || 'lb');
export const useDistanceUnit = () => useProfileStore((state) => state.profile?.preferredDistanceUnit || 'mi');

// Weight conversion utilities
export const convertWeight = (value: number, from: WeightUnit, to: WeightUnit): number => {
  if (from === to) return value;
  if (from === 'kg' && to === 'lb') return value * 2.20462;
  if (from === 'lb' && to === 'kg') return value / 2.20462;
  return value;
};

export const formatWeight = (value: number, unit: WeightUnit): string => {
  return `${Math.round(value * 10) / 10} ${unit}`;
};

// Distance conversion utilities
export const convertDistance = (meters: number, unit: DistanceUnit): number => {
  if (unit === 'km') return meters / 1000;
  if (unit === 'mi') return meters / 1609.34;
  return meters;
};

export const formatDistance = (meters: number, unit: DistanceUnit): string => {
  const value = convertDistance(meters, unit);
  return `${Math.round(value * 100) / 100} ${unit}`;
};

// Pace formatting
export const formatPace = (secondsPerKm: number, unit: DistanceUnit): string => {
  const secondsPerUnit = unit === 'mi' ? secondsPerKm * 1.60934 : secondsPerKm;
  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.round(secondsPerUnit % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${unit}`;
};

// Duration formatting
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
