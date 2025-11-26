/**
 * AI Program Generation Service
 *
 * Generates personalized training programs based on questionnaire responses.
 * Uses RAG (Upstash Search) for knowledge retrieval and Grok for generation.
 * Saves programs to database and creates calendar entries.
 */

import { generateCompletion, TEMPERATURES } from '../lib/grok';
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
  restSeconds: number;
  notes?: string;
  supersetGroup?: number;
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
          index: SEARCH_INDEXES.KNOWLEDGE_BASE,
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
              "exerciseName": "Bench Press",
              "exerciseOrder": 1,
              "sets": 4,
              "repsTarget": "8-10",
              "rpeTarget": 7,
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

RULES:
1. Include progressive overload across weeks
2. Include deload week every 4-5 weeks
3. Account for injuries and equipment
4. Be specific with exercise names
5. For running, vary easy/hard days
6. Include rest days

Return ONLY valid JSON.`;

export async function generateFullProgram(
  questionnaire: ProgramQuestionnaireData,
  db?: PostgresJsDatabase<typeof schema>
): Promise<GeneratedProgram> {
  // Get RAG context
  const ragContext = await getRAGContext(questionnaire);

  // Build prompt
  const userPrompt = buildGenerationPrompt(questionnaire, ragContext);

  // Generate
  const response = await generateCompletion({
    systemPrompt: FULL_PROGRAM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 8000,
  });

  try {
    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    const program = JSON.parse(cleaned) as GeneratedProgram;
    program.ragSources = [
      ...ragContext.trainingPrinciples,
      ...ragContext.programTemplates,
    ].slice(0, 5);
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
    if (questionnaire.currentBenchPress) {
      parts.push(`Current Bench: ${questionnaire.currentBenchPress} lbs`);
    }
    if (questionnaire.currentSquat) {
      parts.push(`Current Squat: ${questionnaire.currentSquat} lbs`);
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
