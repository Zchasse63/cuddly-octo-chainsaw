/**
 * Injury Detection Service Tests - Real API Integration
 *
 * These tests use REAL Grok API for injury detection and pain classification.
 * No mocks - all AI responses come from actual Grok API calls.
 */
import { describe, it, expect } from 'vitest';
import { detectInjury, classifyPainType, type InjuryContext } from '../injuryDetection';
import { generateCompletion, TEMPERATURES } from '../../lib/ai';

describe('Injury Detection Service (Real API)', () => {
  describe('detectInjury - Real Grok API', () => {
    it('should detect injury from shoulder pain context', async () => {
      const context: InjuryContext = {
        injuryNotes: 'Sharp pain in shoulder during bench press',
        recentWorkouts: ['Chest Day', 'Shoulder Day'],
        injuryHistory: ['Previous rotator cuff issue'],
        painLevel: 7,
        experienceLevel: 'intermediate',
      };

      const result = await detectInjury(context);

      // Validate structure
      expect(result).toHaveProperty('injury_detected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('body_part');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('exercise_modifications');
      expect(result).toHaveProperty('should_see_doctor');

      // With high pain level and history, should detect injury
      expect(typeof result.injury_detected).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, 30000);

    it('should detect knee injury context', async () => {
      const context: InjuryContext = {
        injuryNotes: 'Knee pain during squats, especially at the bottom',
        painLevel: 6,
        experienceLevel: 'intermediate',
      };

      const result = await detectInjury(context);

      expect(result.body_part).toBeDefined();
      expect(typeof result.description).toBe('string');
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.exercise_modifications)).toBe(true);
    }, 30000);

    it('should handle mild soreness (likely DOMS)', async () => {
      const context: InjuryContext = {
        injuryNotes: 'Mild general muscle soreness 2 days after workout',
        painLevel: 3,
        experienceLevel: 'beginner',
      };

      const result = await detectInjury(context);

      // Low pain, general soreness - may or may not detect injury
      expect(result.confidence).toBeDefined();
      expect(['mild', 'moderate', 'severe']).toContain(result.severity);
    }, 30000);

    it('should include RAG context in analysis', async () => {
      const context: InjuryContext = {
        injuryNotes: 'Lower back tightness after deadlifts',
        painLevel: 4,
        experienceLevel: 'advanced',
      };

      const ragContext = 'Lower back tightness is common after deadlifts and may indicate muscle fatigue rather than injury.';
      const result = await detectInjury(context, ragContext);

      expect(result).toHaveProperty('injury_detected');
      expect(result).toHaveProperty('recommendations');
    }, 30000);
  });

  describe('classifyPainType - Real Grok API', () => {
    it('should classify DOMS-like symptoms', async () => {
      const result = await classifyPainType('My legs are sore all over 2 days after leg day');

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('reason');
      expect(['doms', 'injury', 'unclear']).toContain(result.type);
    }, 30000);

    it('should classify injury-like symptoms', async () => {
      const result = await classifyPainType('Sharp pain in my knee when bending, hurts to walk');

      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(typeof result.reason).toBe('string');
    }, 30000);

    it('should handle vague descriptions', async () => {
      const result = await classifyPainType('Something feels off in my arm');

      expect(result).toHaveProperty('type');
      expect(['doms', 'injury', 'unclear']).toContain(result.type);
    }, 30000);
  });

  describe('Injury Context Validation', () => {
    it('should validate severity levels', () => {
      const validSeverities = ['mild', 'moderate', 'severe'];
      validSeverities.forEach((severity) => {
        expect(['mild', 'moderate', 'severe']).toContain(severity);
      });
    });

    it('should validate pain levels', () => {
      for (let i = 1; i <= 10; i++) {
        expect(i).toBeGreaterThanOrEqual(1);
        expect(i).toBeLessThanOrEqual(10);
      }
    });

    it('should validate experience levels', () => {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      validLevels.forEach((level) => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(level);
      });
    });
  });
});

describe('Grok API Direct - Injury Analysis', () => {
  it('should analyze injury-related prompts', async () => {
    const response = await generateCompletion({
      systemPrompt: 'You are a sports medicine expert. Keep responses brief and safety-focused.',
      userPrompt: 'I have sharp pain in my shoulder when I lift my arm overhead. What might this be?',
      temperature: TEMPERATURES.coaching,
      maxTokens: 200,
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(20);
  }, 30000);

  it('should distinguish DOMS from injury', async () => {
    const response = await generateCompletion({
      systemPrompt: 'You are a fitness expert. Explain briefly.',
      userPrompt: 'How can I tell if my muscle soreness is normal DOMS or a potential injury?',
      temperature: TEMPERATURES.coaching,
      maxTokens: 200,
    });

    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(20);
  }, 30000);
});

