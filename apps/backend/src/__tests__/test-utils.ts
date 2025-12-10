/**
 * Test Utilities for Router Testing
 * Provides mock factories for database, services, and tRPC context
 */

import { vi } from 'vitest';

// Mock user for testing
export const mockUser = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
};

// Create chainable mock for Drizzle queries
export function createChainableMock(returnValue: any = []) {
  const chain: any = {
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  };
  return chain;
}

// Create mock database
export function createMockDb() {
  return {
    query: {
      users: { findFirst: vi.fn(), findMany: vi.fn() },
      userProfiles: { findFirst: vi.fn(), findMany: vi.fn() },
      workouts: { findFirst: vi.fn(), findMany: vi.fn() },
      workoutSets: { findFirst: vi.fn(), findMany: vi.fn() },
      exercises: { findFirst: vi.fn(), findMany: vi.fn() },
      personalRecords: { findFirst: vi.fn(), findMany: vi.fn() },
      programs: { findFirst: vi.fn(), findMany: vi.fn() },
      badges: { findFirst: vi.fn(), findMany: vi.fn() },
      userBadges: { findFirst: vi.fn(), findMany: vi.fn() },
      conversations: { findFirst: vi.fn(), findMany: vi.fn() },
      messages: { findFirst: vi.fn(), findMany: vi.fn() },
      runSessions: { findFirst: vi.fn(), findMany: vi.fn() },
      readinessScores: { findFirst: vi.fn(), findMany: vi.fn() },
      shoes: { findFirst: vi.fn(), findMany: vi.fn() },
      wods: { findFirst: vi.fn(), findMany: vi.fn() },
      nutritionLogs: { findFirst: vi.fn(), findMany: vi.fn() },
      wearableData: { findFirst: vi.fn(), findMany: vi.fn() },
      devices: { findFirst: vi.fn(), findMany: vi.fn() },
      injuries: { findFirst: vi.fn(), findMany: vi.fn() },
      socialPosts: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    insert: vi.fn().mockReturnValue(createChainableMock([{ id: 'new-id' }])),
    update: vi.fn().mockReturnValue(createChainableMock([{ id: 'updated-id' }])),
    delete: vi.fn().mockReturnValue(createChainableMock([])),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  };
}

// Create mock context for protected procedures
export function createMockContext(overrides: Partial<{ user: any; db: any }> = {}) {
  return {
    user: overrides.user ?? mockUser,
    db: overrides.db ?? createMockDb(),
    req: new Request('http://localhost'),
  };
}

// Create mock context for public procedures (no user)
export function createPublicMockContext(overrides: Partial<{ db: any }> = {}) {
  return {
    user: null,
    db: overrides.db ?? createMockDb(),
    req: new Request('http://localhost'),
  };
}

// Mock Supabase admin
export const mockSupabaseAdmin = {
  auth: {
    admin: {
      createUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'new-user-id', email: 'new@example.com' } },
        error: null,
      }),
      deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUserById: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
    },
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: mockUser, session: { access_token: 'token' } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
  }),
};

// Mock Grok AI
export const mockGrok = {
  chat: {
    completions: {
      create: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{"response": "test"}' } }],
      }),
    },
  },
};

// Mock Upstash
export const mockUpstash = {
  search: {
    query: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({}),
  },
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue({}),
  },
};

// UUID helper
export const testUUID = '123e4567-e89b-12d3-a456-426614174000';

// Date helpers
export const testDate = new Date('2024-01-15T10:00:00Z');
export const testDateISO = testDate.toISOString();

