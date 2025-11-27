import OpenAI from 'openai';

// Initialize Grok (xAI) client using OpenAI SDK
export const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY!,
  baseURL: 'https://api.x.ai/v1',
});

// Model configurations by use case
export const GROK_MODELS = {
  // Fast model for parsing (low temperature tasks)
  fast: 'grok-2-1212',
  // Standard model for most tasks
  standard: 'grok-2-1212',
} as const;

// Temperature presets
export const TEMPERATURES = {
  parsing: 0.1,      // Voice parser, strict output
  classification: 0.2, // Chat classifier
  analysis: 0.3,     // Injury detection, exercise swap
  insights: 0.5,     // Health insights
  coaching: 0.7,     // AI coach, program generation
} as const;

// Helper for generating completion
export async function generateCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: keyof typeof GROK_MODELS;
}) {
  const {
    systemPrompt,
    userPrompt,
    temperature = TEMPERATURES.coaching,
    maxTokens = 500,
    model = 'standard',
  } = params;

  const response = await grok.chat.completions.create({
    model: GROK_MODELS[model],
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content || '';
}

// Helper for streaming completion (for coach chat)
export async function* streamCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const {
    systemPrompt,
    userPrompt,
    temperature = TEMPERATURES.coaching,
    maxTokens = 500,
  } = params;

  const stream = await grok.chat.completions.create({
    model: GROK_MODELS.standard,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
