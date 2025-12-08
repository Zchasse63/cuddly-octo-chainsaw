/**
 * Voice Parser Service Tests - Real API Integration
 *
 * These tests use REAL Grok API for voice command parsing.
 * No mocks - all AI responses come from actual API calls.
 *
 * TEST QUALITY CRITERIA:
 * - Tests verify ACTUAL PARSED VALUES, not just structure
 * - Tests require high confidence (>0.7) for clear commands
 * - Tests verify the AI correctly understands workout terminology
 */
import { describe, it, expect } from 'vitest';
import { parseVoiceCommand, generateConfirmation, VoiceParseResult } from '../voiceParser';
import { generateCompletion, TEMPERATURES } from '../../lib/ai';

describe('VoiceParser (Real API)', () => {
  describe('parseVoiceCommand - Real Grok API', () => {
    it('should correctly parse bench press with weight and reps', async () => {
      const result = await parseVoiceCommand('I did 185 pounds bench press for 8 reps');

      // Verify ACTUAL VALUES, not just structure
      expect(result.exercise_name?.toLowerCase()).toContain('bench');
      expect(result.weight).toBe(185);
      expect(result.weight_unit).toBe('lbs');
      expect(result.reps).toBe(8);
      expect(result.confidence).toBeGreaterThan(0.7); // Should be confident
    }, 30000);

    it('should correctly parse squat with weight and reps', async () => {
      const result = await parseVoiceCommand('squat 225 for 5 reps');

      expect(result.exercise_name?.toLowerCase()).toContain('squat');
      expect(result.weight).toBe(225);
      expect(result.reps).toBe(5);
      expect(result.confidence).toBeGreaterThan(0.7);
    }, 30000);

    it('should correctly parse deadlift with pounds specified', async () => {
      const result = await parseVoiceCommand('deadlift 315 pounds for 3 reps');

      expect(result.exercise_name?.toLowerCase()).toContain('deadlift');
      expect(result.weight).toBe(315);
      expect(result.weight_unit).toBe('lbs');
      expect(result.reps).toBe(3);
      expect(result.confidence).toBeGreaterThan(0.7);
    }, 30000);

    it('should handle partial data - reps only, no weight', async () => {
      const result = await parseVoiceCommand('I did squats for 10 reps');

      expect(result.exercise_name?.toLowerCase()).toContain('squat');
      expect(result.reps).toBe(10);
      expect(result.weight).toBeNull(); // No weight mentioned
      expect(result.confidence).toBeGreaterThan(0.5); // Lower confidence is ok for partial data
    }, 30000);

    it('should use context for "same weight" command', async () => {
      const result = await parseVoiceCommand('same weight for 5 reps', {
        lastWeight: 405,
        lastWeightUnit: 'lbs',
      });

      // The voiceParser.ts has explicit logic to carry over context
      expect(result.weight).toBe(405);
      expect(result.weight_unit).toBe('lbs');
      expect(result.reps).toBe(5);
    }, 30000);

    it('should parse kg units correctly', async () => {
      const result = await parseVoiceCommand('bench press 100 kg for 6 reps');

      expect(result.exercise_name?.toLowerCase()).toContain('bench');
      expect(result.weight).toBe(100);
      expect(result.weight_unit).toBe('kg');
      expect(result.reps).toBe(6);
      expect(result.confidence).toBeGreaterThan(0.7);
    }, 30000);

    it('should parse sets when mentioned', async () => {
      const result = await parseVoiceCommand('3 sets of 10 reps at 135 pounds on bench');

      expect(result.sets).toBe(3);
      expect(result.reps).toBe(10);
      expect(result.weight).toBe(135);
      expect(result.exercise_name?.toLowerCase()).toContain('bench');
    }, 30000);

    it('should parse RPE when mentioned', async () => {
      const result = await parseVoiceCommand('squat 315 for 5 reps RPE 8');

      expect(result.exercise_name?.toLowerCase()).toContain('squat');
      expect(result.weight).toBe(315);
      expect(result.reps).toBe(5);
      expect(result.rpe).toBe(8);
    }, 30000);

    it('should have low confidence for unclear commands', async () => {
      const result = await parseVoiceCommand('did some stuff today');

      // Unclear command should have low confidence or null values
      expect(result.confidence).toBeLessThan(0.5);
    }, 30000);
  });

  describe('generateConfirmation', () => {
    it('should generate standard confirmation', () => {
      const message = generateConfirmation({
        exercise: 'bench press',
        weight: 185,
        reps: 8,
        isPr: false,
      });

      expect(message).toContain('bench press');
      expect(message).toContain('185lbs');
      expect(message).toContain('8');
    });

    it('should generate PR confirmation', () => {
      const message = generateConfirmation({
        exercise: 'squat',
        weight: 405,
        reps: 3,
        isPr: true,
      });

      expect(message).toContain('PR');
      expect(message).toContain('405lbs');
    });

    it('should include set number when provided', () => {
      const message = generateConfirmation({
        exercise: 'deadlift',
        weight: 495,
        reps: 1,
        isPr: false,
        setNumber: 3,
      });

      expect(message).toContain('Halfway there');
    });

    it('should use custom weight unit', () => {
      const message = generateConfirmation({
        exercise: 'bench',
        weight: 85,
        reps: 10,
        isPr: false,
        unit: 'kg',
      });

      expect(message).toContain('85kg');
    });

    it('should handle all set numbers', () => {
      for (let i = 1; i <= 5; i++) {
        const message = generateConfirmation({
          exercise: 'test',
          weight: 100,
          reps: 5,
          isPr: false,
          setNumber: i,
        });

        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Grok API Direct - Voice Parsing', () => {
  it('should parse voice input as AI would', async () => {
    const response = await generateCompletion({
      systemPrompt: 'Extract workout data from voice input. Return JSON.',
      userPrompt: 'Parse this voice input: "I just did 3 sets of 10 reps at 135 pounds on bench press"',
      temperature: TEMPERATURES.parsing,
      maxTokens: 100,
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  }, 30000);
});

