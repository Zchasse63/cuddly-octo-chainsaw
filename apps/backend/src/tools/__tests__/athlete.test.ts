/**
 * Athlete Tools Structure Tests
 *
 * Tests tool definitions, structure, and count verification.
 * For tool execution tests with real data, see tools-comprehensive.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getAllAthleteTools, ATHLETE_TOOL_COUNT } from '../athlete';
import { db } from '../../db';
import type { ToolContext } from '../context';

// Real context for structure tests
const athleteContext: ToolContext = {
  db,
  userId: 'structure-test-athlete',
  userRole: 'premium',
};

describe('Athlete Tools', () => {

  describe('getAllAthleteTools', () => {
    it('should return all 35 athlete tools', () => {
      const tools = getAllAthleteTools();
      const toolCount = Object.keys(tools).length;

      expect(toolCount).toBe(ATHLETE_TOOL_COUNT);
      expect(toolCount).toBe(35);
    });

    it('should include profile tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getUserProfile).toBeDefined();
      expect(tools.getUserPreferences).toBeDefined();
      expect(tools.getActiveInjuries).toBeDefined();
      expect(tools.getUserStreaks).toBeDefined();
      expect(tools.getUserBadges).toBeDefined();
    });

    it('should include workout tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getTodaysWorkout).toBeDefined();
      expect(tools.getRecentWorkouts).toBeDefined();
      expect(tools.getExerciseHistory).toBeDefined();
      expect(tools.getPersonalRecords).toBeDefined();
      expect(tools.logWorkoutSet).toBeDefined();
      expect(tools.getActiveWorkout).toBeDefined();
      expect(tools.searchExercises).toBeDefined();
      expect(tools.getExerciseSubstitutes).toBeDefined();
    });

    it('should include program tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getActiveProgram).toBeDefined();
      expect(tools.getProgramProgress).toBeDefined();
      expect(tools.getUpcomingWorkouts).toBeDefined();
      expect(tools.getProgramWeek).toBeDefined();
    });

    it('should include health tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getReadinessScore).toBeDefined();
      expect(tools.getHealthMetrics).toBeDefined();
      expect(tools.getSleepData).toBeDefined();
      expect(tools.getDailySummary).toBeDefined();
      expect(tools.getFatigueScore).toBeDefined();
      expect(tools.getNutritionLog).toBeDefined();
    });

    it('should include running tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getRecentRuns).toBeDefined();
      expect(tools.getRunningPRs).toBeDefined();
      expect(tools.getRunningStats).toBeDefined();
      expect(tools.getShoeMileage).toBeDefined();
    });

    it('should include injury tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getInjuryHistory).toBeDefined();
      expect(tools.getInjuryRiskAssessment).toBeDefined();
      expect(tools.getExercisesToAvoid).toBeDefined();
    });

    it('should include knowledge tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.searchKnowledgeBase).toBeDefined();
      expect(tools.getExerciseFormTips).toBeDefined();
      expect(tools.getTrainingPrinciples).toBeDefined();
    });

    it('should include analytics tools', () => {
      const tools = getAllAthleteTools();

      expect(tools.getVolumeAnalytics).toBeDefined();
      expect(tools.getProgressTrends).toBeDefined();
    });
  });

  describe('Tool Structure', () => {
    it('each tool factory should produce valid tools', () => {
      const toolFactories = getAllAthleteTools();

      for (const [name, factory] of Object.entries(toolFactories)) {
        // Factory should be a function
        expect(typeof factory).toBe('function');

        // When called with context, should produce a tool (AI SDK tool format)
        const tool = factory(athleteContext);
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        // AI SDK tools use 'inputSchema' not 'parameters'
        expect(tool.inputSchema).toBeDefined();
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });
  });
});

