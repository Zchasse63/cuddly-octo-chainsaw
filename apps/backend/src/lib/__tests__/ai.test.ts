import { describe, it, expect } from 'vitest';
import { generateText, streamText } from 'ai';
import { xai, TEMPERATURES, GROK_MODELS, MODELS } from '../ai';

/**
 * Vercel AI SDK Integration Tests
 * Tests real xAI API calls using Vercel AI SDK
 */

const AI_TIMEOUT = 90000; // 90s for AI calls (increased for Grok API stability)

describe('AI SDK Client', () => {
  describe('Configuration', () => {
    it('should export correct model configurations', () => {
      // Verify models are defined and are strings
      expect(GROK_MODELS.fast).toBeDefined();
      expect(GROK_MODELS.standard).toBeDefined();
      expect(GROK_MODELS.reasoning).toBeDefined();
      expect(typeof GROK_MODELS.fast).toBe('string');
    });

    it('should export correct temperature presets', () => {
      expect(TEMPERATURES.parsing).toBe(0.1);
      expect(TEMPERATURES.classification).toBe(0.2);
      expect(TEMPERATURES.analysis).toBe(0.3);
      expect(TEMPERATURES.insights).toBe(0.5);
      expect(TEMPERATURES.coaching).toBe(0.7);
      expect(TEMPERATURES.creative).toBe(0.8);
    });

    it('should create xai model instance', () => {
      const model = xai(GROK_MODELS.fast);
      expect(model).toBeDefined();
    });
  });

  describe('generateText', () => {
    it('should generate text with real API call', async () => {
      const result = await generateText({
        model: xai(GROK_MODELS.fast),
        prompt: 'Say "hello" and nothing else.',
        temperature: TEMPERATURES.parsing,
        maxOutputTokens: 10,
      });

      expect(result.text).toBeDefined();
      expect(result.text.toLowerCase()).toContain('hello');
    }, AI_TIMEOUT);

    it('should generate text with system and user messages', async () => {
      const result = await generateText({
        model: xai(GROK_MODELS.fast),
        system: 'You are a helpful assistant. Respond with exactly one word.',
        prompt: 'What is 2+2?',
        temperature: TEMPERATURES.parsing,
        maxOutputTokens: 10,
      });

      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    }, AI_TIMEOUT);

    it('should generate text with maxOutputTokens', async () => {
      const result = await generateText({
        model: xai(GROK_MODELS.fast),
        prompt: 'Count from 1 to 100.',
        temperature: TEMPERATURES.parsing,
        maxOutputTokens: 20,
      });

      // Response should be truncated due to token limit
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    }, AI_TIMEOUT);
  });

  describe('streamText', () => {
    it('should stream text chunks', async () => {
      const result = streamText({
        model: xai(GROK_MODELS.fast),
        prompt: 'Say "streaming works" and nothing else.',
        temperature: TEMPERATURES.parsing,
        maxOutputTokens: 20,
      });

      const chunks: string[] = [];
      for await (const chunk of result.textStream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      const fullText = chunks.join('');
      expect(fullText.toLowerCase()).toContain('streaming');
    }, AI_TIMEOUT);
  });

  describe('Temperature Effects', () => {
    it('should produce consistent output with low temperature', async () => {
      const results = await Promise.all([
        generateText({
          model: xai(GROK_MODELS.fast),
          prompt: 'What is 5 + 5? Answer with just the number.',
          temperature: TEMPERATURES.parsing,
          maxOutputTokens: 5,
        }),
        generateText({
          model: xai(GROK_MODELS.fast),
          prompt: 'What is 5 + 5? Answer with just the number.',
          temperature: TEMPERATURES.parsing,
          maxOutputTokens: 5,
        }),
      ]);

      // Both should contain "10"
      expect(results[0].text).toContain('10');
      expect(results[1].text).toContain('10');
    }, AI_TIMEOUT);
  });
});

