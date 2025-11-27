import { search, cache } from '../lib/upstash';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

// Index names for Upstash Search
export const SEARCH_INDEXES = {
  EXERCISES: 'exercises',
  KNOWLEDGE: 'knowledge',
  EXERCISE_CUES: 'exercise_cues',
} as const;

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
