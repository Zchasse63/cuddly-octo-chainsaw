/**
 * AI Program Generation Service
 *
 * Generates personalized training programs based on questionnaire responses.
 * Uses RAG (Upstash Search) for knowledge retrieval and xAI for generation.
 * Saves programs to database and creates calendar entries.
 */

import { generateCompletion, TEMPERATURES } from '../lib/ai';
import { search, cache } from '../lib/upstash';
import { SEARCH_INDEXES } from './searchIndexer';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { eq, ilike } from 'drizzle-orm';
import type { ProgramQuestionnaireData } from '../db/schema/onboarding';
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export interface GeneratedProgram {
  name: string;
  description: string;
  programType: 'strength' | 'running' | 'hybrid' | 'crossfit';
  durationWeeks: number;
  daysPerWeek: number;
  primaryGoal: string;
  weeks: GeneratedWeek[];
  ragSources: string[];
  /** Message explaining the weight prescription approach */
  weightPrescriptionMessage?: string;
}

export interface GeneratedWeek {
  weekNumber: number;
  name: string;
  focus: string;
  description: string;
  days: GeneratedDay[];
}

export interface GeneratedDay {
  dayOfWeek: number;
  dayNumber: number;
  workoutType: string;
  name: string;
  description: string;
  estimatedDuration: number;
  // For strength
  exercises?: GeneratedExercise[];
  // For running
  runType?: string;
  targetDistanceMeters?: number;
  targetDurationSeconds?: number;
  targetPace?: string;
  intervals?: any[];
  // Notes
  warmupNotes?: string;
  cooldownNotes?: string;
  coachNotes?: string;
}

export interface GeneratedExercise {
  exerciseName: string;
  exerciseOrder: number;
  sets: number;
  repsTarget: string;
  rpeTarget?: number;
  percentageOf1rm?: number;
  targetWeight?: number | null;
  restSeconds: number;
  notes?: string;
  supersetGroup?: number;
}

// User maxes from questionnaire for weight calculations
interface UserMaxes {
  benchPress?: number;
  squat?: number;
  deadlift?: number;
}

// Compound lift patterns for matching exercises to user maxes
const COMPOUND_PATTERNS: Record<keyof UserMaxes, RegExp[]> = {
  benchPress: [
    /bench\s*press/i,
    /flat\s*(barbell|dumbbell)?\s*bench/i,
    /incline\s*(barbell)?\s*bench\s*press/i,
    /decline\s*(barbell)?\s*bench\s*press/i,
  ],
  squat: [
    /back\s*squat/i,
    /barbell\s*(back)?\s*squat/i,
    /front\s*squat/i,
    /squat\s*(?!jump|thrust)/i,
  ],
  deadlift: [
    /deadlift/i,
    /sumo\s*deadlift/i,
    /conventional\s*deadlift/i,
    /romanian\s*deadlift/i,
    /rdl/i,
  ],
};

// Get user max for an exercise based on name pattern matching
function getUserMaxForExercise(exerciseName: string, userMaxes: UserMaxes): { max: number; liftType: string } | null {
  for (const [liftType, patterns] of Object.entries(COMPOUND_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(exerciseName)) {
        const max = userMaxes[liftType as keyof UserMaxes];
        if (max) {
          return { max, liftType };
        }
      }
    }
  }
  return null;
}

// Calculate target weight from percentage of 1RM
function calculateTargetWeight(percentageOf1rm: number, max: number): number {
  return Math.round((percentageOf1rm / 100) * max / 5) * 5; // Round to nearest 5 lbs
}

// Legacy types for backward compatibility
const ProgramExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  rpe: z.number(),
  rest_seconds: z.number(),
  notes: z.string().nullable().optional(),
});

const ProgramSessionSchema = z.object({
  day: z.number(),
  name: z.string(),
  exercises: z.array(ProgramExerciseSchema),
});

const ProgramWeekSchema = z.object({
  week_number: z.number(),
  sessions: z.array(ProgramSessionSchema),
});

export type ProgramSession = z.infer<typeof ProgramSessionSchema>;
export type ProgramExercise = z.infer<typeof ProgramExerciseSchema>;

// Legacy params interface
export interface ProgramParams {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  frequency: number;
  duration: number;
  equipment: string[];
  injuries?: string;
  favoriteExercises?: string[];
  exercisesToAvoid?: string[];
  preferredRepRanges?: string;
}

// ============================================
// RAG KNOWLEDGE RETRIEVAL
// ============================================

interface RAGContext {
  trainingPrinciples: string[];
  exerciseRecommendations: string[];
  programTemplates: string[];
  injuryConsiderations: string[];
}

async function getRAGContext(questionnaire: ProgramQuestionnaireData): Promise<RAGContext> {
  const context: RAGContext = {
    trainingPrinciples: [],
    exerciseRecommendations: [],
    programTemplates: [],
    injuryConsiderations: [],
  };

  const queries: Array<{ query: string; category: string; target: keyof RAGContext }> = [];

  // Training principles based on goal
  queries.push({
    query: `${questionnaire.primaryGoal} training principles ${questionnaire.experienceLevel}`,
    category: 'strength',
    target: 'trainingPrinciples',
  });

  // Program structure
  if (questionnaire.trainingType === 'strength_only' || questionnaire.trainingType === 'hybrid') {
    queries.push({
      query: `${questionnaire.preferredSplit || 'push pull legs'} workout split ${questionnaire.daysPerWeek} days`,
      category: 'program',
      target: 'programTemplates',
    });
  }

  if (questionnaire.trainingType === 'running_only' || questionnaire.trainingType === 'hybrid') {
    queries.push({
      query: `${questionnaire.targetRaceDistance || '5k'} training plan ${questionnaire.experienceLevel}`,
      category: 'running',
      target: 'programTemplates',
    });
  }

  // Injury considerations
  if (questionnaire.currentInjuries?.length) {
    for (const injury of questionnaire.currentInjuries.slice(0, 2)) {
      queries.push({
        query: `${injury} injury exercise modifications safe alternatives`,
        category: 'injury',
        target: 'injuryConsiderations',
      });
    }
  }

  // Execute searches in parallel
  const results = await Promise.all(
    queries.map(async (q) => {
      try {
        const searchResults = await search.query({
          index: SEARCH_INDEXES.KNOWLEDGE,
          query: q.query,
          topK: 3,
          filter: q.category ? `category = "${q.category}"` : undefined,
        });

        return {
          target: q.target,
          content: searchResults.map((r) => {
            const data = r.data as Record<string, string>;
            return `${data.title || ''}: ${data.content || ''}`;
          }),
        };
      } catch (error) {
        console.error(`RAG search error for ${q.query}:`, error);
        return { target: q.target, content: [] };
      }
    })
  );

  for (const result of results) {
    context[result.target].push(...result.content);
  }

  return context;
}

// ============================================
// PROGRAM GENERATION
// ============================================

const FULL_PROGRAM_PROMPT = `You are an expert fitness coach generating a personalized training program.

OUTPUT FORMAT (JSON):
{
  "name": "Program name",
  "description": "Brief description",
  "programType": "strength" | "running" | "hybrid",
  "durationWeeks": number,
  "daysPerWeek": number,
  "primaryGoal": "string",
  "weeks": [
    {
      "weekNumber": 1,
      "name": "Week 1: Foundation",
      "focus": "volume" | "intensity" | "deload" | "peak",
      "description": "Week description",
      "days": [
        {
          "dayOfWeek": 1,
          "dayNumber": 1,
          "workoutType": "push" | "pull" | "legs" | "upper" | "lower" | "full_body" | "easy_run" | "tempo_run" | "interval_run" | "long_run" | "rest",
          "name": "Push Day A",
          "description": "Focus on...",
          "estimatedDuration": 60,
          "exercises": [
            {
              "exerciseName": "Barbell Bench Press",
              "exerciseOrder": 1,
              "sets": 4,
              "repsTarget": "8-10",
              "rpeTarget": 7,
              "percentageOf1rm": 75,
              "restSeconds": 90,
              "notes": "Focus on control"
            }
          ],
          "warmupNotes": "...",
          "cooldownNotes": "...",
          "coachNotes": "..."
        }
      ]
    }
  ]
}

WEIGHT PRESCRIPTION (CRITICAL):
- For PRIMARY COMPOUND LIFTS (Squat, Bench Press, Deadlift, Romanian Deadlift, Front Squat, Incline Bench Press):
  * ALWAYS include "percentageOf1rm" field with the target percentage (e.g., 70, 75, 80, 85)
  * Use appropriate percentages based on rep ranges: 8-10 reps = 70-75%, 5-6 reps = 80-85%, 3-4 reps = 85-90%
  * During deload weeks, reduce percentages by 10-15%

- For ACCESSORY/ISOLATION MOVEMENTS (bicep curls, tricep extensions, lat pulldowns, leg extensions, lateral raises, etc.):
  * Use "rpeTarget" only (7-9 range typically)
  * Do NOT include "percentageOf1rm" for these exercises
  * We don't have baseline data for accessories yet

RULES:
1. Include progressive overload across weeks (increase percentages for compounds by 2-5% each non-deload week)
2. Include deload week every 4-5 weeks
3. Account for injuries and equipment
4. Be specific with exercise names (e.g., "Barbell Back Squat" not just "Squat")
5. For running, vary easy/hard days
6. Include rest days
7. CRITICAL: Return COMPLETE, valid JSON for ALL weeks. Do not truncate or cut off the response.
8. CRITICAL: Include "percentageOf1rm" for ALL compound barbell movements (squat, bench, deadlift variations)

Return ONLY valid JSON.`;

export async function generateFullProgram(
  questionnaire: ProgramQuestionnaireData,
  db?: PostgresJsDatabase<typeof schema>
): Promise<GeneratedProgram> {
  // Get RAG context
  const ragContext = await getRAGContext(questionnaire);

  // Build prompt
  const userPrompt = buildGenerationPrompt(questionnaire, ragContext);

  // Calculate token needs based on program size
  // A 12-week program with 4-6 days/week and 5-8 exercises per day needs significant tokens
  // Each week ~4000 tokens, 12 weeks = ~48,000 tokens minimum
  const durationWeeks = questionnaire.programDuration || 12;
  const daysPerWeek = questionnaire.daysPerWeek || 4;
  const estimatedTokensPerWeek = daysPerWeek * 800; // ~800 tokens per day with exercises
  const baseTokens = 2000; // For program metadata
  const maxTokens = Math.max(64000, baseTokens + (estimatedTokensPerWeek * durationWeeks));

  // Generate with complexity set to 'longform' for full program generation
  // 'longform' uses grok-3-fast which can generate large JSON outputs (12-week programs)
  // The reasoning model (grok-4-1-fast-reasoning) has limited output capacity
  const response = await generateCompletion({
    systemPrompt: FULL_PROGRAM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens,
    complexity: 'longform',
  });

  try {
    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    const program = JSON.parse(cleaned) as GeneratedProgram;
    program.ragSources = [
      ...ragContext.trainingPrinciples,
      ...ragContext.programTemplates,
    ].slice(0, 5);

    // Post-process: Calculate target weights for compound lifts
    const userMaxes: UserMaxes = {
      benchPress: questionnaire.currentBenchPress || undefined,
      squat: questionnaire.currentSquat || undefined,
      deadlift: questionnaire.currentDeadlift || undefined,
    };

    let hasCompoundWithWeights = false;
    let hasAccessoryWithRPE = false;

    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.exercises) {
          for (const exercise of day.exercises) {
            const matchedMax = getUserMaxForExercise(exercise.exerciseName, userMaxes);

            if (matchedMax && exercise.percentageOf1rm) {
              // Compound lift with user max - calculate target weight
              exercise.targetWeight = calculateTargetWeight(exercise.percentageOf1rm, matchedMax.max);
              hasCompoundWithWeights = true;
            } else if (exercise.percentageOf1rm && !matchedMax) {
              // Has percentage but no user max - use percentage only
              exercise.targetWeight = null;
            } else {
              // Accessory - RPE only, no target weight
              exercise.targetWeight = null;
              if (exercise.rpeTarget) {
                hasAccessoryWithRPE = true;
              }
            }
          }
        }
      }
    }

    // Add user communication message
    const hasAnyMaxes = userMaxes.benchPress || userMaxes.squat || userMaxes.deadlift;
    if (hasAnyMaxes && hasCompoundWithWeights) {
      program.weightPrescriptionMessage =
        "For compound lifts (squat, bench press, deadlift), we've calculated specific weight targets based on your current maxes. " +
        "For accessory exercises, we're using RPE (Rate of Perceived Exertion) since we don't have baseline data yet. " +
        "As you log workouts, we'll build your exercise history and provide specific weight targets for these movements in future programs.";
    } else if (hasAccessoryWithRPE) {
      program.weightPrescriptionMessage =
        "This program uses RPE (Rate of Perceived Exertion) to guide intensity. " +
        "As you log workouts and we learn your strength levels, future programs will include specific weight targets.";
    }

    return program;
  } catch (error) {
    console.error('Program generation parse error:', error);
    throw new Error('Failed to generate valid program structure');
  }
}

function buildGenerationPrompt(
  questionnaire: ProgramQuestionnaireData,
  ragContext: RAGContext
): string {
  const parts: string[] = [];

  parts.push('=== USER PROFILE ===');
  parts.push(`Training Type: ${questionnaire.trainingType}`);
  parts.push(`Primary Goal: ${questionnaire.primaryGoal}`);
  parts.push(`Experience Level: ${questionnaire.experienceLevel}`);
  parts.push(`Days Per Week: ${questionnaire.daysPerWeek}`);
  parts.push(`Session Duration: ${questionnaire.sessionDuration} minutes`);

  parts.push('\n=== EQUIPMENT ===');
  parts.push(`Location: ${questionnaire.trainingLocation || 'Gym'}`);
  parts.push(`Available: ${questionnaire.availableEquipment?.join(', ') || 'Full gym'}`);

  if (questionnaire.trainingType !== 'running_only') {
    parts.push('\n=== STRENGTH DETAILS ===');
    parts.push(`Preferred Split: ${questionnaire.preferredSplit || 'No preference'}`);

    // Include current maxes for compound lift weight calculations
    parts.push('\n=== CURRENT 1RM MAXES (for %1RM calculations) ===');
    if (questionnaire.currentBenchPress) {
      parts.push(`Bench Press 1RM: ${questionnaire.currentBenchPress} lbs`);
    }
    if (questionnaire.currentSquat) {
      parts.push(`Squat 1RM: ${questionnaire.currentSquat} lbs`);
    }
    if (questionnaire.currentDeadlift) {
      parts.push(`Deadlift 1RM: ${questionnaire.currentDeadlift} lbs`);
    }

    if (questionnaire.currentBenchPress || questionnaire.currentSquat || questionnaire.currentDeadlift) {
      parts.push('(Use these maxes to set appropriate percentageOf1rm values for compound lifts)');
    }
  }

  if (questionnaire.trainingType !== 'strength_only') {
    parts.push('\n=== RUNNING DETAILS ===');
    parts.push(`Target Race: ${questionnaire.targetRaceDistance || 'General fitness'}`);
    parts.push(`Current Weekly Mileage: ${questionnaire.weeklyMileage || 0} km`);
  }

  parts.push('\n=== HEALTH ===');
  parts.push(`Injuries: ${questionnaire.currentInjuries?.join(', ') || 'None'}`);
  parts.push(`Avoid: ${questionnaire.exercisesToAvoid?.join(', ') || 'None'}`);

  parts.push('\n=== PREFERENCES ===');
  parts.push(`Favorites: ${questionnaire.favoriteExercises?.join(', ') || 'None'}`);
  parts.push(`Program Duration: ${questionnaire.programDuration || 8} weeks`);

  if (ragContext.trainingPrinciples.length > 0) {
    parts.push('\n=== TRAINING KNOWLEDGE ===');
    parts.push(ragContext.trainingPrinciples.slice(0, 2).join('\n'));
  }

  if (ragContext.injuryConsiderations.length > 0) {
    parts.push('\n=== INJURY CONSIDERATIONS ===');
    parts.push(ragContext.injuryConsiderations.slice(0, 2).join('\n'));
  }

  parts.push('\n\nGenerate a complete training program.');

  return parts.join('\n');
}

// ============================================
// SAVE TO DATABASE
// ============================================

export async function saveProgramToDatabase(
  program: GeneratedProgram,
  userId: string,
  questionnaire: ProgramQuestionnaireData,
  db: PostgresJsDatabase<typeof schema>
): Promise<string> {
  // Create main program
  const [trainingProgram] = await db
    .insert(schema.trainingPrograms)
    .values({
      userId,
      name: program.name,
      description: program.description,
      programType: program.programType,
      durationWeeks: program.durationWeeks,
      daysPerWeek: program.daysPerWeek,
      primaryGoal: program.primaryGoal,
      questionnaireResponses: questionnaire as any,
      ragSources: program.ragSources,
      status: 'draft',
      isPremium: true,
    })
    .returning();

  const programId = trainingProgram.id;
  let totalWorkouts = 0;

  // Create weeks and days
  for (const week of program.weeks) {
    const [programWeek] = await db
      .insert(schema.programWeeks)
      .values({
        programId,
        weekNumber: week.weekNumber,
        name: week.name,
        focus: week.focus,
        description: week.description,
      })
      .returning();

    for (const day of week.days) {
      if (day.workoutType !== 'rest') totalWorkouts++;

      const [programDay] = await db
        .insert(schema.programDays)
        .values({
          programId,
          weekId: programWeek.id,
          weekNumber: week.weekNumber,
          dayOfWeek: day.dayOfWeek,
          dayNumber: day.dayNumber,
          workoutType: day.workoutType as any,
          name: day.name,
          description: day.description,
          estimatedDuration: day.estimatedDuration,
          targetDistanceMeters: day.targetDistanceMeters,
          targetPace: day.targetPace,
          intervals: day.intervals,
          warmupNotes: day.warmupNotes,
          cooldownNotes: day.cooldownNotes,
          coachNotes: day.coachNotes,
        })
        .returning();

      // Create exercises
      if (day.exercises?.length) {
        for (const exercise of day.exercises) {
          const matchedExercise = await db.query.exercises.findFirst({
            where: ilike(schema.exercises.name, `%${exercise.exerciseName}%`),
          });

          if (matchedExercise) {
            await db.insert(schema.programExercises).values({
              programDayId: programDay.id,
              exerciseId: matchedExercise.id,
              exerciseOrder: exercise.exerciseOrder,
              sets: exercise.sets,
              repsTarget: exercise.repsTarget,
              rpeTarget: exercise.rpeTarget,
              restSeconds: exercise.restSeconds,
              notes: exercise.notes,
            });
          }
        }
      }
    }
  }

  await db
    .update(schema.trainingPrograms)
    .set({ totalWorkoutsScheduled: totalWorkouts })
    .where(eq(schema.trainingPrograms.id, programId));

  return programId;
}

// ============================================
// ACTIVATE & CREATE CALENDAR
// ============================================

export async function activateProgram(
  programId: string,
  startDate: Date,
  db: PostgresJsDatabase<typeof schema>
): Promise<void> {
  const program = await db.query.trainingPrograms.findFirst({
    where: eq(schema.trainingPrograms.id, programId),
    with: { days: true },
  });

  if (!program) throw new Error('Program not found');

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + program.durationWeeks * 7);

  await db
    .update(schema.trainingPrograms)
    .set({
      status: 'active',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      currentWeek: 1,
      currentDay: 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.trainingPrograms.id, programId));

  // Create calendar entries
  for (const day of program.days) {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + (day.weekNumber - 1) * 7 + day.dayOfWeek);

    const activityType = day.workoutType?.includes('run') ? 'running' : 'strength';

    await db.insert(schema.trainingCalendar).values({
      userId: program.userId,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      activityType,
      programId,
      programDayId: day.id,
      title: day.name || `${day.workoutType} workout`,
      description: day.description,
      workoutType: day.workoutType,
      estimatedDuration: day.estimatedDuration,
      status: 'scheduled',
    });

    await db
      .update(schema.programDays)
      .set({ scheduledDate: scheduledDate.toISOString().split('T')[0] })
      .where(eq(schema.programDays.id, day.id));
  }
}

// ============================================
// LEGACY FUNCTIONS (backward compatibility)
// ============================================

export async function generateProgram(
  params: ProgramParams,
  ragContext?: string
): Promise<any> {
  const userPrompt = `Create a 12-week program:
Experience: ${params.experienceLevel}
Goals: ${params.goals.join(', ')}
Days/week: ${params.frequency}
Duration: ${params.duration} min
Equipment: ${params.equipment.join(', ')}
Injuries: ${params.injuries || 'None'}
${ragContext ? `\nContext:\n${ragContext}` : ''}`;

  const response = await generateCompletion({
    systemPrompt: FULL_PROGRAM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 8000,
  });

  const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
  return JSON.parse(cleaned);
}

export async function generateQuickWorkout(params: {
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';
  duration: number;
  equipment: string[];
  experience: string;
}): Promise<ProgramSession> {
  const response = await generateCompletion({
    systemPrompt: `Generate a single workout session. Return JSON:
{
  "day": 1,
  "name": "Workout Name",
  "exercises": [{ "name": "...", "sets": 3, "reps": "8-12", "rpe": 7, "rest_seconds": 90, "notes": null }]
}`,
    userPrompt: `${params.type} workout, ${params.duration} min, equipment: ${params.equipment.join(', ')}, experience: ${params.experience}`,
    temperature: TEMPERATURES.coaching,
    maxTokens: 1500,
  });

  const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
  return ProgramSessionSchema.parse(JSON.parse(cleaned));
}
