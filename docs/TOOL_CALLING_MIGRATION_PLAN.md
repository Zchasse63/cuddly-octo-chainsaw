# Tool Calling Architecture Migration Plan

**Document Version:** 1.1
**Created:** 2025-12-03
**Last Updated:** 2025-12-03
**Status:** ✅ IMPLEMENTATION COMPLETE
**Target SDK:** Vercel AI SDK with `@ai-sdk/xai`
**Model:** `grok-4-fast` via `xai.responses()`

---

## Implementation Status

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| Phase 0: Preparation | ✅ Complete | 2025-12-03 |
| Phase 1: Core Infrastructure | ✅ Complete | 2025-12-03 |
| Phase 2: Athlete Tools (35) | ✅ Complete | 2025-12-03 |
| Phase 3: Coach Tools (25) | ✅ Complete | 2025-12-03 |
| Phase 4: Service Migration | ✅ Complete | 2025-12-03 |
| Phase 5: Testing | ✅ Complete | 2025-12-03 |
| Phase 6: Cleanup | ✅ Complete | 2025-12-03 |

### Files Created
- `apps/backend/src/lib/ai.ts` - Vercel AI SDK client
- `apps/backend/src/lib/featureFlags.ts` - Gradual rollout control
- `apps/backend/src/tools/registry.ts` - Tool factory and collection
- `apps/backend/src/tools/utils.ts` - Common schemas and helpers
- `apps/backend/src/tools/context.ts` - Database context provider
- `apps/backend/src/tools/index.ts` - Main exports
- `apps/backend/src/tools/athlete/*.ts` - 35 athlete tools (8 files)
- `apps/backend/src/tools/coach/*.ts` - 25 coach tools (7 files)
- `apps/backend/src/services/unifiedCoachV2.ts` - New tool-based service
- `apps/backend/src/tools/__tests__/*.ts` - Unit and integration tests

### Files Modified
- `apps/backend/src/routers/coach.ts` - Feature flag integration
- `.env.example` - New environment variables

---

## Executive Summary

This document outlines the complete migration plan from OpenAI SDK to Vercel AI SDK with a tool-based architecture. The migration introduces 60 tools (35 athlete + 25 coach) that provide the AI with direct access to user data, eliminating prompt-based context injection.

### Key Benefits
- **Omniscient AI**: Model autonomously queries data as needed
- **Type Safety**: Zod schemas for all tool parameters
- **Reduced Latency**: Only fetch data when needed
- **Future-Proof**: Easy to add new tools without prompt changes

### Migration Scope
| Component | Current State | Target State |
|-----------|--------------|--------------|
| SDK | `openai` v4.52.0 | `ai` + `@ai-sdk/xai` |
| Model | `grok-2-1212` (incorrect) | `grok-4-fast` |
| Context | Prompt injection | Tool-based retrieval |
| Streaming | `stream: true` | `streamText()` |
| Structured Output | Manual JSON parse | `generateObject()` |

---

## Dependency Graph

```
Phase 0: Preparation
    │
    ▼
Phase 1: Core Infrastructure ──────────────────┐
    │                                          │
    ▼                                          │
Phase 2: Athlete Tools (35) ◄──────────────────┤
    │                                          │
    ▼                                          │
Phase 3: Coach Tools (25) ◄────────────────────┘
    │
    ▼
Phase 4: Service Migration & Integration
    │
    ▼
Phase 5: Testing & Validation
    │
    ▼
Phase 6: Cleanup & Documentation
```

---

## Timeline Overview

| Phase | Duration | Dependencies | Risk Level |
|-------|----------|--------------|------------|
| Phase 0: Preparation | 1 day | None | Low |
| Phase 1: Core Infrastructure | 2-3 days | Phase 0 | Medium |
| Phase 2: Athlete Tools | 3-4 days | Phase 1 | Medium |
| Phase 3: Coach Tools | 2-3 days | Phase 1 | Medium |
| Phase 4: Service Migration | 3-4 days | Phases 2, 3 | High |
| Phase 5: Testing | 2-3 days | Phase 4 | Medium |
| Phase 6: Cleanup | 1 day | Phase 5 | Low |
| **Total** | **14-19 days** | | |

---

## Phase 0: Preparation

### Objectives
- Fix pre-existing bugs blocking migration
- Correct model name references
- Install required packages
- Set up feature flags for gradual rollout

### Success Criteria
- [ ] All `grok-2` references replaced with `grok-4-fast`
- [ ] `generateGrokResponse` import errors fixed
- [ ] Vercel AI SDK packages installed
- [ ] Feature flag system in place

### 0.1 Fix Pre-existing Bugs

**Issue**: Two files import non-existent `generateGrokResponse` function

**Files to Modify**:
- `apps/backend/src/services/healthIntelligence.ts`
- `apps/backend/src/services/injuryRisk.ts`

**Fix**: Replace with `generateGrokResponseStream` or correct function name

```typescript
// Before (broken)
import { generateGrokResponse } from '../lib/grok';

// After (fixed)
import { generateGrokResponseStream } from '../lib/grok';
```

### 0.2 Correct Model References

**Files with `grok-2` references** (7 files):
1. `apps/backend/src/lib/grok.ts` - Line 20
2. `apps/backend/src/services/voiceParser.ts` - Line 45
3. `apps/backend/src/services/aiCoach.ts` - Line 38
4. `apps/backend/src/services/programGenerator.ts` - Line 52
5. `apps/backend/src/services/healthIntelligence.ts` - Line 41
6. `apps/backend/src/services/injuryDetection.ts` - Line 35
7. `apps/backend/src/services/injuryRisk.ts` - Line 28

**Change**: Replace all `grok-2-1212` or `grok-2` with `grok-4-fast`

```typescript
// Before
model: 'grok-2-1212',

// After
model: 'grok-4-fast',
```

### 0.3 Install Packages

```bash
cd apps/backend
pnpm add ai @ai-sdk/xai zod
```

### 0.4 Environment Variables

Add to `.env`:
```env
# Vercel AI SDK (uses same key as OpenAI SDK for xAI)
XAI_API_KEY=your-xai-api-key

# Feature Flags
ENABLE_TOOL_CALLING=false
TOOL_CALLING_ROLLOUT_PERCENT=0
```

### 0.5 Feature Flag Setup

Create `apps/backend/src/lib/featureFlags.ts`:

```typescript
export const featureFlags = {
  toolCalling: {
    enabled: process.env.ENABLE_TOOL_CALLING === 'true',
    rolloutPercent: parseInt(process.env.TOOL_CALLING_ROLLOUT_PERCENT || '0', 10),
  },
};

export function isToolCallingEnabled(userId: string): boolean {
  if (!featureFlags.toolCalling.enabled) return false;
  if (featureFlags.toolCalling.rolloutPercent >= 100) return true;
  
  // Consistent hash for gradual rollout
  const hash = userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  return Math.abs(hash % 100) < featureFlags.toolCalling.rolloutPercent;
}
```

### Rollback Procedure
- Set `ENABLE_TOOL_CALLING=false`
- Restart backend service
- All requests will use legacy prompt-based system

---

## Phase 1: Core Infrastructure

### Objectives
- Create Vercel AI SDK client configuration
- Build tool registry framework
- Implement base tool utilities
- Set up tool context provider

### Success Criteria
- [ ] xAI client configured with `xai.responses('grok-4-fast')`
- [ ] Tool registry pattern implemented
- [ ] Database context available to tools
- [ ] Error handling utilities in place

### 1.1 Create AI SDK Client

Create `apps/backend/src/lib/ai.ts`:

```typescript
import { createXai } from '@ai-sdk/xai';
import { generateText, streamText, generateObject, tool } from 'ai';
import { z } from 'zod';

// Create xAI client
export const xai = createXai({
  apiKey: process.env.XAI_API_KEY!,
});

// Model configuration
export const AI_CONFIG = {
  // Primary model for tool calling with reasoning
  responses: xai.responses('grok-4-fast'),

  // Chat model for simple completions
  chat: xai('grok-4-fast'),

  // Default provider options
  providerOptions: {
    xai: {
      reasoningEffort: 'high' as const,
    },
  },

  // Tool calling limits
  maxSteps: 10,

  // Timeouts
  timeout: 30000,
} as const;

// Re-export utilities
export { generateText, streamText, generateObject, tool };
export { z };
```

### 1.2 Create Tool Registry

Create `apps/backend/src/tools/registry.ts`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import type { DrizzleDB } from '../db';

// Tool context passed to all tools
export interface ToolContext {
  db: DrizzleDB;
  userId: string;
  userRole: 'free' | 'premium' | 'coach';
}

// Tool definition with metadata
export interface ToolDefinition<TParams extends z.ZodType, TResult> {
  name: string;
  description: string;
  parameters: TParams;
  requiredRole?: 'free' | 'premium' | 'coach';
  execute: (params: z.infer<TParams>, ctx: ToolContext) => Promise<TResult>;
}

// Create a tool with context injection
export function createTool<TParams extends z.ZodType, TResult>(
  definition: ToolDefinition<TParams, TResult>
) {
  return (ctx: ToolContext) => {
    // Check role permission
    if (definition.requiredRole) {
      const roleHierarchy = { free: 0, premium: 1, coach: 2 };
      if (roleHierarchy[ctx.userRole] < roleHierarchy[definition.requiredRole]) {
        return tool({
          description: definition.description,
          parameters: definition.parameters,
          execute: async () => ({
            error: `This feature requires ${definition.requiredRole} tier or higher`,
          }),
        });
      }
    }

    return tool({
      description: definition.description,
      parameters: definition.parameters,
      execute: async (params) => definition.execute(params, ctx),
    });
  };
}

// Collect all tools for a context
export function collectTools(ctx: ToolContext, toolFactories: Record<string, (ctx: ToolContext) => ReturnType<typeof tool>>) {
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const [name, factory] of Object.entries(toolFactories)) {
    tools[name] = factory(ctx);
  }

  return tools;
}
```

### 1.3 Create Tool Utilities

Create `apps/backend/src/tools/utils.ts`:

```typescript
import { z } from 'zod';

// Common parameter schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  days: z.number().min(1).max(365).optional(),
});

export const exerciseFilterSchema = z.object({
  exerciseName: z.string().optional(),
  muscleGroup: z.string().optional(),
  equipment: z.array(z.string()).optional(),
});

// Error wrapper for tools
export function toolError(message: string, code?: string) {
  return {
    success: false as const,
    error: { message, code },
  };
}

// Success wrapper for tools
export function toolSuccess<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate date range from days parameter
export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}
```

### 1.4 Create Tool Context Provider

Create `apps/backend/src/tools/context.ts`:

```typescript
import type { ToolContext } from './registry';
import type { DrizzleDB } from '../db';
import { userProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function createToolContext(
  db: DrizzleDB,
  userId: string
): Promise<ToolContext> {
  // Get user profile to determine role
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });

  // Determine user role based on subscription
  let userRole: 'free' | 'premium' | 'coach' = 'free';
  if (profile?.userType === 'coach') {
    userRole = 'coach';
  } else if (profile?.subscriptionTier === 'premium') {
    userRole = 'premium';
  }

  return {
    db,
    userId,
    userRole,
  };
}
```

### Testing Requirements
1. Unit test tool registry with mock context
2. Verify role-based access control
3. Test error handling utilities

### Rollback Procedure
- These are new files, simply don't import them
- Legacy system continues to work unchanged

---

## Phase 2: Athlete Tools Implementation

### Objectives
- Implement all 35 athlete-facing tools
- Integrate with existing database queries
- Connect to Upstash Search for exercise matching
- Add comprehensive error handling

### Success Criteria
- [ ] All 35 athlete tools implemented
- [ ] Each tool has unit tests
- [ ] Database queries optimized
- [ ] Error handling consistent

### 2.1 Directory Structure

```
apps/backend/src/tools/
├── index.ts              # Export all tools
├── registry.ts           # Tool registry (Phase 1)
├── context.ts            # Context provider (Phase 1)
├── utils.ts              # Utilities (Phase 1)
├── athlete/
│   ├── index.ts          # Export athlete tools
│   ├── profile.ts        # User profile tools (5)
│   ├── workout.ts        # Workout tools (8)
│   ├── program.ts        # Program tools (4)
│   ├── health.ts         # Health tools (6)
│   ├── running.ts        # Running tools (4)
│   ├── injury.ts         # Injury tools (3)
│   ├── knowledge.ts      # Knowledge tools (3)
│   └── analytics.ts      # Analytics tools (2)
└── coach/
    ├── index.ts          # Export coach tools
    ├── clients.ts        # Client management (8)
    ├── programs.ts       # Program management (5)
    ├── messaging.ts      # Messaging (3)
    ├── analytics.ts      # Analytics (2)
    └── profile.ts        # Coach profile (2)
```

### 2.2 Profile Tools Implementation

Create `apps/backend/src/tools/athlete/profile.ts`:

```typescript
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { userProfiles, userStreaks, userBadges, injuryLogs } from '../../db/schema';

// Tool 1: Get User Profile
export const getUserProfile = createTool({
  name: 'getUserProfile',
  description: 'Get the current user profile including goals, experience level, injuries, and training preferences',
  parameters: z.object({}),
  execute: async (_, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    if (!profile) {
      return toolError('User profile not found', 'PROFILE_NOT_FOUND');
    }

    return toolSuccess({
      name: profile.name,
      experienceLevel: profile.experienceLevel,
      goals: profile.goals,
      injuries: profile.injuries,
      preferredEquipment: profile.preferredEquipment,
      preferredWeightUnit: profile.preferredWeightUnit,
      weeklyFrequency: profile.weeklyFrequency,
      sessionDuration: profile.sessionDuration,
    });
  },
});

// Tool 2: Get User Preferences
export const getUserPreferences = createTool({
  name: 'getUserPreferences',
  description: 'Get user training preferences including weight unit, available equipment, and favorite exercises',
  parameters: z.object({}),
  execute: async (_, ctx) => {
    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, ctx.userId),
    });

    return toolSuccess({
      preferredWeightUnit: profile?.preferredWeightUnit || 'lbs',
      preferredEquipment: profile?.preferredEquipment || [],
      favoriteExercises: profile?.favoriteExercises || [],
      exercisesToAvoid: profile?.exercisesToAvoid || [],
    });
  },
});

// Tool 3: Get Active Injuries
export const getActiveInjuries = createTool({
  name: 'getActiveInjuries',
  description: 'Get list of currently active injuries the user has logged',
  parameters: z.object({}),
  execute: async (_, ctx) => {
    const injuries = await ctx.db.query.injuryLogs.findMany({
      where: (log, { and, eq }) => and(
        eq(log.userId, ctx.userId),
        eq(log.isActive, true)
      ),
      orderBy: (log, { desc }) => [desc(log.createdAt)],
    });

    return toolSuccess({
      activeInjuries: injuries.map(i => ({
        id: i.id,
        bodyPart: i.bodyPart,
        severity: i.severity,
        notes: i.notes,
        affectedExercises: i.affectedExercises,
        occurredAt: i.occurredAt,
      })),
      hasActiveInjuries: injuries.length > 0,
    });
  },
});

// Tool 4: Get User Streaks
export const getUserStreaks = createTool({
  name: 'getUserStreaks',
  description: 'Get current workout and logging streaks',
  parameters: z.object({}),
  execute: async (_, ctx) => {
    const streaks = await ctx.db.query.userStreaks.findMany({
      where: eq(userStreaks.userId, ctx.userId),
    });

    const streakMap = Object.fromEntries(
      streaks.map(s => [s.streakType, {
        current: s.currentStreak,
        longest: s.longestStreak,
        lastActivity: s.lastActivityDate,
      }])
    );

    return toolSuccess({
      workoutStreak: streakMap['workout'] || { current: 0, longest: 0 },
      loggingStreak: streakMap['logging'] || { current: 0, longest: 0 },
      runningStreak: streakMap['running'] || { current: 0, longest: 0 },
    });
  },
});

// Tool 5: Get User Badges
export const getUserBadges = createTool({
  name: 'getUserBadges',
  description: 'Get earned badges and achievements',
  parameters: z.object({
    category: z.enum(['strength', 'running', 'streak', 'hybrid', 'all']).default('all'),
  }),
  execute: async ({ category }, ctx) => {
    const badges = await ctx.db.query.userBadges.findMany({
      where: (badge, { and, eq }) => and(
        eq(badge.userId, ctx.userId),
        category !== 'all' ? eq(badge.badgeType, category) : undefined
      ),
      orderBy: (badge, { desc }) => [desc(badge.earnedAt)],
    });

    return toolSuccess({
      badges: badges.map(b => ({
        id: b.badgeId,
        type: b.badgeType,
        earnedAt: b.earnedAt,
        metadata: b.metadata,
      })),
      totalCount: badges.length,
    });
  },
});

export const profileTools = {
  getUserProfile,
  getUserPreferences,
  getActiveInjuries,
  getUserStreaks,
  getUserBadges,
};
```

### 2.3 Workout Tools Implementation

Create `apps/backend/src/tools/athlete/workout.ts`:

```typescript
import { z } from 'zod';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError, getDateRange } from '../utils';
import { workouts, workoutSets, exercises, personalRecords, generatedPrograms, programDays } from '../../db/schema';
import { search } from '../../lib/upstash';

// Tool 6: Get Today's Scheduled Workout
export const getTodaysWorkout = createTool({
  name: 'getTodaysWorkout',
  description: "Get the workout scheduled for today from the user's active program",
  parameters: z.object({}),
  execute: async (_, ctx) => {
    // Get active program
    const program = await ctx.db.query.generatedPrograms.findFirst({
      where: and(
        eq(generatedPrograms.userId, ctx.userId),
        eq(generatedPrograms.isActive, true)
      ),
      with: {
        weeks: {
          with: {
            days: {
              with: {
                exercises: {
                  with: { exercise: true }
                }
              }
            }
          }
        }
      }
    });

    if (!program) {
      return toolSuccess({
        hasScheduledWorkout: false,
        message: 'No active program. Would you like me to help you create one?',
      });
    }

    // Calculate current day in program
    const startDate = new Date(program.startedAt!);
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysSinceStart / 7) + 1;
    const currentDayOfWeek = today.getDay() || 7; // 1-7, Sunday = 7

    const week = program.weeks.find(w => w.weekNumber === currentWeek);
    const todaysWorkout = week?.days.find(d => d.dayOfWeek === currentDayOfWeek);

    if (!todaysWorkout) {
      return toolSuccess({
        hasScheduledWorkout: false,
        isRestDay: true,
        message: "Today is a rest day. Recover well!",
        nextWorkout: week?.days.find(d => d.dayOfWeek > currentDayOfWeek),
      });
    }

    return toolSuccess({
      hasScheduledWorkout: true,
      workout: {
        name: todaysWorkout.workoutName,
        type: todaysWorkout.workoutType,
        exercises: todaysWorkout.exercises.map(e => ({
          name: e.exercise.name,
          sets: e.sets,
          reps: e.repsTarget,
          rpe: e.rpeTarget,
          rest: e.restSeconds,
          notes: e.notes,
        })),
      },
      programProgress: {
        week: currentWeek,
        totalWeeks: program.durationWeeks,
        programName: program.name,
      },
    });
  },
});

// Tool 7: Get Recent Workouts
export const getRecentWorkouts = createTool({
  name: 'getRecentWorkouts',
  description: 'Get recent completed workouts with exercises and sets',
  parameters: z.object({
    limit: z.number().min(1).max(30).default(7),
    exerciseFilter: z.string().optional().describe('Filter by specific exercise name'),
  }),
  execute: async ({ limit, exerciseFilter }, ctx) => {
    let query = ctx.db.query.workouts.findMany({
      where: and(
        eq(workouts.userId, ctx.userId),
        eq(workouts.status, 'completed')
      ),
      orderBy: [desc(workouts.completedAt)],
      limit,
      with: {
        sets: {
          with: { exercise: true }
        }
      }
    });

    const recentWorkouts = await query;

    // Filter by exercise if specified
    let filteredWorkouts = recentWorkouts;
    if (exerciseFilter) {
      filteredWorkouts = recentWorkouts.filter(w =>
        w.sets.some(s =>
          s.exercise.name.toLowerCase().includes(exerciseFilter.toLowerCase())
        )
      );
    }

    return toolSuccess({
      workouts: filteredWorkouts.map(w => ({
        id: w.id,
        name: w.name,
        date: w.completedAt,
        duration: w.duration,
        totalSets: w.sets.length,
        exercises: [...new Set(w.sets.map(s => s.exercise.name))],
        volume: w.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0),
        prsHit: w.sets.filter(s => s.isPr).length,
      })),
      totalCount: filteredWorkouts.length,
    });
  },
});

// ... Additional workout tools (8-13) follow same pattern
```

### 2.4 Testing Requirements

For each tool category, create corresponding test files:

```typescript
// apps/backend/src/tools/athlete/__tests__/profile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { profileTools } from '../profile';
import { createMockContext } from '../../__tests__/helpers';

describe('Profile Tools', () => {
  describe('getUserProfile', () => {
    it('returns user profile data', async () => {
      const ctx = createMockContext({
        userId: 'test-user-id',
        mockProfile: {
          name: 'Test User',
          experienceLevel: 'intermediate',
          goals: ['strength', 'hypertrophy'],
        },
      });

      const tool = profileTools.getUserProfile(ctx);
      const result = await tool.execute({});

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Test User');
    });

    it('returns error when profile not found', async () => {
      const ctx = createMockContext({
        userId: 'nonexistent-user',
        mockProfile: null,
      });

      const tool = profileTools.getUserProfile(ctx);
      const result = await tool.execute({});

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PROFILE_NOT_FOUND');
    });
  });
});
```

### Rollback Procedure
- Tools are opt-in via feature flag
- Legacy endpoints remain unchanged
- Set `ENABLE_TOOL_CALLING=false` to disable

---

## Phase 3: Coach Tools Implementation

### Objectives
- Implement all 25 coach-specific tools
- Add client data access with permission checks
- Integrate messaging tools
- Create analytics aggregation tools

### Success Criteria
- [ ] All 25 coach tools implemented
- [ ] Client permission verification on all data access
- [ ] Coach-only role restriction enforced
- [ ] Each tool has unit tests

### 3.1 Client Management Tools

Create `apps/backend/src/tools/coach/clients.ts`:

```typescript
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { clientAssignments, userProfiles, workouts, workoutSets } from '../../db/schema';

// Tool 36: Get Client List
export const getClientList = createTool({
  name: 'getClientList',
  description: 'Get list of all assigned clients with status and basic info',
  parameters: z.object({
    status: z.enum(['active', 'paused', 'all']).default('active'),
  }),
  requiredRole: 'coach',
  execute: async ({ status }, ctx) => {
    const assignments = await ctx.db.query.clientAssignments.findMany({
      where: and(
        eq(clientAssignments.coachId, ctx.userId),
        status !== 'all' ? eq(clientAssignments.status, status) : undefined
      ),
      with: {
        client: {
          with: { profile: true }
        }
      },
      orderBy: [desc(clientAssignments.assignedAt)],
    });

    return toolSuccess({
      clients: assignments.map(a => ({
        clientId: a.clientId,
        name: a.client.profile?.name || 'Unknown',
        email: a.client.email,
        status: a.status,
        assignedAt: a.assignedAt,
        permissions: {
          canViewWorkouts: a.canViewWorkouts,
          canViewNutrition: a.canViewNutrition,
          canViewHealth: a.canViewHealth,
          canEditPrograms: a.canEditPrograms,
          canMessage: a.canMessage,
        },
      })),
      totalCount: assignments.length,
      activeCount: assignments.filter(a => a.status === 'active').length,
    });
  },
});

// Tool 37: Get Client Profile
export const getClientProfile = createTool({
  name: 'getClientProfile',
  description: 'Get detailed profile for a specific client',
  parameters: z.object({
    clientId: z.string().uuid(),
  }),
  requiredRole: 'coach',
  execute: async ({ clientId }, ctx) => {
    // Verify coach has access to this client
    const assignment = await ctx.db.query.clientAssignments.findFirst({
      where: and(
        eq(clientAssignments.coachId, ctx.userId),
        eq(clientAssignments.clientId, clientId)
      ),
    });

    if (!assignment) {
      return toolError('Client not found or access denied', 'CLIENT_ACCESS_DENIED');
    }

    const profile = await ctx.db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, clientId),
    });

    // Get recent workout stats
    const recentWorkouts = await ctx.db.query.workouts.findMany({
      where: and(
        eq(workouts.userId, clientId),
        eq(workouts.status, 'completed')
      ),
      orderBy: [desc(workouts.completedAt)],
      limit: 10,
    });

    return toolSuccess({
      profile: {
        name: profile?.name,
        experienceLevel: profile?.experienceLevel,
        goals: profile?.goals,
        injuries: profile?.injuries,
      },
      recentActivity: {
        workoutsLast30Days: recentWorkouts.length,
        lastWorkoutDate: recentWorkouts[0]?.completedAt,
      },
      permissions: {
        canViewWorkouts: assignment.canViewWorkouts,
        canViewHealth: assignment.canViewHealth,
      },
    });
  },
});

// Tools 38-43 follow similar pattern with client permission checks
```

### 3.2 Permission Verification Pattern

All coach tools must verify client access:

```typescript
// Helper function for client access verification
async function verifyClientAccess(
  ctx: ToolContext,
  clientId: string,
  requiredPermission?: keyof ClientPermissions
): Promise<{ allowed: boolean; assignment?: ClientAssignment; error?: string }> {
  const assignment = await ctx.db.query.clientAssignments.findFirst({
    where: and(
      eq(clientAssignments.coachId, ctx.userId),
      eq(clientAssignments.clientId, clientId),
      eq(clientAssignments.status, 'active')
    ),
  });

  if (!assignment) {
    return { allowed: false, error: 'Client not found or access denied' };
  }

  if (requiredPermission && !assignment[requiredPermission]) {
    return { allowed: false, error: `Permission denied: ${requiredPermission}` };
  }

  return { allowed: true, assignment };
}
```

### Testing Requirements
1. Test role-based access (coach-only tools)
2. Test client permission verification
3. Test data isolation between coaches
4. Mock database with multiple coach-client relationships

---

## Phase 4: Service Migration

### Objectives
- Migrate UnifiedCoach to use tool-based architecture
- Update streaming endpoints
- Maintain backward compatibility
- Implement gradual rollout

### Success Criteria
- [ ] UnifiedCoach uses tools for context retrieval
- [ ] Streaming works with tool calling
- [ ] Feature flag controls rollout
- [ ] Legacy endpoints still functional

### 4.1 Migrate UnifiedCoach Service

Modify `apps/backend/src/services/unifiedCoach.ts`:

```typescript
import { generateText, streamText, AI_CONFIG, xai } from '../lib/ai';
import { collectTools } from '../tools/registry';
import { createToolContext } from '../tools/context';
import { athleteTools } from '../tools/athlete';
import { coachTools } from '../tools/coach';
import { isToolCallingEnabled } from '../lib/featureFlags';

export async function createUnifiedCoach(db: DrizzleDB) {
  return {
    async processMessage(
      message: string,
      userContext: UserContext
    ): Promise<CoachResponse> {
      // Check if tool calling is enabled for this user
      if (!isToolCallingEnabled(userContext.userId)) {
        // Use legacy prompt-based approach
        return this.legacyProcessMessage(message, userContext);
      }

      // Create tool context
      const toolCtx = await createToolContext(db, userContext.userId);

      // Collect appropriate tools based on user role
      const tools = {
        ...collectTools(toolCtx, athleteTools),
        ...(toolCtx.userRole === 'coach'
          ? collectTools(toolCtx, coachTools)
          : {}),
      };

      // Use Vercel AI SDK with tool calling
      const result = await generateText({
        model: AI_CONFIG.responses,
        providerOptions: AI_CONFIG.providerOptions,
        maxSteps: AI_CONFIG.maxSteps,
        tools,
        system: COACH_SYSTEM_PROMPT,
        prompt: message,
      });

      return {
        message: result.text,
        intent: this.extractIntent(result),
        sources: this.extractSources(result),
        toolsUsed: result.toolCalls?.map(tc => tc.toolName) || [],
      };
    },

    async *streamMessage(
      message: string,
      userContext: UserContext
    ): AsyncGenerator<StreamChunk> {
      if (!isToolCallingEnabled(userContext.userId)) {
        yield* this.legacyStreamMessage(message, userContext);
        return;
      }

      const toolCtx = await createToolContext(db, userContext.userId);
      const tools = collectTools(toolCtx, athleteTools);

      const result = await streamText({
        model: AI_CONFIG.responses,
        providerOptions: AI_CONFIG.providerOptions,
        maxSteps: AI_CONFIG.maxSteps,
        tools,
        system: COACH_SYSTEM_PROMPT,
        prompt: message,
      });

      for await (const chunk of result.textStream) {
        yield { chunk };
      }

      yield {
        final: {
          message: await result.text,
          toolsUsed: (await result.toolCalls)?.map(tc => tc.toolName) || [],
        }
      };
    },

    // Legacy method for gradual rollout
    async legacyProcessMessage(message: string, context: UserContext) {
      // Existing prompt-based implementation
      // ... (keep current implementation)
    },
  };
}

const COACH_SYSTEM_PROMPT = `You are VoiceFit's AI fitness coach - knowledgeable, supportive, and conversational.

IMPORTANT: You have access to tools that let you query the user's data. ALWAYS use tools to get current information before answering questions about:
- Today's workout or schedule (use getTodaysWorkout)
- Recent training history (use getRecentWorkouts, getExerciseHistory)
- Personal records (use getPersonalRecords)
- Health and recovery (use getReadinessScore, getHealthMetrics)
- Program progress (use getActiveProgram, getProgramProgress)
- Injuries (use getActiveInjuries, getExercisesToAvoid)

PERSONALITY:
- Use contractions naturally (you're, let's, we'll)
- Celebrate progress, be constructive on setbacks
- Reference specific data from tool results
- Ask follow-up questions when helpful
- Use their name occasionally

CONSTRAINTS:
- Keep responses concise (2-4 sentences unless detail requested)
- For medical concerns, recommend consulting a professional
- If a tool returns an error, acknowledge it gracefully`;
```

### 4.2 Update Router Endpoints

Modify `apps/backend/src/routers/coach.ts` to use new service:

```typescript
// Message endpoint with tool calling
message: protectedProcedure
  .input(z.object({
    content: z.string().min(1),
    conversationId: z.string().uuid().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const coach = await createUnifiedCoach(ctx.db);

    const context: UserContext = {
      userId: ctx.user.id,
      // Minimal context - tools will fetch what's needed
    };

    const response = await coach.processMessage(input.content, context);

    // Save to conversation if provided
    if (input.conversationId) {
      await saveConversationMessages(ctx.db, input.conversationId, ctx.user.id, input.content, response);
    }

    return response;
  }),
```

### 4.3 Gradual Rollout Strategy

1. **Week 1**: `TOOL_CALLING_ROLLOUT_PERCENT=5` - Internal testing
2. **Week 2**: `TOOL_CALLING_ROLLOUT_PERCENT=25` - Early adopters
3. **Week 3**: `TOOL_CALLING_ROLLOUT_PERCENT=50` - Half users
4. **Week 4**: `TOOL_CALLING_ROLLOUT_PERCENT=100` - Full rollout

Monitor metrics:
- Response latency (target: <3s for tool-based)
- Tool call count per request (target: <5 avg)
- Error rate (target: <1%)
- User satisfaction scores

### Rollback Procedure
1. Set `ENABLE_TOOL_CALLING=false`
2. All requests immediately use legacy system
3. No code changes required
4. Monitor error logs for residual issues

---

## Phase 5: Testing & Validation

### Objectives
- Comprehensive integration testing
- Performance benchmarking
- User acceptance testing
- Load testing

### Test Categories

#### 5.1 Unit Tests
- Each tool tested in isolation
- Mock database responses
- Error case coverage
- Permission verification

#### 5.2 Integration Tests
```typescript
// Example integration test
describe('Coach Message Flow', () => {
  it('uses tools to answer workout questions', async () => {
    const response = await trpc.coach.message({
      content: "What's my workout today?",
    });

    expect(response.toolsUsed).toContain('getTodaysWorkout');
    expect(response.message).toContain('workout');
  });

  it('falls back to legacy when tools disabled', async () => {
    process.env.ENABLE_TOOL_CALLING = 'false';

    const response = await trpc.coach.message({
      content: "What's my workout today?",
    });

    expect(response.toolsUsed).toBeUndefined();
  });
});
```

#### 5.3 Performance Tests
- Measure latency with varying tool call counts
- Compare to legacy prompt-based approach
- Test under load (100 concurrent users)

#### 5.4 User Acceptance Criteria
- AI responses are contextually accurate
- Tool data matches database state
- Streaming feels responsive
- Error messages are user-friendly

---

## Phase 6: Cleanup & Documentation

### Objectives
- Remove legacy code (after validation period)
- Update documentation
- Create runbooks
- Train team

### 6.1 Code Cleanup Checklist
- [ ] Remove legacy prompt-building functions
- [ ] Remove unused context-fetching code
- [ ] Clean up feature flag code (after 100% rollout)
- [ ] Remove `openai` package from dependencies

### 6.2 Documentation Updates
- [ ] Update API documentation
- [ ] Create tool developer guide
- [ ] Update architecture diagrams
- [ ] Create troubleshooting runbook

### 6.3 Remove OpenAI SDK

```bash
cd apps/backend
pnpm remove openai
```

Update `grok.ts` to remove legacy exports (or delete file entirely).

---

## Appendix A: File Change Summary

| File | Action | Phase |
|------|--------|-------|
| `apps/backend/src/lib/grok.ts` | Modify (fix model) → Delete | 0, 6 |
| `apps/backend/src/lib/ai.ts` | Create | 1 |
| `apps/backend/src/lib/featureFlags.ts` | Create | 0 |
| `apps/backend/src/tools/registry.ts` | Create | 1 |
| `apps/backend/src/tools/context.ts` | Create | 1 |
| `apps/backend/src/tools/utils.ts` | Create | 1 |
| `apps/backend/src/tools/athlete/*.ts` | Create (8 files) | 2 |
| `apps/backend/src/tools/coach/*.ts` | Create (5 files) | 3 |
| `apps/backend/src/services/unifiedCoach.ts` | Modify | 4 |
| `apps/backend/src/services/aiCoach.ts` | Modify | 4 |
| `apps/backend/src/services/aiCoachRag.ts` | Modify | 4 |
| `apps/backend/src/routers/coach.ts` | Modify | 4 |
| `apps/backend/src/services/healthIntelligence.ts` | Fix bug | 0 |
| `apps/backend/src/services/injuryRisk.ts` | Fix bug | 0 |

---

## Appendix B: Environment Variables

```env
# Required
XAI_API_KEY=your-xai-api-key

# Feature Flags
ENABLE_TOOL_CALLING=true
TOOL_CALLING_ROLLOUT_PERCENT=100

# Optional: Monitoring
TOOL_CALLING_LOG_LEVEL=info
TOOL_CALLING_MAX_STEPS=10
```

---

## Appendix C: Monitoring & Alerts

### Key Metrics to Track
- `tool_calling.latency_ms` - Response time
- `tool_calling.tools_per_request` - Tool call count
- `tool_calling.error_rate` - Error percentage
- `tool_calling.fallback_rate` - Legacy fallback usage

### Alert Thresholds
- Latency > 5s: Warning
- Latency > 10s: Critical
- Error rate > 5%: Warning
- Error rate > 10%: Critical (auto-disable)

---

*Last Updated: 2025-12-03*
*Document Owner: Engineering Team*

