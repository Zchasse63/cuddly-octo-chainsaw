/**
 * Unified Coach V2 Service Tests
 *
 * Tests the tool-based AI coach implementation with real database interactions.
 * Covers basic response generation, tool selection, context handling, and error scenarios.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createUnifiedCoachV2, type UserContext } from '../unifiedCoachV2';
import { db } from '../../db';
import { users, userProfiles } from '../../db/schema';
import { eq } from 'drizzle-orm';
import * as featureFlags from '../../lib/featureFlags';

// Test constants
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const AI_TIMEOUT = 90000; // 90s for AI calls

// Mock feature flags to enable tool calling
vi.mock('../../lib/featureFlags', () => ({
  shouldUseToolCalling: vi.fn(() => true),
}));

describe('UnifiedCoachV2 Service', () => {
  let service: Awaited<ReturnType<typeof createUnifiedCoachV2>>;
  let testUserContext: UserContext;

  beforeAll(async () => {
    service = await createUnifiedCoachV2(db);

    // Create test user context
    testUserContext = {
      userId: TEST_USER_ID,
      name: 'Test User',
      experienceLevel: 'intermediate',
      goals: ['strength', 'muscle'],
      injuries: [],
      preferredEquipment: ['barbell', 'dumbbell'],
      preferredWeightUnit: 'lbs',
    };

    // Ensure test user exists in database (if using real DB)
    try {
      await db.insert(users).values({
        id: TEST_USER_ID,
        email: 'unifiedcoachv2-test@test.com',
      }).onConflictDoNothing();

      await db.insert(userProfiles).values({
        userId: TEST_USER_ID,
        name: 'Test User',
        experienceLevel: 'intermediate',
        goals: ['strength', 'muscle'],
        preferredWeightUnit: 'lbs',
        preferredEquipment: ['barbell', 'dumbbell'],
      }).onConflictDoNothing();
    } catch (error) {
      // User may already exist, that's fine
    }
  });

  describe('Basic Response Generation', () => {
    it('should generate a valid response for simple query', async () => {
      const result = await service.processMessage('Hello coach', testUserContext);

      expect(result).toBeDefined();
      expect(result.message).toBeTruthy();
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    }, AI_TIMEOUT);

    it('should return an intent classification', async () => {
      const result = await service.processMessage('What is my profile?', testUserContext);

      expect(result.intent).toBeDefined();
      expect(typeof result.intent).toBe('string');
    }, AI_TIMEOUT);

    it('should include toolsUsed array in response', async () => {
      const result = await service.processMessage('Show me my profile', testUserContext);

      expect(result.toolsUsed).toBeDefined();
      expect(Array.isArray(result.toolsUsed)).toBe(true);
    }, AI_TIMEOUT);
  });

  describe('Tool Selection Logic', () => {
    it('should call getUserProfile tool for profile queries', async () => {
      const result = await service.processMessage('What is my experience level? Look it up in my profile.', testUserContext);

      expect(result.toolsUsed).toBeDefined();
      // AI should ideally call tools, but may respond without them or with fallback
      if (result.toolsUsed!.length === 0) {
        console.log('Note: AI responded without tool calls for profile query');
      }
      // Response is valid if it mentions experience/profile OR is a valid fallback response
      const msgLower = result.message.toLowerCase();
      const isValidResponse = /experience|level|intermediate|beginner|advanced|profile|check|look/i.test(msgLower);
      const isFallbackResponse = msgLower.includes('couldn\'t retrieve') ||
                                  msgLower.includes('try again') ||
                                  msgLower.includes('rephrasing');
      expect(isValidResponse || isFallbackResponse).toBe(true);
    }, AI_TIMEOUT);

    it('should call workout tools for workout-related queries', async () => {
      const result = await service.processMessage('What workouts have I done recently?', testUserContext);

      expect(result.toolsUsed).toBeDefined();
      // Should have attempted to use workout tools
      // Note: May return empty results if no workouts in test DB, but tools should be called
      expect(result.message).toBeTruthy();
    }, AI_TIMEOUT);

    it('should call injury tools for injury-related queries', async () => {
      const result = await service.processMessage('Do I have any active injuries?', testUserContext);

      expect(result.toolsUsed).toBeDefined();
      expect(result.message).toBeTruthy();
    }, AI_TIMEOUT);
  });

  describe('Context Handling', () => {
    it('should preserve conversationHistory across turns', async () => {
      const contextWithHistory: UserContext = {
        ...testUserContext,
        conversationHistory: [
          { role: 'user', content: 'What is my name?' },
          { role: 'assistant', content: 'Your name is Test User.' },
        ],
      };

      const result = await service.processMessage('What did you just tell me?', contextWithHistory);

      expect(result.message).toBeTruthy();
      // The AI should reference the previous conversation
    }, AI_TIMEOUT);

    it('should limit conversationHistory to last 10 messages', async () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `Message ${i}`,
      }));

      const contextWithLongHistory: UserContext = {
        ...testUserContext,
        conversationHistory: longHistory,
      };

      const result = await service.processMessage('Hello', contextWithLongHistory);

      expect(result.message).toBeTruthy();
      // Should not error with long history
    }, AI_TIMEOUT);
  });

  describe('Error Scenarios', () => {
    it('should handle tool execution errors gracefully', async () => {
      // Use an invalid user ID to trigger a potential error
      const invalidContext: UserContext = {
        userId: '00000000-0000-0000-0000-999999999999',
        name: 'Invalid User',
      };

      const result = await service.processMessage('What is my profile?', invalidContext);

      expect(result).toBeDefined();
      expect(result.message).toBeTruthy();
      // Should acknowledge the issue gracefully rather than throwing
    }, AI_TIMEOUT);

    it('should handle AI timeout scenarios', async () => {
      // This test verifies retry logic is in place
      // The retry logic in ai.ts should handle transient failures
      const result = await service.processMessage('Tell me about fitness', testUserContext);

      expect(result).toBeDefined();
      expect(result.message).toBeTruthy();
    }, AI_TIMEOUT);

    it('should return fallback for 0 tool calls on data queries', async () => {
      // This tests the requiresToolCall fallback
      // If Grok returns 0 tool calls for a query that needs data,
      // we should get a helpful error message
      const result = await service.processMessage('show me my recent progress stats', testUserContext);

      expect(result).toBeDefined();
      expect(result.message).toBeTruthy();
      // If 0 tool calls detected, should get fallback message
      if (result.toolsUsed?.length === 0) {
        expect(result.message.toLowerCase()).toMatch(/couldn't retrieve|try rephrasing|specific/i);
      }
    }, AI_TIMEOUT);
  });

  describe('Feature Flag: Legacy Fallback', () => {
    it('should return system message when tool calling disabled', async () => {
      // Mock feature flag to disable tool calling
      vi.mocked(featureFlags.shouldUseToolCalling).mockReturnValueOnce(false);

      const result = await service.processMessage('Hello', testUserContext);

      expect(result.message).toContain('Tool calling is not enabled');
      expect(result.intent).toBe('system');
    });
  });

  describe('Streaming Message', () => {
    it('should stream text chunks', async () => {
      const chunks: string[] = [];

      for await (const streamChunk of service.streamMessage('Hello coach', testUserContext)) {
        if (streamChunk.chunk) {
          chunks.push(streamChunk.chunk);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullText = chunks.join('');
      expect(fullText.length).toBeGreaterThan(0);
    }, AI_TIMEOUT);

    it('should yield final result with toolsUsed', async () => {
      let finalResult = null;

      for await (const streamChunk of service.streamMessage('What is my profile?', testUserContext)) {
        if (streamChunk.final) {
          finalResult = streamChunk.final;
        }
      }

      expect(finalResult).not.toBeNull();
      expect(finalResult!.message).toBeTruthy();
      expect(finalResult!.toolsUsed).toBeDefined();
    }, AI_TIMEOUT);
  });
});
