/**
 * Simple test to debug tool calling with xAI
 */
import { createXai } from '@ai-sdk/xai';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

const model = xai('grok-4-1-fast-reasoning');

const weatherTool = tool({
  description: 'Get the weather for a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get weather for'),
  }),
  execute: async ({ location }) => {
    console.log(`[TOOL EXECUTED] Getting weather for ${location}`);
    return {
      location,
      temperature: 72,
      conditions: 'sunny',
    };
  },
});

console.log('Testing tool calling with xAI...\n');

try {
  const result = await generateText({
    model,
    tools: {
      getWeather: weatherTool,
    },
    prompt: 'What is the weather in San Francisco?',
  });

  console.log('Result:', JSON.stringify({
    text: result.text,
    toolCalls: result.toolCalls?.map(tc => ({ toolName: tc.toolName, args: tc.args })),
    finishReason: result.finishReason,
  }, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  if (error.responseBody) {
    console.error('Response body:', error.responseBody);
  }
}
