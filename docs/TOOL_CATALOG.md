# VoiceFit Tool Catalog

**Version:** 1.0  
**Total Tools:** 60  
**Last Updated:** 2025-12-03  

---

## Overview

This document provides a comprehensive reference for all 60 tools available in VoiceFit's AI coaching system. Tools enable the AI to autonomously query user data, providing contextually accurate responses.

### Tool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Model (grok-4-fast)                   │
│              xai.responses() with reasoningEffort: 'high'   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tool Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tool Registry                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Athlete Tools   │  │  Coach Tools    │  │ Future Tools│ │
│  │    (35)         │  │     (25)        │  │    (4+)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Database Queries
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Drizzle ORM + Upstash                    │
│              PostgreSQL (Supabase) + Search                 │
└─────────────────────────────────────────────────────────────┘
```

### Permission Tiers

| Tier | Access | Rate Limit |
|------|--------|------------|
| **Free** | Basic athlete tools | 60/hour |
| **Premium** | All athlete tools + health | 300/hour |
| **Coach** | All tools including client management | 500/hour |

---

## Quick Reference

### Athlete Tools (35)

| Category | Count | Tools |
|----------|-------|-------|
| User Profile | 5 | getUserProfile, getUserPreferences, getActiveInjuries, getUserStreaks, getUserBadges |
| Workout | 8 | getTodaysWorkout, getRecentWorkouts, getExerciseHistory, getPersonalRecords, logWorkoutSet, getActiveWorkout, searchExercises, getExerciseSubstitutes |
| Program | 4 | getActiveProgram, getProgramProgress, getUpcomingWorkouts, getProgramWeek |
| Health | 6 | getReadinessScore, getHealthMetrics, getSleepData, getDailySummary, getFatigueScore, getNutritionLog |
| Running | 4 | getRecentRuns, getRunningPRs, getRunningStats, getShoeMileage |
| Injury | 3 | getInjuryHistory, getInjuryRiskAssessment, getExercisesToAvoid |
| Knowledge | 3 | searchKnowledgeBase, getExerciseFormTips, getTrainingPrinciples |
| Analytics | 2 | getVolumeAnalytics, getProgressTrends |

### Coach Tools (25)

| Category | Count | Tools |
|----------|-------|-------|
| Client Management | 8 | getClientList, getClientProfile, getClientWorkouts, getClientProgress, getClientHealthData, getClientProgram, getClientCheckIns, getCoachNotes |
| Program Management | 5 | getProgramTemplates, assignProgramToClient, getProgramAdherence, getBulkAssignmentStatus, getCSVImportStatus |
| Messaging | 3 | getClientConversations, getConversationMessages, sendMessageToClient |
| Analytics | 2 | getClientAnalyticsSummary, getAtRiskClients |
| Profile | 2 | getCoachProfile, getPendingInvitations |
| Injury | 1 | getClientInjuries |
| Future | 4 | getWatchSyncStatus, analyzeFormVideo, detectPlateau, getRecoveryPrediction |

---

## Category 1: User Profile & Context

### Tool 1: getUserProfile

**Description:** Get the current user profile including goals, experience level, injuries, and training preferences.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})  // No parameters required
```

**Returns:**
```typescript
{
  success: true,
  data: {
    name: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    goals: string[];
    injuries: string | null;
    preferredEquipment: string[];
    preferredWeightUnit: 'lbs' | 'kg';
    weeklyFrequency: number;
    sessionDuration: number;
  }
}
```

**Database Query:**
```typescript
db.query.userProfiles.findFirst({
  where: eq(userProfiles.userId, ctx.userId),
});
```

**Example AI Usage:**
> User: "What exercises should I avoid?"  
> AI uses: `getUserProfile` → checks injuries field  
> AI: "Based on your profile, you have a shoulder issue. I'd recommend avoiding overhead pressing movements..."

**Error Handling:**
```typescript
if (!profile) {
  return toolError('User profile not found', 'PROFILE_NOT_FOUND');
}
```

---

### Tool 2: getUserPreferences

**Description:** Get user training preferences including weight unit, available equipment, and favorite exercises.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    preferredWeightUnit: 'lbs' | 'kg';
    preferredEquipment: string[];
    favoriteExercises: string[];
    exercisesToAvoid: string[];
  }
}
```

---

### Tool 3: getActiveInjuries

**Description:** Get list of currently active injuries the user has logged.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    activeInjuries: Array<{
      id: string;
      bodyPart: string;
      severity: 'mild' | 'moderate' | 'severe';
      notes: string | null;
      affectedExercises: string[];
      occurredAt: Date;
    }>;
    hasActiveInjuries: boolean;
  }
}
```

---

### Tool 4: getUserStreaks

**Description:** Get current workout and logging streaks.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    workoutStreak: { current: number; longest: number; lastActivity: Date | null };
    loggingStreak: { current: number; longest: number; lastActivity: Date | null };
    runningStreak: { current: number; longest: number; lastActivity: Date | null };
  }
}
```

---

### Tool 5: getUserBadges

**Description:** Get earned badges and achievements.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  category: z.enum(['strength', 'running', 'streak', 'hybrid', 'all']).default('all')
    .describe('Filter badges by category'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    badges: Array<{
      id: string;
      type: 'strength' | 'running' | 'streak' | 'hybrid';
      earnedAt: Date;
      metadata: Record<string, any>;
    }>;
    totalCount: number;
  }
}
```

---

## Category 2: Workout & Training

### Tool 6: getTodaysWorkout

**Description:** Get the workout scheduled for today from the user's active program.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasScheduledWorkout: boolean;
    isRestDay?: boolean;
    workout?: {
      name: string;
      type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        rpe: number;
        rest: number;
        notes: string | null;
      }>;
    };
    programProgress?: {
      week: number;
      totalWeeks: number;
      programName: string;
    };
    message?: string;
    nextWorkout?: ProgramDay;
  }
}
```

**Database Query:**
```typescript
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
            exercises: { with: { exercise: true } }
          }
        }
      }
    }
  }
});
```

**Example AI Usage:**
> User: "What should I do today?"
> AI uses: `getTodaysWorkout`
> AI: "Today is Push Day A! You've got bench press, overhead press, and tricep work. Week 3 of 12 in your Strength Builder program. Ready to crush it?"

---

### Tool 7: getRecentWorkouts

**Description:** Get recent completed workouts with exercises and sets.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  limit: z.number().min(1).max(30).default(7)
    .describe('Number of workouts to return'),
  exerciseFilter: z.string().optional()
    .describe('Filter by specific exercise name'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    workouts: Array<{
      id: string;
      name: string;
      date: Date;
      duration: number;
      totalSets: number;
      exercises: string[];
      volume: number;
      prsHit: number;
    }>;
    totalCount: number;
  }
}
```

---

### Tool 8: getExerciseHistory

**Description:** Get history for a specific exercise including all sets, weights, and PRs.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  exerciseName: z.string()
    .describe('Name of the exercise to get history for'),
  limit: z.number().min(1).max(100).default(20)
    .describe('Number of sets to return'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    exercise: {
      id: string;
      name: string;
      primaryMuscle: string;
      equipment: string[];
    };
    sets: Array<{
      date: Date;
      weight: number;
      weightUnit: 'lbs' | 'kg';
      reps: number;
      rpe: number | null;
      isPR: boolean;
    }>;
    personalRecords: Array<{
      prType: '1rm' | '3rm' | '5rm' | 'volume';
      value: number;
      achievedAt: Date;
    }>;
  }
}
```

**Integration with Upstash Search:**
```typescript
// Fuzzy match exercise name
const exerciseMatches = await search.query({
  index: 'exercises',
  query: exerciseName,
  topK: 1,
});
const exerciseId = exerciseMatches[0]?.id;
```

---

### Tool 9: getPersonalRecords

**Description:** Get personal records for exercises.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  exerciseName: z.string().optional()
    .describe('Filter by specific exercise'),
  prType: z.enum(['1rm', '3rm', '5rm', 'volume']).optional()
    .describe('Filter by PR type'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    records: Array<{
      exerciseName: string;
      exerciseId: string;
      prType: '1rm' | '3rm' | '5rm' | 'volume';
      value: number;
      weight: number;
      reps: number;
      achievedAt: Date;
      improvementPercent: number | null;
    }>;
    totalPRs: number;
    recentPRs: number; // Last 30 days
  }
}
```

---

### Tool 10: logWorkoutSet

**Description:** Log a workout set during an active workout session.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  exerciseName: z.string()
    .describe('Name of the exercise'),
  weight: z.number().min(0)
    .describe('Weight used'),
  weightUnit: z.enum(['lbs', 'kg'])
    .describe('Weight unit'),
  reps: z.number().min(1)
    .describe('Number of reps completed'),
  rpe: z.number().min(1).max(10).optional()
    .describe('Rate of perceived exertion (1-10)'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    setId: string;
    exerciseId: string;
    setNumber: number;
    isPR: boolean;
    confirmation: string;
    prDetails?: {
      type: '1rm' | '3rm' | '5rm';
      previousBest: number;
      improvement: number;
    };
  }
}
```

**Example AI Usage:**
> User: "225 for 8"
> AI uses: `logWorkoutSet` with { exerciseName: currentExercise, weight: 225, weightUnit: 'lbs', reps: 8 }
> AI: "Got it! Bench press: 225 × 8. That's set 3. One more to go!"

---

### Tool 11: getActiveWorkout

**Description:** Get the currently active workout session with logged sets.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasActiveWorkout: boolean;
    workout?: {
      id: string;
      name: string;
      startedAt: Date;
      duration: number;
      sets: Array<{
        exerciseName: string;
        weight: number;
        reps: number;
        isPR: boolean;
      }>;
      currentExercise: string | null;
      totalVolume: number;
    };
  }
}
```

---

### Tool 12: searchExercises

**Description:** Search the exercise database by name, muscle group, or equipment.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  query: z.string()
    .describe('Search query for exercise name'),
  muscleGroup: z.string().optional()
    .describe('Filter by primary muscle group'),
  equipment: z.array(z.string()).optional()
    .describe('Filter by available equipment'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    exercises: Array<{
      id: string;
      name: string;
      primaryMuscle: string;
      secondaryMuscles: string[];
      equipment: string[];
      movementPattern: string;
      isCompound: boolean;
      confidence: number; // Search relevance
    }>;
    totalResults: number;
  }
}
```

**Integration with Upstash Search:**
```typescript
const results = await search.query({
  index: 'exercises',
  query: query,
  filter: muscleGroup ? `primary_muscle = "${muscleGroup}"` : undefined,
  topK: 10,
});
```

---

### Tool 13: getExerciseSubstitutes

**Description:** Get substitute exercises considering injuries and equipment.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  exerciseName: z.string()
    .describe('Exercise to find substitutes for'),
  reason: z.enum(['injury', 'equipment', 'preference']).optional()
    .describe('Reason for seeking substitute'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    original: {
      name: string;
      primaryMuscle: string;
    };
    substitutes: Array<{
      name: string;
      rank: number;
      reasoning: string;
      equipmentRequired: string[];
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      safeForCurrentInjuries: boolean;
    }>;
  }
}
```

---

## Category 3: Program Management

### Tool 14: getActiveProgram

**Description:** Get the user's active training program with full structure.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasActiveProgram: boolean;
    program?: {
      id: string;
      name: string;
      goal: string;
      durationWeeks: number;
      startedAt: Date;
      currentWeek: number;
      frequency: number;
      splitType: string;
      weeks: Array<{
        weekNumber: number;
        focus: string;
        days: Array<{
          dayOfWeek: number;
          workoutName: string;
          workoutType: string;
          exerciseCount: number;
        }>;
      }>;
    };
  }
}
```

---

### Tool 15: getProgramProgress

**Description:** Get progress metrics for the active program.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    adherenceRate: number;
    completedWorkouts: number;
    scheduledWorkouts: number;
    workoutsRemaining: number;
    daysUntilCompletion: number;
    streakDays: number;
    volumeProgression: {
      weeklyVolume: number[];
      trend: 'increasing' | 'stable' | 'decreasing';
    };
    strengthGains: Array<{
      exercise: string;
      startWeight: number;
      currentWeight: number;
      percentIncrease: number;
    }>;
  }
}
```

---

### Tool 16: getUpcomingWorkouts

**Description:** Get scheduled workouts for the next N days.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  days: z.number().min(1).max(14).default(7)
    .describe('Number of days to look ahead'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    upcomingWorkouts: Array<{
      date: Date;
      dayOfWeek: string;
      workoutName: string;
      workoutType: string;
      exercises: string[];
      estimatedDuration: number;
      isRestDay: boolean;
    }>;
  }
}
```

---

### Tool 17: getProgramWeek

**Description:** Get detailed view of a specific week in the program.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  weekNumber: z.number().optional()
    .describe('Week number (defaults to current week)'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    weekNumber: number;
    focus: string;
    days: Array<{
      dayOfWeek: number;
      dayName: string;
      workoutName: string;
      workoutType: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        rpe: number;
        notes: string | null;
      }>;
      completed: boolean;
      completedAt: Date | null;
    }>;
    weeklyTargets: {
      totalSets: number;
      focusMuscles: string[];
    };
  }
}
```

---

## Category 4: Health & Recovery

### Tool 18: getReadinessScore

**Description:** Get current readiness score from wearable data.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasReadinessData: boolean;
    readiness?: {
      score: number; // 0-100
      level: 'low' | 'moderate' | 'optimal' | 'high';
      factors: {
        sleep: number;
        hrv: number;
        recovery: number;
        strain: number;
      };
      recommendation: string;
      lastUpdated: Date;
    };
    source: 'apple_health' | 'whoop' | 'oura' | 'garmin';
  }
}
```

**Database Query:**
```typescript
const readiness = await ctx.db.query.dailyReadiness.findFirst({
  where: and(
    eq(dailyReadiness.userId, ctx.userId),
    gte(dailyReadiness.recordedAt, startOfDay(new Date()))
  ),
  orderBy: [desc(dailyReadiness.recordedAt)],
});
```

---

### Tool 19: getHealthMetrics

**Description:** Get health metrics from connected wearables.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  metric: z.enum(['hrv', 'resting_hr', 'steps', 'calories', 'all']).default('all'),
  days: z.number().min(1).max(90).default(7),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    metrics: {
      hrv?: { avg: number; min: number; max: number; trend: string };
      restingHR?: { avg: number; min: number; max: number; trend: string };
      steps?: { avg: number; total: number; trend: string };
      caloriesBurned?: { avg: number; total: number };
    };
    dataSource: string;
    lastSync: Date;
  }
}
```

---

### Tool 20: getSleepData

**Description:** Get sleep data from connected wearables.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  days: z.number().min(1).max(30).default(7),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    sleepRecords: Array<{
      date: Date;
      duration: number; // minutes
      quality: 'poor' | 'fair' | 'good' | 'excellent';
      deepSleep: number;
      remSleep: number;
      lightSleep: number;
      awakeTime: number;
    }>;
    averages: {
      duration: number;
      quality: string;
      consistency: number;
    };
    recommendation: string;
  }
}
```

---

### Tool 21: getDailySummary

**Description:** Get today's activity and health summary.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    date: Date;
    workout: {
      completed: boolean;
      name: string | null;
      duration: number | null;
      sets: number;
      prs: number;
    };
    activity: {
      steps: number;
      caloriesBurned: number;
      activeMinutes: number;
    };
    nutrition: {
      logged: boolean;
      calories: number | null;
      protein: number | null;
    };
    sleep: {
      duration: number | null;
      quality: string | null;
    };
    readiness: number | null;
  }
}
```

---

### Tool 22: getFatigueScore

**Description:** Get accumulated fatigue assessment.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    fatigueScore: number; // 0-100
    level: 'fresh' | 'manageable' | 'accumulated' | 'overreached';
    factors: {
      trainingLoad7d: number;
      trainingLoad28d: number;
      acuteChronicRatio: number;
      sleepDebt: number;
    };
    recommendation: string;
    suggestedDeload: boolean;
  }
}
```

---

### Tool 23: getNutritionLog

**Description:** Get recent nutrition logging data.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  days: z.number().min(1).max(30).default(7),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    entries: Array<{
      date: Date;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      meals: Array<{ name: string; time: Date }>;
    }>;
    averages: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    proteinTarget: number;
    isOnTrack: boolean;
  }
}
```

---

## Category 5: Running & Cardio

### Tool 24: getRecentRuns

**Description:** Get recent running activities with stats.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  limit: z.number().min(1).max(50).default(10),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    runs: Array<{
      id: string;
      date: Date;
      distance: number;
      distanceUnit: 'miles' | 'km';
      duration: number;
      pace: string;
      avgHeartRate: number | null;
      elevation: number | null;
      type: 'easy' | 'tempo' | 'interval' | 'long' | 'race';
      notes: string | null;
    }>;
    weeklyMileage: number;
    monthlyMileage: number;
  }
}
```

---

### Tool 25: getRunningPRs

**Description:** Get running personal records by distance.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  distance: z.enum(['1mi', '5k', '10k', 'half', 'marathon', 'all']).default('all'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    records: Array<{
      distance: string;
      time: string;
      pace: string;
      achievedAt: Date;
      conditions: string | null;
    }>;
  }
}
```

---

### Tool 26: getRunningStats

**Description:** Get aggregated running statistics.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  period: z.enum(['week', 'month', 'year', 'all']).default('month'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    period: string;
    totalRuns: number;
    totalDistance: number;
    totalDuration: number;
    avgPace: string;
    avgDistance: number;
    longestRun: number;
    elevationGain: number;
    consistency: number; // runs per week avg
  }
}
```

---

### Tool 27: getShoeMileage

**Description:** Get mileage tracked on running shoes.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    shoes: Array<{
      id: string;
      brand: string;
      model: string;
      mileage: number;
      maxMileage: number;
      percentUsed: number;
      needsReplacement: boolean;
      purchaseDate: Date | null;
    }>;
    activeShoe: string | null;
  }
}
```

---

## Category 6: Injury Management

### Tool 28: getInjuryHistory

**Description:** Get full injury history including resolved injuries.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  includeResolved: z.boolean().default(true),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    injuries: Array<{
      id: string;
      bodyPart: string;
      side: 'left' | 'right' | 'bilateral' | null;
      severity: 'mild' | 'moderate' | 'severe';
      status: 'active' | 'healing' | 'resolved';
      occurredAt: Date;
      resolvedAt: Date | null;
      notes: string | null;
      affectedExercises: string[];
    }>;
    recurringIssues: Array<{
      bodyPart: string;
      occurrences: number;
    }>;
  }
}
```

---

### Tool 29: getInjuryRiskAssessment

**Description:** Get AI-powered injury risk assessment.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    overallRisk: 'low' | 'moderate' | 'high';
    factors: Array<{
      factor: string;
      risk: 'low' | 'moderate' | 'high';
      recommendation: string;
    }>;
    atRiskMuscleGroups: Array<{
      muscleGroup: string;
      reason: string;
    }>;
    recommendations: string[];
  }
}
```

---

### Tool 30: getExercisesToAvoid

**Description:** Get exercises to avoid based on active injuries.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    avoidExercises: Array<{
      exercise: string;
      reason: string;
      relatedInjury: string;
    }>;
    modifiedExercises: Array<{
      exercise: string;
      modification: string;
      reason: string;
    }>;
  }
}
```

---

## Category 7: Knowledge & RAG

### Tool 31: searchKnowledgeBase

**Description:** Search the fitness knowledge base using RAG.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  query: z.string()
    .describe('Natural language question about fitness'),
  category: z.enum(['training', 'nutrition', 'recovery', 'form', 'all']).default('all'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    results: Array<{
      content: string;
      category: string;
      source: string;
      relevance: number;
    }>;
    directAnswer: string | null;
  }
}
```

**Integration with Upstash Search:**
```typescript
const results = await search.query({
  index: 'knowledge',
  query: query,
  filter: category !== 'all' ? `category = "${category}"` : undefined,
  topK: 5,
});
```

---

### Tool 32: getExerciseFormTips

**Description:** Get form tips and cues for an exercise.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  exerciseName: z.string(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    exercise: string;
    formCues: string[];
    commonMistakes: string[];
    setupTips: string;
    breathingPattern: string;
    musclesWorked: {
      primary: string[];
      secondary: string[];
    };
    videoUrl: string | null;
  }
}
```

---

### Tool 33: getTrainingPrinciples

**Description:** Get training principles and concepts from knowledge base.

**Tier Required:** Free

**Parameters:**
```typescript
z.object({
  topic: z.string()
    .describe('Training topic to learn about'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    topic: string;
    explanation: string;
    practicalApplication: string;
    relatedConcepts: string[];
    sources: string[];
  }
}
```

---

## Category 8: Analytics

### Tool 34: getVolumeAnalytics

**Description:** Get training volume analytics by muscle group.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  period: z.enum(['week', 'month']).default('week'),
  muscleGroup: z.string().optional(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    period: string;
    volumeByMuscle: Record<string, {
      sets: number;
      targetSets: number;
      percentOfTarget: number;
    }>;
    undertrainedMuscles: string[];
    overtrainedMuscles: string[];
    weekOverWeekChange: number;
  }
}
```

---

### Tool 35: getProgressTrends

**Description:** Get long-term progress trends for strength.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  exerciseNames: z.array(z.string()).optional(),
  period: z.enum(['3m', '6m', '1y', 'all']).default('3m'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    exercises: Array<{
      name: string;
      dataPoints: Array<{
        date: Date;
        estimated1RM: number;
      }>;
      trend: 'increasing' | 'stable' | 'decreasing';
      percentChange: number;
    }>;
    overallStrengthIndex: number;
    periodSummary: string;
  }
}
```

---

## Category 9: Coach - Client Management

### Tool 36: getClientList

**Description:** Get list of all assigned clients with status.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  status: z.enum(['active', 'paused', 'all']).default('active'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    clients: Array<{
      clientId: string;
      name: string;
      email: string;
      status: 'active' | 'paused';
      assignedAt: Date;
      permissions: {
        canViewWorkouts: boolean;
        canViewNutrition: boolean;
        canViewHealth: boolean;
        canEditPrograms: boolean;
        canMessage: boolean;
      };
    }>;
    totalCount: number;
    activeCount: number;
  }
}
```

---

### Tool 37: getClientProfile

**Description:** Get detailed profile for a specific client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    profile: {
      name: string;
      experienceLevel: string;
      goals: string[];
      injuries: string[];
    };
    recentActivity: {
      workoutsLast30Days: number;
      lastWorkoutDate: Date | null;
    };
    permissions: {
      canViewWorkouts: boolean;
      canViewHealth: boolean;
    };
  }
}
```

**Error Handling:**
```typescript
if (!assignment) {
  return toolError('Client not found or access denied', 'CLIENT_ACCESS_DENIED');
}
```

---

### Tool 38: getClientWorkouts

**Description:** Get recent workouts for a specific client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  limit: z.number().min(1).max(30).default(10),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    workouts: Array<{
      id: string;
      name: string;
      date: Date;
      duration: number;
      exercises: string[];
      totalSets: number;
      notes: string | null;
    }>;
    adherenceRate: number;
  }
}
```

---

### Tool 39: getClientProgress

**Description:** Get progress metrics for a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  period: z.enum(['1m', '3m', '6m']).default('3m'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    period: string;
    workoutAdherence: number;
    totalWorkouts: number;
    prsAchieved: number;
    strengthProgress: Array<{
      exercise: string;
      startWeight: number;
      currentWeight: number;
      percentIncrease: number;
    }>;
    programCompletion: number;
  }
}
```

---

### Tool 40: getClientHealthData

**Description:** Get health metrics for a client (with permission).

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  days: z.number().min(1).max(30).default(7),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasPermission: boolean;
    healthData?: {
      readinessScores: Array<{ date: Date; score: number }>;
      avgSleep: number;
      avgHRV: number;
      fatigueLevel: string;
    };
  }
}
```

---

### Tool 41: getClientProgram

**Description:** Get the active program assigned to a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    hasProgram: boolean;
    program?: {
      id: string;
      name: string;
      templateId: string | null;
      startedAt: Date;
      currentWeek: number;
      totalWeeks: number;
      adherenceRate: number;
      lastModified: Date;
    };
  }
}
```

---

### Tool 42: getClientCheckIns

**Description:** Get check-in notes and communication history.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(10),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    checkIns: Array<{
      id: string;
      date: Date;
      type: 'weekly' | 'progress' | 'adhoc';
      notes: string;
      nextAction: string | null;
    }>;
  }
}
```

---

### Tool 43: getCoachNotes

**Description:** Get coach's private notes about a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    notes: Array<{
      id: string;
      content: string;
      createdAt: Date;
      updatedAt: Date;
      pinned: boolean;
    }>;
  }
}
```

---

## Category 10: Coach - Program Management

### Tool 44: getProgramTemplates

**Description:** Get coach's saved program templates.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  goal: z.string().optional(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    templates: Array<{
      id: string;
      name: string;
      goal: string;
      durationWeeks: number;
      frequency: number;
      assignedToCount: number;
      lastUsed: Date | null;
    }>;
  }
}
```

---

### Tool 45: assignProgramToClient

**Description:** Assign a program template to a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  templateId: z.string().uuid(),
  startDate: z.string().optional(),
  customizations: z.object({
    adjustVolume: z.number().optional(),
    excludeExercises: z.array(z.string()).optional(),
  }).optional(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    programId: string;
    clientId: string;
    startDate: Date;
    confirmation: string;
  }
}
```

---

### Tool 46: getProgramAdherence

**Description:** Get adherence stats for clients on programs.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid().optional(),
  period: z.enum(['week', 'month']).default('week'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    adherenceByClient: Array<{
      clientId: string;
      clientName: string;
      programName: string;
      scheduledWorkouts: number;
      completedWorkouts: number;
      adherenceRate: number;
      streak: number;
    }>;
    averageAdherence: number;
    atRiskClients: string[];
  }
}
```

---

### Tool 47: getBulkAssignmentStatus

**Description:** Get status of bulk program assignments.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  batchId: z.string().uuid().optional(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    batches: Array<{
      batchId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      totalClients: number;
      processedClients: number;
      errors: string[];
      createdAt: Date;
    }>;
  }
}
```

---

### Tool 48: getCSVImportStatus

**Description:** Get status of CSV data imports.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    recentImports: Array<{
      id: string;
      fileName: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      rowsProcessed: number;
      totalRows: number;
      errors: string[];
      importedAt: Date;
    }>;
  }
}
```

---

## Category 11: Coach - Messaging

### Tool 49: getClientConversations

**Description:** Get list of client conversations.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  unreadOnly: z.boolean().default(false),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    conversations: Array<{
      clientId: string;
      clientName: string;
      lastMessage: string;
      lastMessageAt: Date;
      unreadCount: number;
      isUrgent: boolean;
    }>;
    totalUnread: number;
  }
}
```

---

### Tool 50: getConversationMessages

**Description:** Get messages in a conversation with a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    messages: Array<{
      id: string;
      sender: 'coach' | 'client';
      content: string;
      sentAt: Date;
      readAt: Date | null;
    }>;
    hasMore: boolean;
  }
}
```

---

### Tool 51: sendMessageToClient

**Description:** Send a message to a client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
  content: z.string().min(1).max(1000),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    messageId: string;
    sentAt: Date;
    confirmation: string;
  }
}
```

---

## Category 12: Coach - Analytics

### Tool 52: getClientAnalyticsSummary

**Description:** Get aggregated analytics across all clients.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  period: z.enum(['week', 'month']).default('week'),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    period: string;
    activeClients: number;
    totalWorkoutsCompleted: number;
    avgAdherence: number;
    totalPRs: number;
    clientsAtRisk: number;
    mostActiveClient: { name: string; workouts: number };
    leastActiveClient: { name: string; daysSinceLastWorkout: number };
  }
}
```

---

### Tool 53: getAtRiskClients

**Description:** Get clients who may need attention.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    atRiskClients: Array<{
      clientId: string;
      clientName: string;
      riskFactors: Array<{
        factor: string;
        severity: 'low' | 'medium' | 'high';
        details: string;
      }>;
      suggestedAction: string;
      daysSinceLastWorkout: number;
      daysSinceLastMessage: number;
    }>;
    totalAtRisk: number;
  }
}
```

---

## Category 13: Coach - Profile

### Tool 54: getCoachProfile

**Description:** Get the coach's profile and settings.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    profile: {
      name: string;
      email: string;
      specializations: string[];
      clientCapacity: number;
      currentClientCount: number;
    };
    settings: {
      defaultPermissions: {
        canViewWorkouts: boolean;
        canViewNutrition: boolean;
        canViewHealth: boolean;
      };
      notificationPreferences: {
        newClient: boolean;
        missedWorkout: boolean;
        clientMessage: boolean;
      };
    };
  }
}
```

---

### Tool 55: getPendingInvitations

**Description:** Get pending client invitations.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    invitations: Array<{
      id: string;
      email: string;
      sentAt: Date;
      expiresAt: Date;
      status: 'pending' | 'expired';
    }>;
    pendingCount: number;
  }
}
```

---

## Category 14: Coach - Client Injuries

### Tool 56: getClientInjuries

**Description:** Get injury information for a specific client.

**Tier Required:** Coach

**Parameters:**
```typescript
z.object({
  clientId: z.string().uuid(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    activeInjuries: Array<{
      id: string;
      bodyPart: string;
      severity: 'mild' | 'moderate' | 'severe';
      notes: string | null;
      affectedExercises: string[];
      occurredAt: Date;
    }>;
    injuryHistory: Array<{
      bodyPart: string;
      occurrences: number;
      lastOccurrence: Date;
    }>;
  }
}
```

---

## Category 15: Future/Planned Tools

### Tool 57: getWatchSyncStatus (Planned)

**Description:** Get Apple Watch sync status and latest data.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    isConnected: boolean;
    lastSync: Date | null;
    watchModel: string | null;
    dataTypes: string[];
    pendingSync: number;
  }
}
```

---

### Tool 58: analyzeFormVideo (Planned)

**Description:** Analyze exercise form from video upload.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  videoUrl: z.string().url(),
  exerciseName: z.string(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    overallScore: number;
    issues: Array<{
      timestamp: number;
      issue: string;
      severity: 'minor' | 'major';
      correction: string;
    }>;
    strengths: string[];
    recommendations: string[];
  }
}
```

---

### Tool 59: detectPlateau (Planned)

**Description:** Detect training plateaus and suggest solutions.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({
  exerciseName: z.string().optional(),
})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    plateausDetected: Array<{
      exercise: string;
      duration: number;
      lastPR: Date;
      suggestedInterventions: string[];
    }>;
    overallProgression: 'progressing' | 'stable' | 'plateaued';
  }
}
```

---

### Tool 60: getRecoveryPrediction (Planned)

**Description:** Predict recovery time based on workout data.

**Tier Required:** Premium

**Parameters:**
```typescript
z.object({})
```

**Returns:**
```typescript
{
  success: true,
  data: {
    predictedRecovery: {
      hoursUntilRecovered: number;
      muscleGroupRecovery: Record<string, number>;
    };
    factors: {
      sleepImpact: number;
      volumeImpact: number;
      intensityImpact: number;
    };
    recommendation: string;
  }
}
```

---

## Best Practices

### When to Use Which Tools

| User Question | Tools to Use |
|---------------|--------------|
| "What's my workout today?" | `getTodaysWorkout` |
| "How am I progressing?" | `getProgramProgress`, `getProgressTrends` |
| "What's my bench PR?" | `getPersonalRecords` (filter by exercise) |
| "Should I train today?" | `getReadinessScore`, `getFatigueScore`, `getSleepData` |
| "What can I do for chest with my injury?" | `getActiveInjuries`, `getExercisesToAvoid`, `searchExercises` |
| "Give me form tips for deadlift" | `getExerciseFormTips` |
| "How's my client John doing?" | `getClientProfile`, `getClientProgress` |

### Combining Tools for Complex Queries

The AI should use multiple tools when needed:

```
User: "What should I work on today considering how I slept?"

Tool calls:
1. getTodaysWorkout() → Get scheduled workout
2. getSleepData({ days: 1 }) → Check last night's sleep
3. getReadinessScore() → Get overall readiness

AI Response: "You have Push Day scheduled, but you only got 5.5 hours of sleep
and your readiness is at 62%. I'd suggest either doing a lighter version
of the workout or taking today as active recovery."
```

### Performance Considerations

1. **Minimize Tool Calls**: Prefer tools that return comprehensive data over multiple specific tools
2. **Use Caching**: Tool results for the same user/day can be cached
3. **Limit Pagination**: Request only the data needed (use `limit` parameters)
4. **Batch When Possible**: Use tool parameters that accept multiple inputs

### Caching Strategy

```typescript
// Cache configuration by tool
const CACHE_TTL = {
  getUserProfile: 3600,      // 1 hour (rarely changes)
  getTodaysWorkout: 300,     // 5 min (may change during day)
  getRecentWorkouts: 60,     // 1 min (changes after logging)
  getReadinessScore: 3600,   // 1 hour (updates once daily)
  getActiveWorkout: 10,      // 10 sec (real-time during workout)
};
```

---

## Code Examples

### Registering Tools with Vercel AI SDK

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { xai, AI_CONFIG } from '../lib/ai';
import { createToolContext } from '../tools/context';
import { athleteTools } from '../tools/athlete';

async function processMessage(db: DrizzleDB, userId: string, message: string) {
  // Create context for tools
  const ctx = await createToolContext(db, userId);

  // Build tools object
  const tools = Object.fromEntries(
    Object.entries(athleteTools).map(([name, factory]) => [
      name,
      factory(ctx),
    ])
  );

  // Call AI with tools
  const result = await generateText({
    model: AI_CONFIG.responses,
    providerOptions: AI_CONFIG.providerOptions,
    maxSteps: 10,
    tools,
    system: SYSTEM_PROMPT,
    prompt: message,
  });

  return result;
}
```

### Handling Tool Results in AI Response

```typescript
// The AI response includes tool call information
const result = await generateText({
  model: AI_CONFIG.responses,
  tools,
  prompt: "What's my bench press PR?",
});

// Access tool calls and results
console.log(result.toolCalls);
// [{ toolName: 'getPersonalRecords', args: { exerciseName: 'bench press' }, result: { ... } }]

console.log(result.text);
// "Your bench press PR is 225 lbs for 5 reps, achieved on November 15th!"
```

### Testing Tools in Isolation

```typescript
// apps/backend/src/tools/athlete/__tests__/workout.test.ts
import { describe, it, expect, vi } from 'vitest';
import { workoutTools } from '../workout';
import { createMockDb, createMockContext } from '../../__tests__/helpers';

describe('getTodaysWorkout', () => {
  it('returns scheduled workout for today', async () => {
    const mockDb = createMockDb({
      generatedPrograms: [{
        id: 'prog-1',
        userId: 'user-1',
        isActive: true,
        startedAt: new Date('2025-11-25'),
        weeks: [/* mock weeks */],
      }],
    });

    const ctx = createMockContext({
      db: mockDb,
      userId: 'user-1',
    });

    const tool = workoutTools.getTodaysWorkout(ctx);
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(result.data.hasScheduledWorkout).toBe(true);
    expect(result.data.workout).toBeDefined();
  });

  it('returns rest day message when no workout scheduled', async () => {
    // ... test rest day scenario
  });
});
```

---

## Error Codes Reference

| Code | Description | Tool Categories |
|------|-------------|-----------------|
| `PROFILE_NOT_FOUND` | User profile doesn't exist | Profile |
| `WORKOUT_NOT_FOUND` | Workout ID not found | Workout |
| `EXERCISE_NOT_FOUND` | Exercise not in database | Workout, Knowledge |
| `NO_ACTIVE_PROGRAM` | User has no active program | Program |
| `NO_ACTIVE_WORKOUT` | No workout in progress | Workout |
| `CLIENT_ACCESS_DENIED` | Coach doesn't have access to client | Coach |
| `PERMISSION_DENIED` | Role doesn't have permission | All |
| `RATE_LIMITED` | Too many requests | All |
| `WEARABLE_NOT_CONNECTED` | No wearable data source | Health |
| `INVALID_DATE_RANGE` | Date parameters invalid | Analytics |

---

*Last Updated: 2025-12-03*
*Total Tools: 60*
*Document Owner: Engineering Team*

