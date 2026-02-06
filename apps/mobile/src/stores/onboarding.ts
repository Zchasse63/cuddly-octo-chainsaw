import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Onboarding data types
export type FitnessGoal =
  | 'build_muscle'
  | 'lose_weight'
  | 'get_stronger'
  | 'improve_endurance'
  | 'general_fitness'
  | 'sport_specific';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type TrainingFrequency = '2-3' | '3-4' | '4-5' | '5-6' | '6+';

export type ActivityType =
  | 'weight_training'
  | 'running'
  | 'crossfit'
  | 'bodyweight'
  | 'cycling'
  | 'swimming'
  | 'yoga'
  | 'other';

export type Equipment =
  | 'full_gym'
  | 'home_dumbbells'
  | 'home_barbell'
  | 'bodyweight'
  | 'resistance_bands'
  | 'kettlebells';

interface OnboardingData {
  goals: FitnessGoal[];
  experienceLevel: ExperienceLevel | null;
  trainingFrequency: TrainingFrequency | null;
  activities: ActivityType[];
  trainingDaysPerWeek: number | null;
  equipment: Equipment[];
  limitations: string;
  notificationsEnabled: boolean;
}

interface OnboardingState {
  // Current step (0-indexed)
  currentStep: number;
  totalSteps: number;

  // User selections
  data: OnboardingData;

  // Completed flag
  isCompleted: boolean;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Data setters
  setGoals: (goals: FitnessGoal[]) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setTrainingFrequency: (frequency: TrainingFrequency) => void;
  setActivities: (activities: ActivityType[]) => void;
  setTrainingDaysPerWeek: (days: number) => void;
  setEquipment: (equipment: Equipment[]) => void;
  setLimitations: (limitations: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;

  // Complete onboarding
  completeOnboarding: () => void;

  // Reset (for testing or re-onboarding)
  reset: () => void;
}

const initialData: OnboardingData = {
  goals: [],
  experienceLevel: null,
  trainingFrequency: null,
  activities: [],
  trainingDaysPerWeek: null,
  equipment: [],
  limitations: '',
  notificationsEnabled: true,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      totalSteps: 10, // 0: welcome, 1: goals, 2: activities, 3: equipment, 4: experience, 5: frequency, 6: limitations, 7: notifications, 8: voice-tutorial, 9: complete
      data: initialData,
      isCompleted: false,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, totalSteps } = get();
        if (currentStep < totalSteps - 1) {
          set({ currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      setGoals: (goals) =>
        set((state) => ({ data: { ...state.data, goals } })),

      setExperienceLevel: (experienceLevel) =>
        set((state) => ({ data: { ...state.data, experienceLevel } })),

      setTrainingFrequency: (trainingFrequency) =>
        set((state) => ({ data: { ...state.data, trainingFrequency } })),

      setActivities: (activities) =>
        set((state) => ({ data: { ...state.data, activities } })),

      setTrainingDaysPerWeek: (trainingDaysPerWeek) =>
        set((state) => ({ data: { ...state.data, trainingDaysPerWeek } })),

      setEquipment: (equipment) =>
        set((state) => ({ data: { ...state.data, equipment } })),

      setLimitations: (limitations) =>
        set((state) => ({ data: { ...state.data, limitations } })),

      setNotificationsEnabled: (notificationsEnabled) =>
        set((state) => ({ data: { ...state.data, notificationsEnabled } })),

      completeOnboarding: () => set({ isCompleted: true }),

      reset: () => set({
        currentStep: 0,
        data: initialData,
        isCompleted: false,
      }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Goal display names
export const goalLabels: Record<FitnessGoal, string> = {
  build_muscle: 'Build Muscle',
  lose_weight: 'Lose Weight',
  get_stronger: 'Get Stronger',
  improve_endurance: 'Improve Endurance',
  general_fitness: 'General Fitness',
  sport_specific: 'Sport-Specific Training',
};

// Experience level display names
export const experienceLevelLabels: Record<ExperienceLevel, { label: string; description: string }> = {
  beginner: {
    label: 'Beginner',
    description: 'New to fitness or returning after a long break',
  },
  intermediate: {
    label: 'Intermediate',
    description: '1-3 years of consistent training',
  },
  advanced: {
    label: 'Advanced',
    description: '3+ years with solid technique and programming knowledge',
  },
};

// Training frequency display names
export const frequencyLabels: Record<TrainingFrequency, string> = {
  '2-3': '2-3 days per week',
  '3-4': '3-4 days per week',
  '4-5': '4-5 days per week',
  '5-6': '5-6 days per week',
  '6+': '6+ days per week',
};

// Activity type display names
export const activityTypeLabels: Record<ActivityType, string> = {
  weight_training: 'Weight Training',
  running: 'Running',
  crossfit: 'CrossFit',
  bodyweight: 'Bodyweight',
  cycling: 'Cycling',
  swimming: 'Swimming',
  yoga: 'Yoga',
  other: 'Other',
};

// Equipment display names
export const equipmentLabels: Record<Equipment, string> = {
  full_gym: 'Full Gym Access',
  home_dumbbells: 'Home Dumbbells',
  home_barbell: 'Home Barbell Setup',
  bodyweight: 'Bodyweight Only',
  resistance_bands: 'Resistance Bands',
  kettlebells: 'Kettlebells',
};
