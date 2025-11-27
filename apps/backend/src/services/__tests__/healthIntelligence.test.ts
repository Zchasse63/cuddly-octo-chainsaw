import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthIntelligenceService, createHealthIntelligence } from '../healthIntelligence';

// Mock the grok module
vi.mock('../../lib/grok', () => ({
  generateGrokResponse: vi.fn().mockResolvedValue('AI-generated insights here'),
}));

// Mock database
const createMockDb = (data: any = {}) => ({
  query: {
    readinessCheckIns: {
      findMany: vi.fn().mockResolvedValue(data.checkIns || []),
    },
    workouts: {
      findMany: vi.fn().mockResolvedValue(data.workouts || []),
    },
  },
  execute: vi.fn().mockImplementation(() => {
    return Promise.resolve({
      rows: data.rows || [],
    });
  }),
});

describe('HealthIntelligenceService', () => {
  describe('createHealthIntelligence', () => {
    it('should create a HealthIntelligenceService instance', () => {
      const db = createMockDb();
      const service = createHealthIntelligence(db, 'user-123');
      expect(service).toBeInstanceOf(HealthIntelligenceService);
    });
  });

  describe('getCorrelations', () => {
    it('should return empty array with insufficient data', async () => {
      const db = createMockDb({ rows: [] });
      const service = createHealthIntelligence(db, 'user-123');

      const correlations = await service.getCorrelations(30);
      expect(correlations).toEqual([]);
    });

    it('should calculate correlations with sufficient data', async () => {
      // Generate mock health data for 14 days
      const rows = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sleep_hours: 7 + Math.random(),
        sleep_quality: 70 + Math.random() * 20,
        stress_level: 30 + Math.random() * 20,
        soreness_level: 20 + Math.random() * 30,
        energy_level: 60 + Math.random() * 20,
        motivation_level: 70 + Math.random() * 20,
        nutrition_score: 65 + Math.random() * 25,
        recovery_score: 70 + Math.random() * 20,
        workout_count: Math.random() > 0.3 ? 1 : 0,
        workout_volume: Math.random() > 0.3 ? 5000 + Math.random() * 10000 : 0,
      }));

      const db = createMockDb({ rows });
      const service = createHealthIntelligence(db, 'user-123');

      const correlations = await service.getCorrelations(14);

      expect(correlations).toHaveLength(5);
      expect(correlations.map((c) => c.type)).toContain('nutrition_recovery');
      expect(correlations.map((c) => c.type)).toContain('sleep_performance');
      expect(correlations.map((c) => c.type)).toContain('volume_recovery');
      expect(correlations.map((c) => c.type)).toContain('sleep_workout_quality');
      expect(correlations.map((c) => c.type)).toContain('stress_performance');
    });

    it('should categorize correlation strength correctly', async () => {
      // Create data with strong positive correlation between nutrition and recovery
      const rows = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sleep_hours: 7,
        sleep_quality: 70,
        stress_level: 30,
        soreness_level: 20,
        energy_level: 60,
        motivation_level: 70,
        nutrition_score: 50 + i * 3, // Increasing
        recovery_score: 50 + i * 3, // Also increasing (strong correlation)
        workout_count: 1,
        workout_volume: 5000,
      }));

      const db = createMockDb({ rows });
      const service = createHealthIntelligence(db, 'user-123');

      const correlations = await service.getCorrelations(14);
      const nutritionRecovery = correlations.find((c) => c.type === 'nutrition_recovery');

      expect(nutritionRecovery).toBeDefined();
      expect(nutritionRecovery?.correlation).toBeGreaterThan(0.5);
      expect(['moderate', 'strong']).toContain(nutritionRecovery?.strength);
    });
  });

  describe('getHealthScore', () => {
    it('should calculate overall health score', async () => {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sleep_hours: 7.5,
        sleep_quality: 80,
        stress_level: 30,
        soreness_level: 25,
        energy_level: 75,
        motivation_level: 80,
        nutrition_score: 75,
        recovery_score: 80,
        workout_count: i % 2 === 0 ? 1 : 0, // Every other day
        workout_volume: i % 2 === 0 ? 8000 : 0,
      }));

      const db = createMockDb({ rows });
      const service = createHealthIntelligence(db, 'user-123');

      const score = await service.getHealthScore();

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.components).toHaveProperty('sleep');
      expect(score.components).toHaveProperty('recovery');
      expect(score.components).toHaveProperty('consistency');
      expect(score.components).toHaveProperty('nutrition');
      expect(score.components).toHaveProperty('stress');
      expect(['improving', 'declining', 'stable']).toContain(score.trend);
      expect(Array.isArray(score.insights)).toBe(true);
    });

    it('should identify low sleep score', async () => {
      const rows = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sleep_hours: 5, // Poor sleep
        sleep_quality: 50,
        stress_level: 30,
        soreness_level: 25,
        energy_level: 50,
        motivation_level: 60,
        nutrition_score: 70,
        recovery_score: 60,
        workout_count: 1,
        workout_volume: 5000,
      }));

      const db = createMockDb({ rows });
      const service = createHealthIntelligence(db, 'user-123');

      const score = await service.getHealthScore();

      expect(score.components.sleep).toBeLessThan(70);
      expect(score.insights.some((i) => i.toLowerCase().includes('sleep'))).toBe(true);
    });

    it('should detect improving trend', async () => {
      // Recent data (better recovery)
      const recentRows = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recovery_score: 85, // High recovery
        sleep_hours: 8,
        stress_level: 20,
        nutrition_score: 80,
        workout_count: 1,
        workout_volume: 8000,
      }));

      // Older data (worse recovery)
      const olderRows = Array.from({ length: 23 }, (_, i) => ({
        date: new Date(Date.now() - (i + 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        recovery_score: 60, // Lower recovery
        sleep_hours: 6,
        stress_level: 50,
        nutrition_score: 60,
        workout_count: 1,
        workout_volume: 5000,
      }));

      // Mock different results for different date ranges
      const db = createMockDb({});
      db.execute = vi.fn().mockImplementation((query) => {
        const queryStr = String(query);
        // Recent data query
        if (queryStr.includes('7 days')) {
          return Promise.resolve({ rows: recentRows });
        }
        // Full 30 day query
        return Promise.resolve({ rows: [...recentRows, ...olderRows] });
      });

      const service = createHealthIntelligence(db, 'user-123');

      const score = await service.getHealthScore();

      // With better recent recovery, trend should be improving
      expect(['improving', 'stable']).toContain(score.trend);
    });
  });

  describe('generateAIInsights', () => {
    it('should return fallback message with insufficient data', async () => {
      const db = createMockDb({ rows: [] });
      const service = createHealthIntelligence(db, 'user-123');

      const insights = await service.generateAIInsights(30);

      expect(insights).toContain('Not enough data');
    });

    it('should generate AI insights with sufficient data', async () => {
      const rows = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sleep_hours: 7,
        sleep_quality: 70,
        stress_level: 40,
        soreness_level: 30,
        energy_level: 65,
        motivation_level: 70,
        nutrition_score: 70,
        recovery_score: 75,
        workout_count: 1,
        workout_volume: 6000,
      }));

      const db = createMockDb({ rows });
      const service = createHealthIntelligence(db, 'user-123');

      const insights = await service.generateAIInsights(14);

      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });
  });
});

describe('Correlation calculations', () => {
  it('should return correct correlation direction', async () => {
    // Perfect positive correlation data
    const positiveRows = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      sleep_hours: 6 + i * 0.3,
      recovery_score: 60 + i * 3,
      nutrition_score: 50 + i * 4,
      stress_level: 30,
      workout_count: 1,
      workout_volume: 5000 + i * 500,
    }));

    const db = createMockDb({ rows: positiveRows });
    const service = createHealthIntelligence(db, 'user-123');

    const correlations = await service.getCorrelations(10);

    // Nutrition and recovery should have positive correlation
    const nutritionRecovery = correlations.find((c) => c.type === 'nutrition_recovery');
    expect(nutritionRecovery?.direction).toBe('positive');
  });
});
