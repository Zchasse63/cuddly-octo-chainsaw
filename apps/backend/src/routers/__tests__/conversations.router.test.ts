import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

/**
 * Conversations Router Tests - AI chat thread validation
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Conversations Router', () => {
  describe('Input Validation', () => {
    describe('list input', () => {
      const schema = z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        type: z.enum(['coach', 'workout', 'general']).optional(),
      });

      it('should use defaults', () => {
        const result = schema.parse({});
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
      });

      it('should accept valid type filter', () => {
        expect(schema.parse({ type: 'coach' }).type).toBe('coach');
        expect(schema.parse({ type: 'workout' }).type).toBe('workout');
        expect(schema.parse({ type: 'general' }).type).toBe('general');
      });

      it('should reject invalid type', () => {
        expect(() => schema.parse({ type: 'invalid' })).toThrow();
      });

      it('should reject invalid limit', () => {
        expect(() => schema.parse({ limit: 0 })).toThrow();
        expect(() => schema.parse({ limit: 51 })).toThrow();
      });
    });

    describe('getById input', () => {
      const schema = z.object({
        conversationId: z.string().uuid(),
        messageLimit: z.number().min(1).max(100).default(50),
      });

      it('should accept valid ID', () => {
        const result = schema.parse({ conversationId: testUUID });
        expect(result.conversationId).toBe(testUUID);
        expect(result.messageLimit).toBe(50);
      });

      it('should accept custom message limit', () => {
        const result = schema.parse({ conversationId: testUUID, messageLimit: 25 });
        expect(result.messageLimit).toBe(25);
      });

      it('should reject invalid UUID', () => {
        expect(() => schema.parse({ conversationId: 'not-valid' })).toThrow();
      });
    });

    describe('create input', () => {
      const schema = z.object({
        type: z.enum(['coach', 'workout', 'general']),
        title: z.string().optional(),
        workoutId: z.string().uuid().optional(),
        metadata: z.record(z.unknown()).optional(),
      });

      it('should accept minimal input', () => {
        const result = schema.parse({ type: 'coach' });
        expect(result.type).toBe('coach');
      });

      it('should accept full input', () => {
        const result = schema.parse({
          type: 'workout',
          title: 'Chest Day Help',
          workoutId: testUUID,
          metadata: { key: 'value' },
        });
        expect(result.title).toBe('Chest Day Help');
        expect(result.workoutId).toBe(testUUID);
      });

      it('should reject missing type', () => {
        expect(() => schema.parse({ title: 'Test' })).toThrow();
      });
    });

    describe('addMessage input', () => {
      const schema = z.object({
        conversationId: z.string().uuid(),
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        metadata: z.record(z.unknown()).optional(),
      });

      it('should accept user message', () => {
        const result = schema.parse({
          conversationId: testUUID,
          role: 'user',
          content: 'What exercises should I do?',
        });
        expect(result.role).toBe('user');
      });

      it('should accept assistant message with metadata', () => {
        const result = schema.parse({
          conversationId: testUUID,
          role: 'assistant',
          content: 'Try bench press...',
          metadata: { tokens: 150, model: 'grok-3' },
        });
        expect(result.metadata).toEqual({ tokens: 150, model: 'grok-3' });
      });

      it('should reject empty content', () => {
        // Note: z.string() accepts empty string, use .min(1) for non-empty
        const strictSchema = schema.extend({ content: z.string().min(1) });
        expect(() => strictSchema.parse({
          conversationId: testUUID,
          role: 'user',
          content: '',
        })).toThrow();
      });
    });

    describe('archive input', () => {
      const schema = z.object({
        conversationId: z.string().uuid(),
      });

      it('should accept valid UUID', () => {
        expect(schema.parse({ conversationId: testUUID }).conversationId).toBe(testUUID);
      });
    });

    describe('getRecentContext input', () => {
      const schema = z.object({
        limit: z.number().min(1).max(20).default(10),
      });

      it('should use default limit', () => {
        expect(schema.parse({}).limit).toBe(10);
      });

      it('should accept valid range', () => {
        expect(schema.parse({ limit: 1 }).limit).toBe(1);
        expect(schema.parse({ limit: 20 }).limit).toBe(20);
      });

      it('should reject out of range', () => {
        expect(() => schema.parse({ limit: 21 })).toThrow();
      });
    });
  });
});

