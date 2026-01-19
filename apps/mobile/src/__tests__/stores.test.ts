import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfileStore, convertWeight } from '../stores/profile';
import { useWorkoutStore } from '../stores/workout';
import { useOnboardingStore } from '../stores/onboarding';

describe('Zustand Stores', () => {
  describe('Profile Store', () => {
    beforeEach(() => {
      useProfileStore.setState({
        profile: null,
        stats: null,
        isLoading: false,
        isUpdating: false,
      });
    });

    it('should initialize with null profile', () => {
      const state = useProfileStore.getState();
      expect(state.profile).toBeNull();
      expect(state.stats).toBeNull();
    });

    it('should set profile', () => {
      const mockProfile = {
        id: '1',
        userId: 'user1',
        name: 'John',
        email: 'john@example.com',
        avatarUrl: null,
        experienceLevel: 'intermediate',
        goals: ['muscle_gain'],
        trainingFrequency: '4-5',
        preferredEquipment: ['barbell'],
        injuries: null,
        tier: 'pro' as const,
        theme: 'light' as const,
        preferredWeightUnit: 'lb' as const,
        preferredDistanceUnit: 'mi' as const,
        notificationsEnabled: true,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useProfileStore.getState().setProfile(mockProfile);
      expect(useProfileStore.getState().profile).toEqual(mockProfile);
    });

    it('should update profile fields', () => {
      const mockProfile = {
        id: '1',
        userId: 'user1',
        name: 'John',
        email: 'john@example.com',
        avatarUrl: null,
        experienceLevel: 'intermediate',
        goals: ['muscle_gain'],
        trainingFrequency: '4-5',
        preferredEquipment: ['barbell'],
        injuries: null,
        tier: 'pro' as const,
        theme: 'light' as const,
        preferredWeightUnit: 'lb' as const,
        preferredDistanceUnit: 'mi' as const,
        notificationsEnabled: true,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useProfileStore.getState().setProfile(mockProfile);
      useProfileStore.getState().updateProfile({ name: 'Jane' });

      const updated = useProfileStore.getState().profile;
      expect(updated?.name).toBe('Jane');
    });

    it('should set weight unit', () => {
      const mockProfile = {
        id: '1',
        userId: 'user1',
        name: 'John',
        email: 'john@example.com',
        avatarUrl: null,
        experienceLevel: 'intermediate',
        goals: [],
        trainingFrequency: null,
        preferredEquipment: [],
        injuries: null,
        tier: 'free' as const,
        theme: 'light' as const,
        preferredWeightUnit: 'lb' as const,
        preferredDistanceUnit: 'mi' as const,
        notificationsEnabled: true,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useProfileStore.getState().setProfile(mockProfile);
      useProfileStore.getState().setWeightUnit('kg');

      expect(useProfileStore.getState().profile?.preferredWeightUnit).toBe('kg');
    });

    it('should clear profile', () => {
      const mockProfile = {
        id: '1',
        userId: 'user1',
        name: 'John',
        email: 'john@example.com',
        avatarUrl: null,
        experienceLevel: 'intermediate',
        goals: [],
        trainingFrequency: null,
        preferredEquipment: [],
        injuries: null,
        tier: 'free' as const,
        theme: 'light' as const,
        preferredWeightUnit: 'lb' as const,
        preferredDistanceUnit: 'mi' as const,
        notificationsEnabled: true,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useProfileStore.getState().setProfile(mockProfile);
      useProfileStore.getState().clearProfile();

      expect(useProfileStore.getState().profile).toBeNull();
      expect(useProfileStore.getState().stats).toBeNull();
    });
  });

  describe('Weight Conversion', () => {
    it('should convert kg to lb', () => {
      const result = convertWeight(100, 'kg', 'lb');
      expect(result).toBeCloseTo(220.462, 1);
    });

    it('should convert lb to kg', () => {
      const result = convertWeight(220.462, 'lb', 'kg');
      expect(result).toBeCloseTo(100, 1);
    });

    it('should return same value for same units', () => {
      expect(convertWeight(100, 'kg', 'kg')).toBe(100);
      expect(convertWeight(100, 'lb', 'lb')).toBe(100);
    });
  });

  describe('Workout Store', () => {
    beforeEach(() => {
      useWorkoutStore.setState({
        activeWorkout: null,
        isWorkoutActive: false,
        restTimerSeconds: 0,
        restTimerRunning: false,
        restTimerTarget: 90,
        recentWorkouts: [],
        selectedExerciseId: null,
      });
    });

    it('should start a workout', () => {
      useWorkoutStore.getState().startWorkout({ name: 'Chest Day' });

      const state = useWorkoutStore.getState();
      expect(state.isWorkoutActive).toBe(true);
      expect(state.activeWorkout?.name).toBe('Chest Day');
    });

    it('should set rest timer target', () => {
      useWorkoutStore.getState().setRestTimerTarget(120);

      expect(useWorkoutStore.getState().restTimerTarget).toBe(120);
    });

    it('should start rest timer', () => {
      useWorkoutStore.getState().startRestTimer(60);

      const state = useWorkoutStore.getState();
      expect(state.restTimerRunning).toBe(true);
      expect(state.restTimerSeconds).toBe(60);
    });

    it('should tick rest timer', () => {
      useWorkoutStore.getState().startRestTimer(5);

      useWorkoutStore.getState().tickRestTimer();

      expect(useWorkoutStore.getState().restTimerSeconds).toBe(4);
    });

    it('should stop rest timer', () => {
      useWorkoutStore.getState().startRestTimer(60);
      useWorkoutStore.getState().stopRestTimer();

      expect(useWorkoutStore.getState().restTimerRunning).toBe(false);
    });
  });

  describe('Onboarding Store', () => {
    beforeEach(() => {
      useOnboardingStore.setState({
        currentStep: 0,
        totalSteps: 10,
        data: {
          goals: [],
          experienceLevel: 'beginner',
          trainingFrequency: '3-4',
          activities: ['weight_training'],
          trainingDaysPerWeek: 4,
          equipment: [],
          limitations: '',
          notificationsEnabled: true,
        },
        isCompleted: false,
      });
    });

    it('should initialize at step 0', () => {
      expect(useOnboardingStore.getState().currentStep).toBe(0);
    });

    it('should move to next step', () => {
      useOnboardingStore.getState().nextStep();
      expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('should move to previous step', () => {
      useOnboardingStore.getState().setStep(2);
      useOnboardingStore.getState().prevStep();
      expect(useOnboardingStore.getState().currentStep).toBe(1);
    });

    it('should set goals', () => {
      useOnboardingStore.getState().setGoals(['build_muscle', 'get_stronger']);

      expect(useOnboardingStore.getState().data.goals).toEqual([
        'build_muscle',
        'get_stronger',
      ]);
    });

    it('should complete onboarding', () => {
      useOnboardingStore.getState().completeOnboarding();
      expect(useOnboardingStore.getState().isCompleted).toBe(true);
    });

    it('should reset onboarding', () => {
      useOnboardingStore.getState().setStep(5);
      useOnboardingStore.getState().completeOnboarding();
      useOnboardingStore.getState().reset();

      const state = useOnboardingStore.getState();
      expect(state.currentStep).toBe(0);
      expect(state.isCompleted).toBe(false);
    });
  });
});

