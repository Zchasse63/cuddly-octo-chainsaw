/**
 * Vercel AI SDK Client Configuration
 *
 * Central configuration for xAI (Grok) via Vercel AI SDK.
 * Supports intelligent routing between reasoning and non-reasoning models.
 *
 * Model Strategy:
 * - grok-4-1-fast-reasoning: Complex analysis, multi-step reasoning, tool-calling
 * - grok-4-fast: Simple single-turn tasks, message classification
 * - grok-3-fast: Long-form generation (12-week programs, large JSON)
 * - grok-3-mini-fast: Lightweight voice parsing, simple JSON extraction
 */

import { createXai } from '@ai-sdk/xai';
import {
  generateText,
  streamText,
  generateObject,
  tool,
  wrapLanguageModel,
  type LanguageModel,
} from 'ai';
import { z } from 'zod';

// Create xAI client
export const xai = createXai({
  apiKey: process.env.XAI_API_KEY!,
});

// Model identifiers with clear purpose for each
export const MODELS = {
  // Reasoning model for complex tasks (multi-step, tool-calling, analysis)
  reasoning: 'grok-4-1-fast-reasoning',
  // Fast model for simple single-turn tasks (classification, intent detection)
  fast: 'grok-4-fast',
  // Long-form generation model (program generation, large JSON output)
  // Note: grok-4-1-fast-reasoning has limited output, use grok-3-fast for long form
  longform: 'grok-3-fast',
  // Lightweight model for voice parsing and simple JSON extraction
  mini: 'grok-3-mini-fast',
  // Legacy alias (maps to reasoning)
  standard: 'grok-4-1-fast-reasoning',
} as const;

// Model type for type-safe model selection
export type ModelType = keyof typeof MODELS;

// Task complexity levels for intelligent routing
// 'longform' is for large output generation (e.g., full 12-week programs)
// 'parsing' is for lightweight JSON extraction (voice commands)
export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'longform' | 'parsing';

// ============================================================================
// MIDDLEWARE FOR LOGGING AND ROUTING
// ============================================================================

/**
 * Logging middleware for AI requests
 * Tracks model usage, latency, and token consumption
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loggingMiddleware: any = {
  wrapGenerate: async ({ doGenerate, params }: { doGenerate: () => Promise<any>; params: { modelId?: string } }) => {
    const startTime = Date.now();
    const result = await doGenerate();
    const latencyMs = Date.now() - startTime;

    // Log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log('[AI]', {
        model: params.modelId,
        latencyMs,
        promptTokens: result.usage?.promptTokens,
        completionTokens: result.usage?.completionTokens,
        finishReason: result.finishReason,
      });
    }

    return result;
  },

  wrapStream: async ({ doStream, params }: { doStream: () => Promise<{ stream: ReadableStream<any>; [key: string]: any }>; params: { modelId?: string } }) => {
    const startTime = Date.now();
    const { stream, ...rest } = await doStream();

    // Create a transform that logs on completion
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;

    const transformedStream = stream.pipeThrough(
      new TransformStream({
        transform(chunk: any, controller: TransformStreamDefaultController) {
          // Track usage from stream chunks
          if (chunk.type === 'response-metadata' && 'usage' in chunk) {
            const usage = chunk.usage as { promptTokens?: number; completionTokens?: number };
            promptTokens = usage.promptTokens;
            completionTokens = usage.completionTokens;
          }
          controller.enqueue(chunk);
        },
        flush() {
          // Log on stream completion
          if (process.env.NODE_ENV !== 'test') {
            console.log('[AI Stream]', {
              model: params.modelId,
              latencyMs: Date.now() - startTime,
              promptTokens,
              completionTokens,
            });
          }
        },
      })
    );

    return { stream: transformedStream, ...rest };
  },
};

/**
 * Wrap a model with logging middleware
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withLogging(model: LanguageModel): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return wrapLanguageModel({ model: model as any, middleware: loggingMiddleware });
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

// Model configuration
export const AI_CONFIG = {
  // Primary model for tool calling with reasoning (Responses API)
  responses: xai.responses(MODELS.reasoning),

  // Chat model for simple completions (grok-4-fast)
  chat: xai(MODELS.fast),

  // Reasoning model for complex analysis (grok-4-1-fast-reasoning)
  reasoning: xai(MODELS.reasoning),

  // Mini model for voice parsing (grok-3-mini-fast)
  mini: xai(MODELS.mini),

  // Longform model for program generation (grok-3-fast)
  longform: xai(MODELS.longform),

  // Tool calling limits (prevent infinite loops) - use with stepCountIs()
  defaultStepLimit: 10,

  // Request timeout in milliseconds
  timeout: 120000, // 2 minutes for standard requests
  programGenerationTimeout: 300000, // 5 minutes for full program generation

  // Model identifiers (for backwards compatibility)
  models: MODELS,

  // Temperature presets
  temperatures: {
    parsing: 0.1,      // Structured output, JSON parsing
    classification: 0.2, // Intent detection, categorization
    analysis: 0.3,     // Data analysis, trends
    insights: 0.5,     // Personalized recommendations
    coaching: 0.7,     // Natural conversation, motivation
    creative: 0.8,     // Program generation, creative content
  },
} as const;

/**
 * Get the appropriate model based on task complexity
 *
 * Model Selection:
 * - parsing: grok-3-mini-fast (voice commands, simple JSON)
 * - simple: grok-4-fast (classification, intent detection)
 * - moderate: grok-4-1-fast-reasoning (standard coaching)
 * - complex: grok-4-1-fast-reasoning (multi-step, tool-calling)
 * - longform: grok-3-fast (12-week programs, large output)
 */
export function getModelForTask(complexity: TaskComplexity = 'moderate') {
  switch (complexity) {
    case 'parsing':
      // Lightweight model for voice parsing and simple JSON extraction
      return xai(MODELS.mini);
    case 'simple':
      // Fast model for classification and intent detection
      return xai(MODELS.fast);
    case 'complex':
      return xai(MODELS.reasoning);
    case 'longform':
      // Use grok-3-fast for large output generation (12-week programs, etc.)
      // grok-4-1-fast-reasoning has limited output tokens
      return xai(MODELS.longform);
    case 'moderate':
    default:
      return xai(MODELS.reasoning);
  }
}

/**
 * Get a model with logging middleware enabled
 */
export function getModelWithLogging(complexity: TaskComplexity = 'moderate') {
  return withLogging(getModelForTask(complexity));
}

// Type exports
export type AIConfig = typeof AI_CONFIG;

// Re-export Vercel AI SDK utilities
export { generateText, streamText, generateObject, tool };
export { z };

/**
 * Generate text with the standard configuration.
 * Wrapper for common use cases.
 */
export async function generateAIText(options: {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const { text } = await generateText({
    model: AI_CONFIG.chat,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? AI_CONFIG.temperatures.coaching,
    maxOutputTokens: options.maxTokens ?? 500,
  });
  return text;
}

/**
 * Stream text with the standard configuration.
 * Returns an async iterable of text chunks.
 */
export function streamAIText(options: {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  return streamText({
    model: AI_CONFIG.chat,
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? AI_CONFIG.temperatures.coaching,
    maxOutputTokens: options.maxTokens ?? 500,
  });
}

/**
 * Generate structured output with Zod schema validation.
 */
export async function generateAIObject<T extends z.ZodType>(options: {
  system: string;
  prompt: string;
  schema: T;
  temperature?: number;
}) {
  const { object } = await generateObject({
    model: AI_CONFIG.chat,
    system: options.system,
    prompt: options.prompt,
    schema: options.schema,
    temperature: options.temperature ?? AI_CONFIG.temperatures.parsing,
  });
  return object;
}

// ============================================================================
// Service-compatible exports
// ============================================================================

/**
 * Temperature presets
 */
export const TEMPERATURES = AI_CONFIG.temperatures;

/**
 * Model configurations
 */
export const GROK_MODELS = AI_CONFIG.models;

/**
 * Generate completion - standard interface for services
 * Supports both explicit model selection and task complexity routing
 *
 * Priority:
 * 1. If `model` is specified, use that model directly
 * 2. Otherwise, use `complexity` to determine the appropriate model
 *
 * Model Selection Guide:
 * - model: 'mini' → voice parsing, simple JSON (grok-3-mini-fast)
 * - model: 'fast' → classification, intent (grok-4-fast)
 * - model: 'reasoning' → complex analysis (grok-4-1-fast-reasoning)
 * - model: 'longform' → program generation (grok-3-fast)
 * - complexity: 'parsing' → mini model
 * - complexity: 'simple' → fast model
 * - complexity: 'moderate'/'complex' → reasoning model
 * - complexity: 'longform' → longform model
 */
export async function generateCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: ModelType;
  complexity?: TaskComplexity;
}): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    temperature = TEMPERATURES.coaching,
    maxTokens = 500,
    model,
    complexity = 'moderate',
  } = params;

  // Model selection: explicit model takes priority over complexity
  let selectedModel;
  if (model) {
    // Direct model selection
    selectedModel = xai(MODELS[model]);
  } else {
    // Use complexity-based routing
    selectedModel = getModelForTask(complexity);
  }

  const { text } = await generateText({
    model: selectedModel,
    system: systemPrompt,
    prompt: userPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });

  return text;
}

/**
 * Stream completion - standard interface for services.
 * Returns an async generator that yields text chunks.
 * Supports both explicit model selection and task complexity routing.
 */
export async function* streamCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: ModelType;
  complexity?: TaskComplexity;
}): AsyncGenerator<string, void, unknown> {
  const {
    systemPrompt,
    userPrompt,
    temperature = TEMPERATURES.coaching,
    maxTokens = 500,
    model,
    complexity = 'moderate',
  } = params;

  // Model selection: explicit model takes priority over complexity
  let selectedModel;
  if (model) {
    selectedModel = xai(MODELS[model]);
  } else {
    selectedModel = getModelForTask(complexity);
  }

  const result = streamText({
    model: selectedModel,
    system: systemPrompt,
    prompt: userPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }
}

