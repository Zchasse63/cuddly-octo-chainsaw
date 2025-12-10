import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * WODs Router Tests - CrossFit/functional workout validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('WODs Router', () => {
  describe('Input Validation', () => {
    describe('getWod input', () => {
      const schema = z.object({
        date: z.string().optional(),
        type: z.enum(['hero', 'girl', 'benchmark', 'daily']).optional(),
      });

      it('should accept empty for today', () => {
        expect(schema.parse({}).date).toBeUndefined();
      });

      it('should accept specific date', () => {
        expect(schema.parse({ date: '2024-01-15' }).date).toBe('2024-01-15');
      });

      it('should accept WOD type filter', () => {
        expect(schema.parse({ type: 'hero' }).type).toBe('hero');
        expect(schema.parse({ type: 'girl' }).type).toBe('girl');
      });
    });

    describe('logWodResult input', () => {
      const schema = z.object({
        wodId: z.string().uuid(),
        resultType: z.enum(['time', 'rounds', 'reps', 'weight', 'completed']),
        timeSeconds: z.number().positive().optional(),
        rounds: z.number().min(0).optional(),
        reps: z.number().min(0).optional(),
        weight: z.number().positive().optional(),
        rxed: z.boolean().default(false),
        scaled: z.object({
          movements: z.array(z.string()).optional(),
          weights: z.record(z.number()).optional(),
        }).optional(),
        notes: z.string().optional(),
      });

      it('should accept time-based result', () => {
        const result = schema.parse({
          wodId: testUUID,
          resultType: 'time',
          timeSeconds: 540, // 9 minutes
          rxed: true,
        });
        expect(result.timeSeconds).toBe(540);
        expect(result.rxed).toBe(true);
      });

      it('should accept AMRAP result', () => {
        const result = schema.parse({
          wodId: testUUID,
          resultType: 'rounds',
          rounds: 8,
          reps: 15,
          rxed: false,
          scaled: {
            movements: ['pull-ups -> ring rows'],
            weights: { 'deadlift': 135 },
          },
        });
        expect(result.rounds).toBe(8);
        expect(result.scaled?.movements).toContain('pull-ups -> ring rows');
      });

      it('should accept max weight result', () => {
        const result = schema.parse({
          wodId: testUUID,
          resultType: 'weight',
          weight: 225,
          notes: 'New 1RM clean',
        });
        expect(result.weight).toBe(225);
      });
    });

    describe('searchWods input', () => {
      const schema = z.object({
        query: z.string().optional(),
        type: z.enum(['hero', 'girl', 'benchmark', 'daily', 'custom']).optional(),
        movements: z.array(z.string()).optional(),
        timeCapMin: z.number().min(1).optional(),
        timeCapMax: z.number().max(60).optional(),
        limit: z.number().min(1).max(50).default(20),
      });

      it('should accept search query', () => {
        const result = schema.parse({ query: 'Fran' });
        expect(result.query).toBe('Fran');
      });

      it('should accept movement filter', () => {
        const result = schema.parse({
          movements: ['thrusters', 'pull-ups'],
        });
        expect(result.movements).toContain('thrusters');
      });

      it('should accept time cap range', () => {
        const result = schema.parse({
          timeCapMin: 10,
          timeCapMax: 20,
        });
        expect(result.timeCapMin).toBe(10);
      });
    });

    describe('createCustomWod input', () => {
      const schema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        wodType: z.enum(['for_time', 'amrap', 'emom', 'tabata', 'max_effort', 'chipper']),
        timeCap: z.number().positive().optional(),
        rounds: z.number().positive().optional(),
        movements: z.array(z.object({
          name: z.string(),
          reps: z.number().optional(),
          weight: z.number().optional(),
          weightUnit: z.enum(['lbs', 'kg']).optional(),
          distance: z.number().optional(),
          distanceUnit: z.enum(['m', 'ft', 'mi', 'km']).optional(),
        })),
        isPublic: z.boolean().default(false),
      });

      it('should accept for-time WOD', () => {
        const result = schema.parse({
          name: 'Custom Fran',
          wodType: 'for_time',
          movements: [
            { name: 'Thrusters', reps: 21, weight: 95, weightUnit: 'lbs' },
            { name: 'Pull-ups', reps: 21 },
            { name: 'Thrusters', reps: 15, weight: 95, weightUnit: 'lbs' },
            { name: 'Pull-ups', reps: 15 },
            { name: 'Thrusters', reps: 9, weight: 95, weightUnit: 'lbs' },
            { name: 'Pull-ups', reps: 9 },
          ],
        });
        expect(result.wodType).toBe('for_time');
        expect(result.movements.length).toBe(6);
      });

      it('should accept AMRAP', () => {
        const result = schema.parse({
          name: 'Cindy',
          wodType: 'amrap',
          timeCap: 20,
          movements: [
            { name: 'Pull-ups', reps: 5 },
            { name: 'Push-ups', reps: 10 },
            { name: 'Air Squats', reps: 15 },
          ],
        });
        expect(result.timeCap).toBe(20);
      });

      it('should accept EMOM', () => {
        const result = schema.parse({
          name: 'EMOM 12',
          wodType: 'emom',
          timeCap: 12,
          rounds: 12,
          movements: [
            { name: 'Power Cleans', reps: 3, weight: 135, weightUnit: 'lbs' },
          ],
        });
        expect(result.wodType).toBe('emom');
      });
    });

    describe('compareResults input', () => {
      const schema = z.object({
        wodId: z.string().uuid(),
        compareWith: z.enum(['self', 'friends', 'global']).default('self'),
      });

      it('should accept comparison request', () => {
        const result = schema.parse({ wodId: testUUID });
        expect(result.compareWith).toBe('self');
      });

      it('should accept global comparison', () => {
        const result = schema.parse({
          wodId: testUUID,
          compareWith: 'global',
        });
        expect(result.compareWith).toBe('global');
      });
    });
  });
});

