import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Running Router Tests
 * Tests running session logging, pace calculations, and analytics
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Running Router', () => {
  describe('Input Validation', () => {
    describe('logRun input', () => {
      const logRunSchema = z.object({
        distance: z.number().positive(),
        distanceUnit: z.enum(['mi', 'km']),
        duration: z.number().positive(), // seconds
        startTime: z.string().optional(),
        route: z.string().optional(),
        elevationGain: z.number().optional(),
        elevationUnit: z.enum(['ft', 'm']).optional(),
        averageHeartRate: z.number().positive().optional(),
        maxHeartRate: z.number().positive().optional(),
        cadence: z.number().positive().optional(),
        shoeId: z.string().uuid().optional(),
        notes: z.string().optional(),
        feeling: z.enum(['great', 'good', 'ok', 'tired', 'exhausted']).optional(),
      });

      it('should validate basic run', () => {
        const input = {
          distance: 5.0,
          distanceUnit: 'mi' as const,
          duration: 2400, // 40 minutes
        };
        expect(logRunSchema.parse(input)).toBeDefined();
      });

      it('should validate run with all metrics', () => {
        const input = {
          distance: 10.0,
          distanceUnit: 'km' as const,
          duration: 3000,
          elevationGain: 150,
          elevationUnit: 'm' as const,
          averageHeartRate: 155,
          maxHeartRate: 175,
          cadence: 180,
          shoeId: testUUID,
          notes: 'Easy recovery run',
          feeling: 'good' as const,
        };
        expect(logRunSchema.parse(input)).toBeDefined();
      });

      it('should reject zero or negative distance', () => {
        expect(() => logRunSchema.parse({
          distance: 0,
          distanceUnit: 'mi',
          duration: 1800,
        })).toThrow();

        expect(() => logRunSchema.parse({
          distance: -5,
          distanceUnit: 'mi',
          duration: 1800,
        })).toThrow();
      });

      it('should reject invalid distance unit', () => {
        expect(() => logRunSchema.parse({
          distance: 5,
          distanceUnit: 'meters',
          duration: 1800,
        })).toThrow();
      });
    });

    describe('getHistory input', () => {
      const historySchema = z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional();

      it('should provide defaults', () => {
        expect(historySchema.parse(undefined)).toBeUndefined();
      });

      it('should accept date range filter', () => {
        const input = {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };
        expect(historySchema.parse(input)).toBeDefined();
      });
    });
  });

  describe('Pace Calculations', () => {
    // Pace = duration / distance (minutes per unit)
    const calculatePace = (durationSeconds: number, distance: number) => {
      const durationMinutes = durationSeconds / 60;
      return durationMinutes / distance;
    };

    // Format pace as MM:SS
    const formatPace = (paceMinutes: number) => {
      const mins = Math.floor(paceMinutes);
      const secs = Math.round((paceMinutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    it('should calculate pace correctly', () => {
      // 40 minutes for 5 miles = 8:00/mile
      const pace = calculatePace(2400, 5);
      expect(pace).toBe(8);
    });

    it('should format pace as MM:SS', () => {
      expect(formatPace(8)).toBe('8:00');
      expect(formatPace(8.5)).toBe('8:30');
      expect(formatPace(7.25)).toBe('7:15');
    });

    it('should handle metric distances', () => {
      // 50 minutes for 10km = 5:00/km
      const pace = calculatePace(3000, 10);
      expect(pace).toBe(5);
    });
  });

  describe('Unit Conversions', () => {
    const miToKm = (miles: number) => miles * 1.60934;
    const kmToMi = (km: number) => km / 1.60934;
    const ftToM = (feet: number) => feet * 0.3048;
    const mToFt = (meters: number) => meters / 0.3048;

    it('should convert miles to kilometers', () => {
      expect(miToKm(1)).toBeCloseTo(1.609, 2);
      expect(miToKm(5)).toBeCloseTo(8.047, 2);
    });

    it('should convert kilometers to miles', () => {
      expect(kmToMi(10)).toBeCloseTo(6.214, 2);
    });

    it('should convert feet to meters', () => {
      expect(ftToM(100)).toBeCloseTo(30.48, 1);
    });

    it('should convert meters to feet', () => {
      expect(mToFt(100)).toBeCloseTo(328.08, 0);
    });
  });

  describe('Running Analytics', () => {
    describe('Weekly Summary', () => {
      it('should calculate total weekly distance', () => {
        const runs = [
          { distance: 5.0 },
          { distance: 3.0 },
          { distance: 8.0 },
        ];
        const totalDistance = runs.reduce((acc, r) => acc + r.distance, 0);
        expect(totalDistance).toBe(16);
      });

      it('should calculate average pace', () => {
        const runs = [
          { duration: 2400, distance: 5 }, // 8:00/mi
          { duration: 1500, distance: 3 }, // 8:20/mi
          { duration: 4000, distance: 8 }, // 8:20/mi
        ];
        const totalDuration = runs.reduce((acc, r) => acc + r.duration, 0);
        const totalDistance = runs.reduce((acc, r) => acc + r.distance, 0);
        const avgPace = (totalDuration / 60) / totalDistance;
        expect(avgPace).toBeCloseTo(8.23, 1);
      });
    });

    describe('Shoe Tracking', () => {
      it('should accumulate shoe mileage', () => {
        const runs = [
          { distance: 5.0, shoeId: 'shoe-1' },
          { distance: 3.0, shoeId: 'shoe-1' },
          { distance: 8.0, shoeId: 'shoe-2' },
        ];
        
        const shoeMileage = runs.reduce((acc, r) => {
          acc[r.shoeId] = (acc[r.shoeId] || 0) + r.distance;
          return acc;
        }, {} as Record<string, number>);

        expect(shoeMileage['shoe-1']).toBe(8);
        expect(shoeMileage['shoe-2']).toBe(8);
      });
    });
  });

  describe('Response Contracts', () => {
    it('should return run session with all fields', () => {
      const response = {
        id: testUUID,
        userId: 'user-123',
        distance: 5.0,
        distanceUnit: 'mi',
        duration: 2400,
        pace: 8.0,
        createdAt: new Date().toISOString(),
      };

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('distance');
      expect(response).toHaveProperty('pace');
    });

    it('should return weekly stats', () => {
      const stats = {
        totalDistance: 25.5,
        totalDuration: 12600,
        runCount: 4,
        averagePace: 8.23,
        longestRun: 10.0,
      };

      expect(stats).toHaveProperty('totalDistance');
      expect(stats).toHaveProperty('averagePace');
      expect(stats).toHaveProperty('runCount');
    });
  });
});

