import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Devices Router Tests - Device registration and sync validation
 */

describe('Devices Router', () => {
  describe('Input Validation', () => {
    describe('registerDevice input', () => {
      const schema = z.object({
        deviceId: z.string(),
        deviceName: z.string().optional(),
        deviceModel: z.string().optional(),
        osName: z.enum(['ios', 'android']),
        osVersion: z.string().optional(),
        appVersion: z.string().optional(),
        pushToken: z.string().optional(),
        pushProvider: z.enum(['apns', 'fcm']).optional(),
      });

      it('should accept iOS device', () => {
        const result = schema.parse({
          deviceId: 'device-123',
          deviceName: 'iPhone 15 Pro',
          osName: 'ios',
          osVersion: '17.2',
          appVersion: '1.0.0',
        });
        expect(result.osName).toBe('ios');
      });

      it('should accept Android device', () => {
        const result = schema.parse({
          deviceId: 'device-456',
          osName: 'android',
          osVersion: '14',
        });
        expect(result.osName).toBe('android');
      });

      it('should accept push configuration', () => {
        const result = schema.parse({
          deviceId: 'device-123',
          osName: 'ios',
          pushToken: 'apns-token-xxx',
          pushProvider: 'apns',
        });
        expect(result.pushProvider).toBe('apns');
      });

      it('should reject invalid OS', () => {
        expect(() => schema.parse({
          deviceId: 'device-123',
          osName: 'windows',
        })).toThrow();
      });

      it('should reject missing deviceId', () => {
        expect(() => schema.parse({ osName: 'ios' })).toThrow();
      });
    });

    describe('updatePushToken input', () => {
      const schema = z.object({
        deviceId: z.string(),
        pushToken: z.string(),
        pushProvider: z.enum(['apns', 'fcm']),
      });

      it('should accept APNS token', () => {
        const result = schema.parse({
          deviceId: 'device-123',
          pushToken: 'apns-token',
          pushProvider: 'apns',
        });
        expect(result.pushProvider).toBe('apns');
      });

      it('should accept FCM token', () => {
        const result = schema.parse({
          deviceId: 'device-456',
          pushToken: 'fcm-token',
          pushProvider: 'fcm',
        });
        expect(result.pushProvider).toBe('fcm');
      });
    });

    describe('sync input', () => {
      const schema = z.object({
        deviceId: z.string(),
        lastSyncedAt: z.string().optional(),
        operations: z.array(z.object({
          type: z.enum(['create', 'update', 'delete']),
          table: z.string(),
          recordId: z.string(),
          data: z.record(z.unknown()).optional(),
          timestamp: z.string(),
        })),
      });

      it('should accept sync operations', () => {
        const result = schema.parse({
          deviceId: 'device-123',
          operations: [
            { type: 'create', table: 'workouts', recordId: 'w-1', data: { name: 'Test' }, timestamp: '2024-01-01T00:00:00Z' },
            { type: 'update', table: 'workouts', recordId: 'w-2', data: { status: 'completed' }, timestamp: '2024-01-01T00:01:00Z' },
          ],
        });
        expect(result.operations.length).toBe(2);
      });

      it('should accept empty operations', () => {
        const result = schema.parse({ deviceId: 'device-123', operations: [] });
        expect(result.operations).toEqual([]);
      });

      it('should reject invalid operation type', () => {
        expect(() => schema.parse({
          deviceId: 'device-123',
          operations: [
            { type: 'invalid', table: 'workouts', recordId: 'w-1', timestamp: '2024-01-01T00:00:00Z' },
          ],
        })).toThrow();
      });
    });

    describe('getOfflineQueue input', () => {
      const schema = z.object({
        deviceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      });

      it('should use default limit', () => {
        const result = schema.parse({ deviceId: 'device-123' });
        expect(result.limit).toBe(50);
      });

      it('should accept custom limit', () => {
        const result = schema.parse({ deviceId: 'device-123', limit: 25 });
        expect(result.limit).toBe(25);
      });
    });

    describe('deregisterDevice input', () => {
      const schema = z.object({
        deviceId: z.string(),
      });

      it('should accept device ID', () => {
        expect(schema.parse({ deviceId: 'device-123' }).deviceId).toBe('device-123');
      });

      it('should reject missing device ID', () => {
        expect(() => schema.parse({})).toThrow();
      });
    });
  });
});

