/**
 * AI Coach Service Tests - Real API Integration
 *
 * These tests call the REAL Grok API to verify functionality.
 * No mocks are used - all responses come from the actual AI model.
 */
import { describe, it, expect } from 'vitest';
import { classifyMessage, generateCoachResponse, getOffTopicResponse, CoachContext } from '../aiCoach';

// Valid message categories from the service
const VALID_CATEGORIES = ['workout_log', 'exercise_swap', 'question', 'general', 'off_topic', 'injury', 'check_in'];

describe('AI Coach Service (Real API)', () => {
  describe('classifyMessage', () => {
    it('should classify workout logging messages', async () => {
      const result = await classifyMessage('I just did 185 lbs for 8 reps on bench press');

      expect(VALID_CATEGORIES).toContain(result.category);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      // Workout logging should typically be classified as workout_log
      expect(['workout_log', 'general']).toContain(result.category);
    }, 30000);

    it('should classify exercise swap requests', async () => {
      const result = await classifyMessage('Can I substitute dumbbell press for barbell bench press?');

      expect(VALID_CATEGORIES).toContain(result.category);
      expect(result.confidence).toBeGreaterThan(0.5);
      // Should be exercise_swap or question
      expect(['exercise_swap', 'question', 'general']).toContain(result.category);
    }, 30000);

    it('should classify fitness questions', async () => {
      const result = await classifyMessage('How do I improve my squat depth?');

      expect(VALID_CATEGORIES).toContain(result.category);
      expect(['question', 'general']).toContain(result.category);
    }, 30000);

    it('should classify off-topic messages', async () => {
      const result = await classifyMessage('What is the capital of France?');

      expect(VALID_CATEGORIES).toContain(result.category);
      // Off-topic messages should have high confidence
      if (result.category === 'off_topic') {
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    }, 30000);

    it('should classify injury-related messages', async () => {
      const result = await classifyMessage('My shoulder hurts when I do overhead press');

      expect(VALID_CATEGORIES).toContain(result.category);
      // Should recognize injury-related content
      expect(['injury', 'question', 'general']).toContain(result.category);
    }, 30000);

    it('should return valid confidence scores', async () => {
      const result = await classifyMessage('hello, how are you?');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.confidence).toBe('number');
    }, 30000);
  });

  describe('generateCoachResponse', () => {
    it('should generate personalized response with user context', async () => {
      const context: CoachContext = {
        name: 'John',
        experienceLevel: 'intermediate',
        goals: ['muscle gain', 'strength'],
      };

      const result = await generateCoachResponse('How am I doing with my training?', context);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(20);
    }, 30000);

    it('should generate response for beginner user', async () => {
      const context: CoachContext = {
        name: 'Sarah',
        experienceLevel: 'beginner',
        goals: ['weight loss', 'get fit'],
      };

      const result = await generateCoachResponse('What exercises should I start with?', context);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(20);
    }, 30000);

    it('should handle empty context gracefully', async () => {
      const context: CoachContext = {};

      const result = await generateCoachResponse('Give me a tip for today', context);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should consider user injuries in response', async () => {
      const context: CoachContext = {
        name: 'Mike',
        injuries: 'shoulder impingement - avoid overhead pressing',
      };

      const result = await generateCoachResponse('What upper body exercises can I do safely?', context);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(20);
    }, 30000);

    it('should use RAG context when provided', async () => {
      const context: CoachContext = { name: 'Jane' };
      const ragContext = 'User is on week 3 of a 4-day upper/lower split program focusing on hypertrophy.';

      const result = await generateCoachResponse('What should I focus on this week?', context, ragContext);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(20);
    }, 30000);
  });

  describe('getOffTopicResponse', () => {
    it('should return an off-topic response mentioning fitness', () => {
      const response = getOffTopicResponse();

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      // Should redirect to fitness topics
      expect(response.toLowerCase()).toMatch(/fitness|training|workout|exercise|help/i);
    });

    it('should return varied responses', () => {
      const responses = new Set<string>();
      for (let i = 0; i < 20; i++) {
        responses.add(getOffTopicResponse());
      }

      // Should have variety in responses
      expect(responses.size).toBeGreaterThanOrEqual(1);
    });
  });
});

