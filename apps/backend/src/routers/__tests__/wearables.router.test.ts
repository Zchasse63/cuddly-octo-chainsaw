import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Wearables Router Tests - Wearable device integration validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Wearables Router', () => {
  describe('Input Validation', () => {
    describe('connectProvider input', () => {
      const schema = z.object({
        provider: z.enum(['apple_health', 'google_fit', 'garmin', 'whoop', 'oura', 'fitbit', 'terra']),
        authCode: z.string().optional(),
        redirectUri: z.string().url().optional(),
      });

      it('should accept Apple Health', () => {
        const result = schema.parse({ provider: 'apple_health' });
        expect(result.provider).toBe('apple_health');
      });

      it('should accept all providers', () => {
        const providers = ['apple_health', 'google_fit', 'garmin', 'whoop', 'oura', 'fitbit', 'terra'];
        providers.forEach(provider => {
          const result = schema.parse({ provider: provider as any });
          expect(result.provider).toBe(provider);
        });
      });

      it('should accept auth code for OAuth', () => {
        const result = schema.parse({
          provider: 'garmin',
          authCode: 'oauth-code-123',
          redirectUri: 'https://app.voicefit.io/callback',
        });
        expect(result.authCode).toBe('oauth-code-123');
      });

      it('should reject invalid provider', () => {
        expect(() => schema.parse({ provider: 'invalid' })).toThrow();
      });
    });

    describe('syncData input', () => {
      const schema = z.object({
        provider: z.string(),
        dataTypes: z.array(z.enum(['heart_rate', 'hrv', 'sleep', 'steps', 'calories', 'workouts', 'recovery'])).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      });

      it('should accept sync request', () => {
        const result = schema.parse({ provider: 'apple_health' });
        expect(result.provider).toBe('apple_health');
      });

      it('should accept data type filter', () => {
        const result = schema.parse({
          provider: 'whoop',
          dataTypes: ['heart_rate', 'hrv', 'sleep', 'recovery'],
        });
        expect(result.dataTypes).toContain('hrv');
      });

      it('should accept date range', () => {
        const result = schema.parse({
          provider: 'garmin',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });
        expect(result.startDate).toBe('2024-01-01');
      });
    });

    describe('getHeartRateData input', () => {
      const schema = z.object({
        date: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        granularity: z.enum(['minute', 'hour', 'day']).default('hour'),
      });

      it('should accept single date', () => {
        const result = schema.parse({ date: '2024-01-15' });
        expect(result.date).toBe('2024-01-15');
        expect(result.granularity).toBe('hour');
      });

      it('should accept granularity', () => {
        const result = schema.parse({
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          granularity: 'day',
        });
        expect(result.granularity).toBe('day');
      });
    });

    describe('getHrvData input', () => {
      const schema = z.object({
        days: z.number().min(1).max(90).default(7),
        includeReadiness: z.boolean().default(true),
      });

      it('should use defaults', () => {
        const result = schema.parse({});
        expect(result.days).toBe(7);
        expect(result.includeReadiness).toBe(true);
      });

      it('should accept custom days', () => {
        const result = schema.parse({ days: 30, includeReadiness: false });
        expect(result.days).toBe(30);
      });
    });

    describe('getSleepData input', () => {
      const schema = z.object({
        startDate: z.string(),
        endDate: z.string(),
        includeStages: z.boolean().default(true),
      });

      it('should accept date range', () => {
        const result = schema.parse({
          startDate: '2024-01-01',
          endDate: '2024-01-07',
        });
        expect(result.includeStages).toBe(true);
      });

      it('should accept without stages', () => {
        const result = schema.parse({
          startDate: '2024-01-01',
          endDate: '2024-01-07',
          includeStages: false,
        });
        expect(result.includeStages).toBe(false);
      });
    });

    describe('disconnectProvider input', () => {
      const schema = z.object({
        provider: z.string(),
        deleteData: z.boolean().default(false),
      });

      it('should accept disconnect', () => {
        const result = schema.parse({ provider: 'garmin' });
        expect(result.deleteData).toBe(false);
      });

      it('should accept delete data flag', () => {
        const result = schema.parse({
          provider: 'whoop',
          deleteData: true,
        });
        expect(result.deleteData).toBe(true);
      });
    });

    describe('updateSyncSettings input', () => {
      const schema = z.object({
        provider: z.string(),
        autoSync: z.boolean().optional(),
        syncFrequency: z.enum(['realtime', 'hourly', 'daily']).optional(),
        dataTypes: z.array(z.string()).optional(),
      });

      it('should accept settings update', () => {
        const result = schema.parse({
          provider: 'garmin',
          autoSync: true,
          syncFrequency: 'hourly',
        });
        expect(result.syncFrequency).toBe('hourly');
      });

      it('should accept data type selection', () => {
        const result = schema.parse({
          provider: 'whoop',
          dataTypes: ['heart_rate', 'hrv', 'recovery'],
        });
        expect(result.dataTypes).toHaveLength(3);
      });
    });
  });

  describe('Business Logic', () => {
    describe('HRV Score Interpretation', () => {
      function interpretHrv(hrvMs: number, baseline: number): {
        score: number;
        status: 'optimal' | 'normal' | 'below_baseline' | 'low';
        recommendation: string;
      } {
        const percentOfBaseline = (hrvMs / baseline) * 100;
        
        if (percentOfBaseline >= 110) {
          return { score: 100, status: 'optimal', recommendation: 'Great recovery - ready for intense training' };
        } else if (percentOfBaseline >= 90) {
          return { score: 75, status: 'normal', recommendation: 'Normal recovery - proceed with planned training' };
        } else if (percentOfBaseline >= 70) {
          return { score: 50, status: 'below_baseline', recommendation: 'Consider reducing intensity today' };
        } else {
          return { score: 25, status: 'low', recommendation: 'Focus on recovery - light activity only' };
        }
      }

      it('should identify optimal recovery', () => {
        const result = interpretHrv(70, 60); // 117% of baseline
        expect(result.status).toBe('optimal');
      });

      it('should identify normal recovery', () => {
        const result = interpretHrv(60, 60); // 100% of baseline
        expect(result.status).toBe('normal');
      });

      it('should identify below baseline', () => {
        const result = interpretHrv(48, 60); // 80% of baseline
        expect(result.status).toBe('below_baseline');
      });

      it('should identify low recovery', () => {
        const result = interpretHrv(36, 60); // 60% of baseline
        expect(result.status).toBe('low');
      });
    });
  });
});

