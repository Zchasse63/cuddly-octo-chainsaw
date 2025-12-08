/**
 * Tool Registry
 *
 * Framework for creating tools with context injection and role-based access control.
 * Tools are factory functions that receive context and return Vercel AI SDK tool definitions.
 */

import { tool, type Tool } from 'ai';
import { z } from 'zod';
import type { Database } from '../db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any, any>;

// User role hierarchy for permission checks
export type UserRole = 'free' | 'premium' | 'coach';
const ROLE_HIERARCHY: Record<UserRole, number> = { free: 0, premium: 1, coach: 2 };

/**
 * Tool context passed to all tools.
 * Contains database access and user information.
 */
export interface ToolContext {
  db: Database;
  userId: string;
  userRole: UserRole;
}

/**
 * Tool definition with metadata and execution function.
 */
export interface ToolDefinition<TParams extends z.ZodType, TResult> {
  name: string;
  description: string;
  parameters: TParams;
  requiredRole?: UserRole;
  execute: (params: z.infer<TParams>, ctx: ToolContext) => Promise<TResult>;
}

/**
 * Creates a tool with context injection and role-based access control.
 *
 * @param definition - The tool definition including schema and execute function
 * @returns A factory function that creates the tool with injected context
 *
 * @example
 * ```ts
 * const getUserProfile = createTool({
 *   name: 'getUserProfile',
 *   description: 'Get current user profile',
 *   parameters: z.object({}),
 *   execute: async (params, ctx) => {
 *     return ctx.db.query.userProfiles.findFirst({
 *       where: eq(userProfiles.userId, ctx.userId)
 *     });
 *   }
 * });
 * ```
 */
export function createTool<TParams extends z.ZodType, TResult>(
  definition: ToolDefinition<TParams, TResult>
) {
  return (ctx: ToolContext) => {
    // Check role permission if required
    if (definition.requiredRole) {
      const userRoleLevel = ROLE_HIERARCHY[ctx.userRole];
      const requiredRoleLevel = ROLE_HIERARCHY[definition.requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        // Return a tool that always returns permission error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tool<any, any>({
          description: definition.description,
          inputSchema: definition.parameters,
          execute: async () => ({
            success: false as const,
            error: {
              code: 'PERMISSION_DENIED',
              message: `This feature requires ${definition.requiredRole} tier or higher. You are on ${ctx.userRole} tier.`,
            },
          }),
        }) as AnyTool;
      }
    }

    // Return the actual tool with context injected
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tool<any, any>({
      description: definition.description,
      inputSchema: definition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (params: any) => {
        // Parse params through Zod to apply defaults
        const parsedParams = definition.parameters.parse(params);
        return definition.execute(parsedParams, ctx);
      },
    }) as AnyTool;
  };
}

/**
 * Type for a tool factory function (what createTool returns).
 */
export type ToolFactory = ReturnType<typeof createTool>;

/**
 * Collects all tools for a given context.
 * Takes tool factory functions and creates the actual tool objects.
 *
 * @param ctx - The tool context with db and user info
 * @param toolFactories - Object mapping tool names to factory functions
 * @returns Object mapping tool names to instantiated tools
 *
 * @example
 * ```ts
 * const tools = collectTools(ctx, {
 *   getUserProfile,
 *   getRecentWorkouts,
 *   logWorkoutSet,
 * });
 * ```
 */
export function collectTools(
  ctx: ToolContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolFactories: Record<string, (ctx: ToolContext) => AnyTool>
): Record<string, AnyTool> {
  const tools: Record<string, AnyTool> = {};

  for (const [name, factory] of Object.entries(toolFactories)) {
    tools[name] = factory(ctx);
  }

  return tools;
}

/**
 * Check if a user has permission for a specific role level.
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

