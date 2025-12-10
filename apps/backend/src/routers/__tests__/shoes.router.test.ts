import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Shoes Router Tests - Running shoe tracking validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Shoes Router', () => {
  describe('Input Validation', () => {
    describe('addShoe input', () => {
      const schema = z.object({
        brand: z.string().min(1).max(50),
        model: z.string().min(1).max(100),
        nickname: z.string().optional(),
        purchaseDate: z.string().optional(),
        initialMileage: z.number().min(0).default(0),
        maxMileage: z.number().min(100).max(1000).default(500),
        shoeType: z.enum(['road', 'trail', 'track', 'racing']).default('road'),
        notes: z.string().optional(),
      });

      it('should accept minimal shoe', () => {
        const result = schema.parse({
          brand: 'Nike',
          model: 'Pegasus 40',
        });
        expect(result.brand).toBe('Nike');
        expect(result.maxMileage).toBe(500);
      });

      it('should accept full shoe data', () => {
        const result = schema.parse({
          brand: 'ASICS',
          model: 'Novablast 4',
          nickname: 'Daily Trainer',
          purchaseDate: '2024-01-15',
          initialMileage: 0,
          maxMileage: 400,
          shoeType: 'road',
          notes: 'Comfortable for long runs',
        });
        expect(result.nickname).toBe('Daily Trainer');
        expect(result.shoeType).toBe('road');
      });

      it('should accept trail shoes', () => {
        const result = schema.parse({
          brand: 'Salomon',
          model: 'Speedcross 6',
          shoeType: 'trail',
        });
        expect(result.shoeType).toBe('trail');
      });

      it('should reject empty brand', () => {
        expect(() => schema.parse({ brand: '', model: 'Test' })).toThrow();
      });

      it('should reject invalid max mileage', () => {
        expect(() => schema.parse({
          brand: 'Nike',
          model: 'Test',
          maxMileage: 50,
        })).toThrow();
      });
    });

    describe('updateShoe input', () => {
      const schema = z.object({
        shoeId: z.string().uuid(),
        nickname: z.string().optional(),
        maxMileage: z.number().min(100).max(1000).optional(),
        isRetired: z.boolean().optional(),
        retireReason: z.string().optional(),
        notes: z.string().optional(),
      });

      it('should accept update', () => {
        const result = schema.parse({
          shoeId: testUUID,
          maxMileage: 600,
        });
        expect(result.maxMileage).toBe(600);
      });

      it('should accept retirement', () => {
        const result = schema.parse({
          shoeId: testUUID,
          isRetired: true,
          retireReason: 'Worn out - hole in toe box',
        });
        expect(result.isRetired).toBe(true);
      });
    });

    describe('logMileage input', () => {
      const schema = z.object({
        shoeId: z.string().uuid(),
        distance: z.number().positive(),
        distanceUnit: z.enum(['mi', 'km']).default('mi'),
        activityId: z.string().uuid().optional(),
        date: z.string().optional(),
      });

      it('should accept mileage log', () => {
        const result = schema.parse({
          shoeId: testUUID,
          distance: 5.5,
        });
        expect(result.distance).toBe(5.5);
        expect(result.distanceUnit).toBe('mi');
      });

      it('should accept km', () => {
        const result = schema.parse({
          shoeId: testUUID,
          distance: 10,
          distanceUnit: 'km',
        });
        expect(result.distanceUnit).toBe('km');
      });

      it('should link to activity', () => {
        const result = schema.parse({
          shoeId: testUUID,
          distance: 6.2,
          activityId: testUUID,
        });
        expect(result.activityId).toBe(testUUID);
      });

      it('should reject zero distance', () => {
        expect(() => schema.parse({
          shoeId: testUUID,
          distance: 0,
        })).toThrow();
      });
    });

    describe('setDefaultShoe input', () => {
      const schema = z.object({
        shoeId: z.string().uuid(),
        activityType: z.enum(['road', 'trail', 'track', 'treadmill']).optional(),
      });

      it('should set global default', () => {
        const result = schema.parse({ shoeId: testUUID });
        expect(result.activityType).toBeUndefined();
      });

      it('should set activity-specific default', () => {
        const result = schema.parse({
          shoeId: testUUID,
          activityType: 'trail',
        });
        expect(result.activityType).toBe('trail');
      });
    });

    describe('getShoeStats input', () => {
      const schema = z.object({
        shoeId: z.string().uuid(),
      });

      it('should accept valid UUID', () => {
        expect(schema.parse({ shoeId: testUUID }).shoeId).toBe(testUUID);
      });
    });
  });

  describe('Business Logic', () => {
    describe('Shoe Health Calculation', () => {
      function calculateShoeHealth(currentMileage: number, maxMileage: number): {
        healthPercent: number;
        status: 'good' | 'worn' | 'replace';
      } {
        const healthPercent = Math.max(0, 100 - (currentMileage / maxMileage) * 100);
        let status: 'good' | 'worn' | 'replace';
        
        if (healthPercent > 30) status = 'good';
        else if (healthPercent > 10) status = 'worn';
        else status = 'replace';
        
        return { healthPercent: Math.round(healthPercent), status };
      }

      it('should report good health for new shoes', () => {
        const result = calculateShoeHealth(50, 500);
        expect(result.status).toBe('good');
        expect(result.healthPercent).toBe(90);
      });

      it('should report worn for high mileage', () => {
        const result = calculateShoeHealth(400, 500);
        expect(result.status).toBe('worn');
        expect(result.healthPercent).toBe(20);
      });

      it('should report replace for very high mileage', () => {
        const result = calculateShoeHealth(480, 500);
        expect(result.status).toBe('replace');
      });

      it('should not go negative', () => {
        const result = calculateShoeHealth(600, 500);
        expect(result.healthPercent).toBe(0);
      });
    });
  });
});

