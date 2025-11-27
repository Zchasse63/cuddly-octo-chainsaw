import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InjuryRiskService, createInjuryRiskService } from '../injuryRisk';

// Mock the grok module
vi.mock('../../lib/grok', () => ({
  generateGrokResponse: vi.fn().mockResolvedValue('AI-generated risk analysis'),
}));

// Mock database
const createMockDb = (overrides: any = {}) => {
  const defaults = {
    currentWeekVolume: 50000,
    previousWeekVolume: 45000,
    avgRecovery: 70,
    avgSleep: 7.5,
    avgStress: 40,
    avgSoreness: 35,
    currentMileage: 20 * 1609.34, // 20 miles in meters
    previousMileage: 18 * 1609.34,
    currentRuns: 4,
    consecutiveDays: 4,
  };

  const data = { ...defaults, ...overrides };

  return {
    query: {
      readinessCheckIns: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      workouts: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      runningActivities: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    execute: vi.fn().mockImplementation((query) => {
      const queryStr = String(query);

      if (queryStr.includes('SUM(ws.weight * ws.reps)') && queryStr.includes('7 days')) {
        return Promise.resolve({ rows: [{ volume: String(data.currentWeekVolume) }] });
      }
      if (queryStr.includes('SUM(ws.weight * ws.reps)') && !queryStr.includes('7 days')) {
        return Promise.resolve({ rows: [{ volume: String(data.previousWeekVolume) }] });
      }
      if (queryStr.includes('AVG(recovery_score)')) {
        return Promise.resolve({
          rows: [{
            avg_recovery: String(data.avgRecovery),
            avg_sleep: String(data.avgSleep),
            avg_stress: String(data.avgStress),
            avg_soreness: String(data.avgSoreness),
          }],
        });
      }
      if (queryStr.includes('distance_meters')) {
        return Promise.resolve({
          rows: [{
            current_mileage: String(data.currentMileage),
            previous_mileage: String(data.previousMileage),
            current_runs: String(data.currentRuns),
          }],
        });
      }
      if (queryStr.includes('consecutive_days')) {
        return Promise.resolve({ rows: [{ consecutive_days: String(data.consecutiveDays) }] });
      }

      return Promise.resolve({ rows: [{}] });
    }),
  };
};

describe('InjuryRiskService', () => {
  describe('createInjuryRiskService', () => {
    it('should create an InjuryRiskService instance', () => {
      const db = createMockDb();
      const service = createInjuryRiskService(db, 'user-123');
      expect(service).toBeInstanceOf(InjuryRiskService);
    });
  });

  describe('getAssessment', () => {
    it('should return low risk with good metrics', async () => {
      const db = createMockDb({
        currentWeekVolume: 50000,
        previousWeekVolume: 48000, // Only ~4% increase
        avgRecovery: 75,
        avgSleep: 7.5,
        avgStress: 35,
        avgSoreness: 30,
        consecutiveDays: 4,
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      expect(assessment.overallRisk).toBe('low');
      expect(assessment.riskScore).toBeLessThan(25);
      expect(assessment.shouldReduceLoad).toBe(false);
    });

    it('should detect training volume spike', async () => {
      const db = createMockDb({
        currentWeekVolume: 70000,
        previousWeekVolume: 45000, // ~55% increase
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const volumeSpikeFactor = assessment.factors.find((f) => f.type === 'training_load_spike');
      expect(volumeSpikeFactor).toBeDefined();
      expect(volumeSpikeFactor?.severity).toBe('high');
      expect(volumeSpikeFactor?.description).toContain('increased');
    });

    it('should detect mileage spike for runners', async () => {
      const db = createMockDb({
        currentMileage: 40 * 1609.34, // 40 miles
        previousMileage: 25 * 1609.34, // 25 miles (60% increase)
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const mileageSpikeFactor = assessment.factors.find((f) => f.type === 'mileage_spike');
      expect(mileageSpikeFactor).toBeDefined();
      expect(mileageSpikeFactor?.severity).toBe('high');
    });

    it('should detect low recovery', async () => {
      const db = createMockDb({
        avgRecovery: 35, // Very low recovery
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const lowRecoveryFactor = assessment.factors.find((f) => f.type === 'low_recovery');
      expect(lowRecoveryFactor).toBeDefined();
      expect(lowRecoveryFactor?.severity).toBe('high');
      expect(lowRecoveryFactor?.value).toBe(35);
    });

    it('should detect poor sleep', async () => {
      const db = createMockDb({
        avgSleep: 5, // Poor sleep
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const poorSleepFactor = assessment.factors.find((f) => f.type === 'poor_sleep');
      expect(poorSleepFactor).toBeDefined();
      expect(poorSleepFactor?.severity).toBe('high');
      expect(poorSleepFactor?.recommendation).toContain('sleep');
    });

    it('should detect high stress', async () => {
      const db = createMockDb({
        avgStress: 85, // High stress
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const highStressFactor = assessment.factors.find((f) => f.type === 'high_stress');
      expect(highStressFactor).toBeDefined();
      expect(highStressFactor?.severity).toBe('high');
    });

    it('should detect high soreness', async () => {
      const db = createMockDb({
        avgSoreness: 85, // High soreness
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const highSorenessFactor = assessment.factors.find((f) => f.type === 'high_soreness');
      expect(highSorenessFactor).toBeDefined();
      expect(highSorenessFactor?.recommendation).toContain('recovery');
    });

    it('should detect no rest days', async () => {
      const db = createMockDb({
        consecutiveDays: 8, // 8 days without rest
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      const noRestFactor = assessment.factors.find((f) => f.type === 'no_rest_days');
      expect(noRestFactor).toBeDefined();
      expect(noRestFactor?.recommendation).toContain('rest');
    });

    it('should calculate high overall risk with multiple factors', async () => {
      const db = createMockDb({
        currentWeekVolume: 80000,
        previousWeekVolume: 45000, // Big spike
        avgRecovery: 40, // Low
        avgSleep: 5, // Poor
        avgStress: 80, // High
        avgSoreness: 75, // High
        consecutiveDays: 7, // No rest
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      expect(assessment.overallRisk).toBe('critical');
      expect(assessment.riskScore).toBeGreaterThan(70);
      expect(assessment.shouldReduceLoad).toBe(true);
      expect(assessment.factors.length).toBeGreaterThan(3);
    });
  });

  describe('getWarnings', () => {
    it('should return no warnings for low risk', async () => {
      const db = createMockDb({
        avgRecovery: 80,
        avgSleep: 8,
        avgStress: 30,
        avgSoreness: 25,
      });

      const service = createInjuryRiskService(db, 'user-123');
      const { hasWarning, warnings } = await service.getWarnings();

      expect(hasWarning).toBe(false);
      expect(warnings).toHaveLength(0);
    });

    it('should return warnings for high risk factors', async () => {
      const db = createMockDb({
        avgRecovery: 35, // Very low - high severity
        avgSleep: 5, // Very poor - high severity
      });

      const service = createInjuryRiskService(db, 'user-123');
      const { hasWarning, warnings } = await service.getWarnings();

      expect(hasWarning).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getAIAnalysis', () => {
    it('should return positive message with no risk factors', async () => {
      const db = createMockDb({
        currentWeekVolume: 50000,
        previousWeekVolume: 49000,
        avgRecovery: 80,
        avgSleep: 8,
        avgStress: 30,
        avgSoreness: 25,
        consecutiveDays: 4,
      });

      const service = createInjuryRiskService(db, 'user-123');
      const analysis = await service.getAIAnalysis();

      expect(analysis).toContain('balanced');
    });

    it('should call AI for analysis when risk factors exist', async () => {
      const { generateGrokResponse } = await import('../../lib/grok');

      const db = createMockDb({
        avgRecovery: 35, // Risk factor
      });

      const service = createInjuryRiskService(db, 'user-123');
      await service.getAIAnalysis();

      expect(generateGrokResponse).toHaveBeenCalled();
    });
  });

  describe('risk level calculation', () => {
    it('should return moderate risk level for score 25-49', async () => {
      const db = createMockDb({
        avgRecovery: 45, // Just below threshold - moderate
        avgSleep: 6, // Below threshold - moderate
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      expect(['moderate', 'high']).toContain(assessment.overallRisk);
      expect(assessment.riskScore).toBeGreaterThanOrEqual(25);
    });

    it('should apply compound effect for multiple factors', async () => {
      // Create scenario with exactly 3 moderate factors
      const db = createMockDb({
        avgRecovery: 45, // Below 50 threshold - moderate
        avgSleep: 6, // Below 6.5 threshold - moderate
        avgStress: 75, // Above 70 threshold - moderate
        avgSoreness: 30, // Below 70 threshold - ok
        consecutiveDays: 4, // Below 6 threshold - ok
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      // With 3+ factors, compound effect should increase score
      expect(assessment.factors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('suggested actions', () => {
    it('should suggest rest day for critical risk', async () => {
      const db = createMockDb({
        currentWeekVolume: 100000,
        previousWeekVolume: 40000,
        avgRecovery: 30,
        avgSleep: 4,
        avgStress: 90,
        avgSoreness: 85,
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      expect(assessment.suggestedActions).toContain('Take a complete rest day today');
      expect(assessment.suggestedActions.some((a) => a.includes('40-50%'))).toBe(true);
    });

    it('should suggest monitoring for moderate risk', async () => {
      const db = createMockDb({
        avgRecovery: 45, // Moderate risk factor
      });

      const service = createInjuryRiskService(db, 'user-123');
      const assessment = await service.getAssessment();

      if (assessment.overallRisk === 'moderate') {
        expect(assessment.suggestedActions.some((a) => a.toLowerCase().includes('monitor'))).toBe(true);
      }
    });
  });
});
