import { describe, it, expect, beforeAll } from 'vitest';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

// Import real modules now that env vars are set
import { supabaseAdmin } from '../../lib/supabase';
import { db } from '../../db';

/**
 * Auth Router Integration Tests
 * Tests against real Supabase instance
 */

describe('Auth Router Integration', () => {
  beforeAll(() => {
    // Verify env vars are loaded
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
  });

  describe('Supabase Connection', () => {
    it('should connect to Supabase', async () => {
      // Simple health check - list auth users (admin only)
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1,
      });

      // Should not error (may return empty list)
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should query database via Supabase client', async () => {
      // Check if we can query the users table via Supabase REST API
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .limit(1);

      // Should not error (may return empty array)
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query database via Drizzle ORM', async () => {
      // Check if we can query the users table via Drizzle (direct postgres)
      const result = await db.query.users.findMany({
        limit: 1,
      });

      // Should return array (may be empty)
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Auth Validation', () => {
    const signUpSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1).optional(),
    });

    it('should validate signup input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'securepassword123',
        name: 'Test User',
      };

      expect(signUpSchema.parse(validInput)).toEqual(validInput);
    });

    it('should reject invalid email', () => {
      expect(() =>
        signUpSchema.parse({
          email: 'not-an-email',
          password: 'securepassword123',
        })
      ).toThrow();
    });

    it('should reject short password', () => {
      expect(() =>
        signUpSchema.parse({
          email: 'test@example.com',
          password: 'short',
        })
      ).toThrow();
    });
  });

  describe('Token Verification', () => {
    it('should reject invalid token', async () => {
      const { data, error } = await supabaseAdmin.auth.getUser('invalid-token');

      expect(error).toBeDefined();
      expect(data.user).toBeNull();
    });
  });
});

