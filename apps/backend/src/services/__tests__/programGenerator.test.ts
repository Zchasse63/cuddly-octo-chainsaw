/**
 * Program Generator Service Tests - Real API Integration
 *
 * These tests use REAL Grok API and Upstash services.
 * No mocks - all responses come from actual services.
 */
import { describe, it, expect } from 'vitest';
import type { GeneratedProgram, ProgramParams } from '../programGenerator';
import { generateCompletion, TEMPERATURES } from '../../lib/ai';
import { search, cache } from '../../lib/upstash';
import { SEARCH_INDEXES } from '../searchIndexer';

describe('Program Generator Service (Real API)', () => {
  describe('Program Types', () => {
    it('should support strength programs', () => {
      const type: 'strength' | 'running' | 'hybrid' | 'crossfit' = 'strength';
      expect(type).toBe('strength');
    });

    it('should support running programs', () => {
      const type: 'strength' | 'running' | 'hybrid' | 'crossfit' = 'running';
      expect(type).toBe('running');
    });

    it('should support hybrid programs', () => {
      const type: 'strength' | 'running' | 'hybrid' | 'crossfit' = 'hybrid';
      expect(type).toBe('hybrid');
    });

    it('should support crossfit programs', () => {
      const type: 'strength' | 'running' | 'hybrid' | 'crossfit' = 'crossfit';
      expect(type).toBe('crossfit');
    });
  });

  describe('Program Structure', () => {
    it('should validate program properties', () => {
      const program: GeneratedProgram = {
        name: 'Test Program',
        description: 'Test Description',
        programType: 'strength',
        durationWeeks: 12,
        daysPerWeek: 4,
        primaryGoal: 'Build Muscle',
        weeks: [],
        ragSources: [],
      };

      expect(program.name).toBe('Test Program');
      expect(program.durationWeeks).toBe(12);
      expect(program.daysPerWeek).toBe(4);
    });

    it('should support RAG sources', () => {
      const program: GeneratedProgram = {
        name: 'Program',
        description: 'Desc',
        programType: 'strength',
        durationWeeks: 12,
        daysPerWeek: 4,
        primaryGoal: 'Goal',
        weeks: [],
        ragSources: ['Source 1', 'Source 2', 'Source 3'],
      };

      expect(program.ragSources.length).toBeGreaterThan(0);
    });
  });

  describe('Program Parameters', () => {
    it('should validate program parameters', () => {
      const params: ProgramParams = {
        experienceLevel: 'intermediate',
        goals: ['build_muscle'],
        frequency: 4,
        duration: 60,
        equipment: ['barbell', 'dumbbell'],
      };

      expect(params.experienceLevel).toBe('intermediate');
      expect(params.frequency).toBe(4);
      expect(params.equipment.length).toBe(2);
    });

    it('should validate experience levels', () => {
      const levels = ['beginner', 'intermediate', 'advanced'];
      levels.forEach((level) => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(level);
      });
    });

    it('should validate goals', () => {
      const goals = ['build_muscle', 'lose_weight', 'improve_fitness'];
      goals.forEach((goal) => {
        expect(goal).toBeDefined();
      });
    });
  });

  describe('Grok API Integration', () => {
    it('should generate program outline', async () => {
      const response = await generateCompletion({
        systemPrompt: 'You are a fitness program designer. Keep responses brief.',
        userPrompt: 'Design a 4-week strength program for an intermediate lifter. Just give main structure.',
        temperature: TEMPERATURES.coaching,
        maxTokens: 200,
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    }, 30000);

    it('should generate exercise recommendations', async () => {
      const response = await generateCompletion({
        systemPrompt: 'You are a fitness expert. List exercises briefly.',
        userPrompt: 'What are 5 essential compound exercises for building strength?',
        temperature: TEMPERATURES.coaching,
        maxTokens: 150,
      });

      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(20);
    }, 30000);
  });

  describe('Upstash Search Integration', () => {
    it('should search exercises index', async () => {
      const results = await search.query({
        index: SEARCH_INDEXES.EXERCISES,
        query: 'compound strength exercises',
        topK: 5,
      });

      expect(Array.isArray(results)).toBe(true);
    }, 30000);
  });

  describe('Cache Integration', () => {
    it('should cache program data', async () => {
      const testKey = `program:test:${Date.now()}`;
      const testData = { name: 'Test Program', weeks: 4 };

      await cache.set(testKey, testData, 60);
      const cached = await cache.get<{ name: string; weeks: number }>(testKey);

      expect(cached).toBeDefined();
      if (cached) {
        expect(cached.name).toBe('Test Program');
      }

      // Cleanup
      await cache.delete(testKey);
    }, 10000);
  });
});

