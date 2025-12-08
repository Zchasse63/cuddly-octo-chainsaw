/**
 * Tool Registry Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createTool, collectTools } from '../registry';
import type { ToolContext } from '../context';

// Mock tool context
const mockContext: ToolContext = {
  db: {} as any,
  userId: 'test-user-123',
  userRole: 'premium',
};

describe('createTool', () => {
  it('should create a tool factory function', () => {
    const toolFactory = createTool({
      name: 'testTool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string(),
      }),
      execute: async (params, ctx) => ({ success: true, data: params.input }),
    });

    // createTool returns a factory function
    expect(typeof toolFactory).toBe('function');

    // When called with context, it returns a tool object (AI SDK tool format)
    const tool = toolFactory(mockContext);
    expect(tool.description).toBe('A test tool');
    // AI SDK tools use 'inputSchema' not 'parameters'
    expect(tool.inputSchema).toBeDefined();
    expect(tool.execute).toBeDefined();
  });

  it('should execute tool with context', async () => {
    const toolFactory = createTool({
      name: 'testTool',
      description: 'A test tool',
      parameters: z.object({
        input: z.string(),
      }),
      execute: async (params, ctx) => ({ success: true, data: params.input, userId: ctx.userId }),
    });

    const tool = toolFactory(mockContext);
    const result = await tool.execute({ input: 'hello' });

    expect(result.success).toBe(true);
    expect(result.data).toBe('hello');
    expect(result.userId).toBe('test-user-123');
  });
});

// Helper type for tool with execute function
type ExecutableTool = { execute: (params: any) => Promise<any>; description: string; parameters: any };

describe('collectTools', () => {
  const testTools = {
    toolA: createTool({
      name: 'toolA',
      description: 'Tool A',
      parameters: z.object({ value: z.number() }),
      requiredRole: 'free',
      execute: async (params) => ({ success: true, data: params.value * 2 }),
    }),
    toolB: createTool({
      name: 'toolB',
      description: 'Tool B',
      parameters: z.object({}),
      requiredRole: 'premium',
      execute: async () => ({ success: true }),
    }),
    toolC: createTool({
      name: 'toolC',
      description: 'Tool C',
      parameters: z.object({}),
      requiredRole: 'coach',
      execute: async () => ({ success: true }),
    }),
  };

  it('should collect all tools (permission checked at execution)', () => {
    const freeContext: ToolContext = { ...mockContext, userRole: 'free' };
    const collected = collectTools(freeContext, testTools);

    // All tools are collected - permission is checked at execution time
    expect(Object.keys(collected)).toContain('toolA');
    expect(Object.keys(collected)).toContain('toolB');
    expect(Object.keys(collected)).toContain('toolC');
  });

  it('should allow free user to execute free tools', async () => {
    const freeContext: ToolContext = { ...mockContext, userRole: 'free' };
    const collected = collectTools(freeContext, testTools) as Record<string, ExecutableTool>;
    const result = await collected.toolA.execute({ value: 5 });

    expect(result).toEqual({ success: true, data: 10 });
  });

  it('should deny free user access to premium tools', async () => {
    const freeContext: ToolContext = { ...mockContext, userRole: 'free' };
    const collected = collectTools(freeContext, testTools) as Record<string, ExecutableTool>;
    const result = await collected.toolB.execute({});

    expect(result.success).toBe(false);
    expect((result as any).error.code).toBe('PERMISSION_DENIED');
  });

  it('should allow premium user to execute premium tools', async () => {
    const premiumContext: ToolContext = { ...mockContext, userRole: 'premium' };
    const collected = collectTools(premiumContext, testTools) as Record<string, ExecutableTool>;
    const result = await collected.toolB.execute({});

    expect(result.success).toBe(true);
  });

  it('should allow coach to execute all tools', async () => {
    const coachContext: ToolContext = { ...mockContext, userRole: 'coach' };
    const collected = collectTools(coachContext, testTools) as Record<string, ExecutableTool>;

    const resultA = await collected.toolA.execute({ value: 5 });
    const resultB = await collected.toolB.execute({});
    const resultC = await collected.toolC.execute({});

    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(true);
    expect(resultC.success).toBe(true);
  });
});

