import { tool } from 'ai';
import { z } from 'zod';

// Create a tool exactly like registry.ts does
const testTool = tool({
  name: 'testTool',
  description: 'Test tool',
  parameters: z.object({ foo: z.string() }),
  execute: async (params) => ({ result: 'ok' })
});

console.log('Tool object:', testTool);
console.log('\nTool keys:', Object.keys(testTool));
console.log('\nTool name:', testTool.name);

// Try to serialize it like the AI SDK does
console.log('\nJSON.stringify(testTool):', JSON.stringify(testTool, null, 2));

// Check if it's a function that needs to be called
console.log('\nType of testTool:', typeof testTool);
console.log('\nIs function?:', typeof testTool === 'function');
