import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import { db } from '../db';
import { getUserFromHeader } from '../lib/supabase';
import { rateLimit } from '../lib/upstash';
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

// Rate limiting middleware factory
// Creates a middleware that enforces rate limits based on user ID or IP
const createRateLimitMiddleware = (limit: number, windowSeconds: number) =>
  t.middleware(async ({ ctx, next, path }) => {
    // Use user ID if authenticated, otherwise use a hash of path for public routes
    const identifier = ctx.user?.id || `anon:${path}`;

    const result = await rateLimit.check(identifier, limit, windowSeconds);

    if (!result.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Try again in ${result.resetIn} seconds.`,
      });
    }

    return next();
  });

// Rate limited procedures for different tiers

// Standard rate limit: 100 requests per minute (general API)
export const rateLimitedProcedure = protectedProcedure.use(
  createRateLimitMiddleware(100, 60)
);

// Strict rate limit: 20 requests per hour (expensive AI operations)
export const aiRateLimitedProcedure = protectedProcedure.use(
  createRateLimitMiddleware(20, 3600)
);

// Auth rate limit: 10 requests per 15 minutes (brute force protection)
export const authRateLimitedProcedure = publicProcedure.use(
  createRateLimitMiddleware(10, 900)
);

// Search rate limit: 60 requests per minute (search operations)
export const searchRateLimitedProcedure = protectedProcedure.use(
  createRateLimitMiddleware(60, 60)
);
