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

export type ActivityType = 'strength' | 'running' | 'hybrid';

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
  activityType: ActivityType | null;
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
  setActivityType: (type: ActivityType) => void;
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
  activityType: null,
  equipment: [],
  limitations: '',
  notificationsEnabled: true,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      totalSteps: 8, // 0: welcome, 1: goals, 2: experience, 3: frequency, 4: activities, 5: equipment, 6: limitations, 7: notifications
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

      setActivityType: (activityType) =>
        set((state) => ({ data: { ...state.data, activityType } })),

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
export const activityTypeLabels: Record<ActivityType, { label: string; description: string; icon: string }> = {
  strength: {
    label: 'Strength Training',
    description: 'Focus on weightlifting and resistance training',
    icon: 'dumbbell',
  },
  running: {
    label: 'Running',
    description: 'Focus on cardio and running activities',
    icon: 'run',
  },
  hybrid: {
    label: 'Hybrid Athlete',
    description: 'Combine strength training and running',
    icon: 'activity',
  },
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
