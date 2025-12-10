import { search, cache } from '../lib/upstash';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

/**
 * Actual Upstash Search index names (category-based)
 * These match the indexes in the Upstash dashboard
 */
export const UPSTASH_INDEXES = {
  // Large general-purpose indexes
  GENERAL: 'general', // 3577 docs - main knowledge base
  STRUCTURED_KNOWLEDGE: 'structured-knowledge', // 245 docs
  STRENGTH_AND_HYPERTROPHY: 'strength-and-hypertrophy', // 632 docs

  // Topic-specific indexes
  HYPERTROPHY: 'hypertrophy', // 38 docs
  STRENGTH_TRAINING: 'strength-training', // 22 docs
  NUTRITION_AND_SUPPLEMENTATION: 'nutrition-and-supplementation', // 164 docs
  NUTRITION: 'nutrition', // 4 docs
  RECOVERY: 'recovery', // 4 docs
  RECOVERY_AND_PERFORMANCE: 'recovery-and-performance', // 150 docs
  FITNESS_ASSESSMENT: 'fitness-assessment', // 150 docs

  // Technique indexes
  SQUAT_TECHNIQUE: 'squat-technique', // 8 docs
  STICKING_POINTS: 'sticking-points', // 14 docs
  MOVEMENT_PATTERNS: 'movement-patterns', // 6 docs

  // Programming indexes
  PROGRAMMING: 'programming', // 14 docs
  PROGRAM_TEMPLATES: 'program-templates', // 3 docs
  PROGRAM_TEMPLATE: 'program-template', // 24 docs
  POWERLIFTING_PROGRAMS: 'powerlifting-programs', // 24 docs
  PERIODIZATION_CONCEPTS: 'periodization-concepts', // 3 docs
  PERIODIZATION_THEORY: 'periodization-theory', // 6 docs
  AUTOREGULATION: 'autoregulation', // 15 docs
  FATIGUE_MANAGEMENT: 'fatigue-management', // 10 docs

  // Other
  BEGINNER_FUNDAMENTALS: 'beginner-fundamentals', // 10 docs
  INJURY_PREVENTION: 'injury-prevention', // 7 docs
  INJURY_MANAGEMENT: 'injury-management', // 13 docs
  ADHERENCE: 'adherence', // 8 docs
  CALISTHENICS: 'calisthenics', // 11 docs
  MOBILITY_FLEXIBILITY: 'mobility-flexibility', // 5 docs
} as const;

/**
 * Legacy index name mappings for backward compatibility
 * Maps old code references to new multi-index queries
 */
export const SEARCH_INDEXES = {
  // Legacy names that map to actual indexes
  EXERCISES: 'general', // Exercise info is in general index
  KNOWLEDGE: 'general', // General knowledge
  KNOWLEDGE_BASE: 'general', // Alias for code using KNOWLEDGE_BASE
  EXERCISE_CUES: 'squat-technique', // Technique cues (will also query sticking-points)
} as const;

/**
 * Get relevant indexes for a given query context
 */
export function getIndexesForContext(context: {
  intent?: string;
  exerciseName?: string;
  category?: string;
}): string[] {
  const indexes: string[] = [];
  const { intent, exerciseName, category } = context;

  // Always include general as fallback
  const includeGeneral = true;

  // Map intent to indexes
  if (intent) {
    switch (intent) {
      case 'exercise_question':
        indexes.push(UPSTASH_INDEXES.STRENGTH_AND_HYPERTROPHY);
        indexes.push(UPSTASH_INDEXES.MOVEMENT_PATTERNS);
        break;
      case 'nutrition':
        indexes.push(UPSTASH_INDEXES.NUTRITION_AND_SUPPLEMENTATION);
        indexes.push(UPSTASH_INDEXES.NUTRITION);
        break;
      case 'recovery':
        indexes.push(UPSTASH_INDEXES.RECOVERY_AND_PERFORMANCE);
        indexes.push(UPSTASH_INDEXES.RECOVERY);
        break;
      case 'program_request':
        indexes.push(UPSTASH_INDEXES.PROGRAMMING);
        indexes.push(UPSTASH_INDEXES.PROGRAM_TEMPLATES);
        indexes.push(UPSTASH_INDEXES.PERIODIZATION_CONCEPTS);
        break;
    }
  }

  // Map exercise name to technique indexes
  if (exerciseName) {
    const lower = exerciseName.toLowerCase();
    if (lower.includes('squat')) {
      indexes.push(UPSTASH_INDEXES.SQUAT_TECHNIQUE);
    }
    if (lower.includes('bench') || lower.includes('deadlift') || lower.includes('press')) {
      indexes.push(UPSTASH_INDEXES.STICKING_POINTS);
    }
    indexes.push(UPSTASH_INDEXES.MOVEMENT_PATTERNS);
  }

  // Map category filter
  if (category) {
    switch (category) {
      case 'strength':
        indexes.push(UPSTASH_INDEXES.STRENGTH_TRAINING);
        indexes.push(UPSTASH_INDEXES.STRENGTH_AND_HYPERTROPHY);
        break;
      case 'hypertrophy':
        indexes.push(UPSTASH_INDEXES.HYPERTROPHY);
        indexes.push(UPSTASH_INDEXES.STRENGTH_AND_HYPERTROPHY);
        break;
      case 'nutrition':
        indexes.push(UPSTASH_INDEXES.NUTRITION_AND_SUPPLEMENTATION);
        break;
      case 'recovery':
        indexes.push(UPSTASH_INDEXES.RECOVERY_AND_PERFORMANCE);
        break;
    }
  }

  // Always include general for broad coverage
  if (includeGeneral && !indexes.includes(UPSTASH_INDEXES.GENERAL)) {
    indexes.push(UPSTASH_INDEXES.GENERAL);
  }

  // Dedupe and limit to 3 indexes for performance
  return Array.from(new Set(indexes)).slice(0, 3);
}

type IndexName = typeof SEARCH_INDEXES[keyof typeof SEARCH_INDEXES];

// Normalize exercise name for better matching
export function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate phonetic key using simple metaphone-like algorithm
export function generatePhoneticKey(name: string): string {
  const normalized = normalizeExerciseName(name);
  return normalized
    .replace(/[aeiou]/g, '') // Remove vowels
    .replace(/(.)\1+/g, '$1') // Remove repeated consonants
    .slice(0, 8);
}

// Extract base movement from exercise name
export function extractBaseMovement(name: string): string | null {
  const movements: Record<string, string[]> = {
    press: ['press', 'bench', 'overhead'],
    curl: ['curl', 'curls'],
    squat: ['squat', 'squats'],
    deadlift: ['deadlift', 'dead lift', 'rdl'],
    row: ['row', 'rows', 'rowing'],
    pull: ['pullup', 'pull-up', 'pulldown', 'pull down', 'chin-up', 'chinup'],
    lunge: ['lunge', 'lunges'],
    fly: ['fly', 'flye', 'flies'],
    extension: ['extension', 'extensions', 'pushdown'],
    raise: ['raise', 'raises'],
  };

  const lower = name.toLowerCase();
  for (const [baseMovement, keywords] of Object.entries(movements)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return baseMovement;
    }
  }
  return null;
}

// Search indexer service
export class SearchIndexerService {
  private db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  // Index a single exercise to Upstash Search
  async indexExercise(exerciseId: string): Promise<void> {
    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, exerciseId),
    });

    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    // Build searchable document
    const document = {
      name: exercise.name,
      normalizedName: normalizeExerciseName(exercise.name),
      description: exercise.description || '',
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles?.join(' ') || '',
      equipment: exercise.equipment?.join(' ') || '',
      synonyms: exercise.synonyms?.join(' ') || '',
      movementPattern: exercise.movementPattern || '',
      baseMovement: extractBaseMovement(exercise.name) || '',
      difficulty: exercise.difficulty || '',
      isCompound: exercise.isCompound ? 'compound' : 'isolation',
    };

    // Upsert to Upstash Search
    await search.upsert({
      index: SEARCH_INDEXES.EXERCISES,
      id: exerciseId,
      data: document,
    });

    // Update indexed status in database
    await this.db
      .update(schema.exercises)
      .set({
        upstashIndexed: true,
        normalizedName: normalizeExerciseName(exercise.name),
        phoneticKey: generatePhoneticKey(exercise.name),
        baseMovement: extractBaseMovement(exercise.name),
        updatedAt: new Date(),
      })
      .where(eq(schema.exercises.id, exerciseId));

    // Invalidate cache
    await cache.delete(`exercise:${exerciseId}`);
  }

  // Index multiple exercises in batch
  async indexExercisesBatch(exerciseIds: string[]): Promise<{ success: number; failed: string[] }> {
    const results = { success: 0, failed: [] as string[] };

    for (const id of exerciseIds) {
      try {
        await this.indexExercise(id);
        results.success++;
      } catch (error) {
        console.error(`Failed to index exercise ${id}:`, error);
        results.failed.push(id);
      }
    }

    return results;
  }

  // Index all unindexed exercises
  async indexAllExercises(): Promise<{ success: number; failed: string[] }> {
    const unindexed = await this.db.query.exercises.findMany({
      where: eq(schema.exercises.upstashIndexed, false),
    });

    return this.indexExercisesBatch(unindexed.map((e) => e.id));
  }

  // Index knowledge base entry
  async indexKnowledgeEntry(entryId: string): Promise<void> {
    const entry = await this.db.query.knowledgeBase.findFirst({
      where: eq(schema.knowledgeBase.id, entryId),
    });

    if (!entry) {
      throw new Error(`Knowledge entry ${entryId} not found`);
    }

    const document = {
      content: entry.content,
      title: entry.title || '',
      category: entry.category || '',
      chunkType: entry.chunkType,
      tags: entry.tags?.join(' ') || '',
      source: entry.source || '',
    };

    await search.upsert({
      index: SEARCH_INDEXES.KNOWLEDGE,
      id: entryId,
      data: document,
    });

    await this.db
      .update(schema.knowledgeBase)
      .set({ upstashIndexed: true })
      .where(eq(schema.knowledgeBase.id, entryId));
  }

  // Index exercise cue
  async indexExerciseCue(cueId: string): Promise<void> {
    const cue = await this.db.query.exerciseCues.findFirst({
      where: eq(schema.exerciseCues.id, cueId),
    });

    if (!cue) {
      throw new Error(`Exercise cue ${cueId} not found`);
    }

    // Get exercise name for context
    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, cue.exerciseId),
    });

    const document = {
      cueText: cue.cueText,
      cueType: cue.cueType,
      exerciseName: exercise?.name || '',
      exerciseId: cue.exerciseId,
    };

    await search.upsert({
      index: SEARCH_INDEXES.EXERCISE_CUES,
      id: cueId,
      data: document,
    });

    await this.db
      .update(schema.exerciseCues)
      .set({ upstashIndexed: true })
      .where(eq(schema.exerciseCues.id, cueId));
  }

  // Remove from index
  async removeFromIndex(index: IndexName, id: string): Promise<void> {
    await search.delete({ index, id });
  }
}

// Factory function
export function createSearchIndexer(db: PostgresJsDatabase<typeof schema>): SearchIndexerService {
  return new SearchIndexerService(db);
}
