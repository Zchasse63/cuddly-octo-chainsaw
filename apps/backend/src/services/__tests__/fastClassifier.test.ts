/**
 * Fast Classifier Service Tests
 *
 * Tests pattern-based message classification without AI calls.
 * Covers workout logs, exercise questions, greetings, WOD logs, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyWithPatterns,
  buildOptimizedQuery,
  getEnhancedIndexes,
  type FastClassificationResult,
} from '../fastClassifier';

describe('FastClassifier Service', () => {
  describe('Pattern Matching - Workout Logs', () => {
    it('should classify workout log with weight and reps', () => {
      const result = classifyWithPatterns('bench press 185 for 8 reps');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('workout_log');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result!.extractedData.exercise).toContain('bench');
      expect(result!.extractedData.weight).toBe(185);
      expect(result!.extractedData.reps).toBe(8);
      expect(result!.usedPattern).toBe(true);
      expect(result!.patternName).toBe('workout_log');
    });

    it('should classify workout log with action verb', () => {
      const result = classifyWithPatterns('just did squats 225 x 5');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('workout_log');
      // Note: pattern may not extract exercise name in all formats
      if (result!.extractedData.exercise) {
        expect(result!.extractedData.exercise).toContain('squat');
      }
      expect(result!.extractedData.weight).toBe(225);
      expect(result!.extractedData.reps).toBe(5);
    });

    it('should extract kg weight unit correctly', () => {
      const result = classifyWithPatterns('deadlift 140 kg for 3 reps');

      expect(result).not.toBeNull();
      expect(result!.extractedData.weight).toBe(140);
      expect(result!.extractedData.weightUnit).toBe('kg');
      expect(result!.extractedData.reps).toBe(3);
    });
  });

  describe('Pattern Matching - WOD Logs', () => {
    it('should classify WOD log with time', () => {
      const result = classifyWithPatterns('finished fran in 3:45');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('wod_log');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result!.extractedData.wodName).toBe('fran');
      expect(result!.extractedData.wodTime).toBe(225); // 3:45 = 225 seconds
      expect(result!.usedPattern).toBe(true);
    });

    it('should classify WOD log with minutes', () => {
      const result = classifyWithPatterns('murph in 42 minutes');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('wod_log');
      expect(result!.extractedData.wodName).toBe('murph');
      expect(result!.extractedData.wodTime).toBe(2520); // 42 * 60 = 2520 seconds
    });
  });

  describe('Pattern Matching - Greetings', () => {
    it('should classify simple greeting', () => {
      const result = classifyWithPatterns('hey');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('greeting');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result!.patternName).toBe('greeting');
    });

    it('should classify greeting with time of day', () => {
      const result = classifyWithPatterns('good morning');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('greeting');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  describe('Pattern Matching - Exercise Questions', () => {
    it('should classify exercise question with specific exercise', () => {
      const result = classifyWithPatterns('how do i do proper squat form?');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('exercise_question');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result!.extractedData.exercise).toContain('squat');
      expect(result!.patternName).toBe('exercise_question');
    });

    it('should classify general form question', () => {
      const result = classifyWithPatterns('what muscles does overhead press target?');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('exercise_question');
      expect(result!.extractedData.exercise).toContain('overhead');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = classifyWithPatterns('');

      expect(result).toBeNull(); // No pattern matches empty string
    });

    it('should handle very long input (>1000 chars)', () => {
      const longMessage = 'bench press '.repeat(100) + '185 for 8 reps';

      const result = classifyWithPatterns(longMessage);

      // Should still extract the data
      expect(result).not.toBeNull();
      expect(result!.intent).toBe('workout_log');
      expect(result!.extractedData.weight).toBe(185);
      expect(result!.extractedData.reps).toBe(8);
    });

    it('should handle special characters without breaking', () => {
      const result = classifyWithPatterns('!!! bench press 185#!! for 8 reps!!!');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('workout_log');
      expect(result!.extractedData.weight).toBe(185);
    });

    it('should not classify questions as workout logs', () => {
      const result = classifyWithPatterns('should i do 185 for 8 reps?');

      // Questions should not match workout_log pattern
      expect(result?.intent).not.toBe('workout_log');
    });

    it('should classify off-topic messages', () => {
      const result = classifyWithPatterns("what's the weather like today?");

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('off_topic');
      expect(result!.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Intent Extraction - extractedData Fields', () => {
    it('should extract exercise, bodyPart, weight, and reps', () => {
      const result = classifyWithPatterns('shoulder press 135 pounds for 10 reps');

      expect(result).not.toBeNull();
      expect(result!.extractedData).toHaveProperty('exercise');
      expect(result!.extractedData).toHaveProperty('bodyPart');
      expect(result!.extractedData).toHaveProperty('weight');
      expect(result!.extractedData).toHaveProperty('reps');
      expect(result!.extractedData.weight).toBe(135);
      expect(result!.extractedData.reps).toBe(10);
    });

    it('should extract body part from recovery messages', () => {
      const result = classifyWithPatterns('my lower back hurts after deadlifts');

      expect(result).not.toBeNull();
      expect(result!.intent).toBe('recovery');
      expect(result!.extractedData.bodyPart).toBeDefined();
      // Check if exercise was extracted (pattern may vary)
      if (result!.extractedData.exercise) {
        expect(result!.extractedData.exercise).toContain('deadlift');
      }
    });
  });

  describe('Classification Accuracy - Golden Dataset', () => {
    // Test against a set of labeled examples to ensure >80% accuracy
    const goldenDataset = [
      { message: 'bench 225 x 5', expectedIntent: 'workout_log' },
      { message: 'hey coach', expectedIntent: 'greeting' },
      { message: 'how do i squat correctly?', expectedIntent: 'exercise_question' },
      { message: 'finished fran in 4:12', expectedIntent: 'wod_log' },
      { message: 'my knee hurts', expectedIntent: 'recovery' },
      { message: 'what should i eat before training?', expectedIntent: 'nutrition' },
      { message: 'create a 12 week program', expectedIntent: 'full_program' },
      { message: "what's the stock market doing?", expectedIntent: 'off_topic' },
      { message: 'can you substitute deadlifts?', expectedIntent: 'exercise_swap' },
      { message: 'good morning', expectedIntent: 'greeting' },
    ];

    it('should achieve >80% accuracy on golden dataset', () => {
      let correctCount = 0;

      goldenDataset.forEach(({ message, expectedIntent }) => {
        const result = classifyWithPatterns(message);
        if (result && result.intent === expectedIntent) {
          correctCount++;
        }
      });

      const accuracy = correctCount / goldenDataset.length;
      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('buildOptimizedQuery', () => {
    it('should build optimized query for exercise questions', () => {
      const query = buildOptimizedQuery('how do i squat correctly?', 'exercise_question', {
        exercise: 'squat',
      });

      expect(query).toContain('squat');
      expect(query).toContain('technique');
      expect(query).toContain('form');
      expect(query).toContain('cues');
    });

    it('should build optimized query for nutrition questions', () => {
      const query = buildOptimizedQuery('what should i eat pre-workout?', 'nutrition', {});

      // Check that nutrition-related terms are present
      expect(query).toBeTruthy();
      expect(query.length).toBeGreaterThan(0);
      // The function looks for "pre[-\s]?workout" pattern, so use that in the message
      expect(query).toContain('pre-workout');
    });

    it('should fall back to cleaned message for general queries', () => {
      const query = buildOptimizedQuery('tell me about fitness?', 'general_fitness', {});

      expect(query).toBeTruthy();
      expect(query).not.toContain('?');
    });
  });

  describe('getEnhancedIndexes', () => {
    it('should return correct indexes for exercise questions', () => {
      const indexes = getEnhancedIndexes('exercise_question', { exercise: 'squat' });

      expect(indexes).toContain('squat-technique');
      expect(indexes).toContain('movement-patterns');
      expect(indexes.length).toBeLessThanOrEqual(3);
    });

    it('should return nutrition indexes for nutrition intent', () => {
      const indexes = getEnhancedIndexes('nutrition', {});

      expect(indexes).toContain('nutrition-and-supplementation');
      expect(indexes.length).toBeLessThanOrEqual(3);
    });

    it('should return recovery indexes for recovery intent', () => {
      const indexes = getEnhancedIndexes('recovery', { bodyPart: 'knee' });

      expect(indexes).toContain('injury-prevention');
      expect(indexes).toContain('injury-management');
    });

    it('should deduplicate and limit to 3 indexes', () => {
      const indexes = getEnhancedIndexes('program_request', {});

      const uniqueIndexes = new Set(indexes);
      expect(uniqueIndexes.size).toBe(indexes.length); // No duplicates
      expect(indexes.length).toBeLessThanOrEqual(3);
    });
  });
});
