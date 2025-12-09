import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import { db } from '../db';
import { getUserFromHeader } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Context type
export interface Context {
  db: typeof db;
  user: User | null;
  req?: Request;
}

// Create context
export async function createContext(opts?: { req: Request }): Promise<Context> {
  let user: User | null = null;

  if (opts?.req) {
    try {
      const authHeader = opts.req.headers.get('authorization');
      if (authHeader) {
        user = await getUserFromHeader(authHeader);
      }
    } catch {
      // User is not authenticated, that's ok for public routes
    }
  }

  return {
    db,
    user,
    req: opts?.req,
  };
}

// Initialize tRPC with superjson transformer for proper Date/Map/Set serialization
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Export router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Middleware for logging
export const loggedProcedure = t.procedure.use(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  console.log(`[tRPC] ${type} ${path} - ${duration}ms`);

  return result;
});
