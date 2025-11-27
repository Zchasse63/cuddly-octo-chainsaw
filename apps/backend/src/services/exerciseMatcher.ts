import { search, cache, type SearchResult } from '../lib/upstash';
import { SEARCH_INDEXES, normalizeExerciseName, generatePhoneticKey } from './searchIndexer';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

export interface ExerciseMatch {
  id: string;
  name: string;
  score: number;
  matchType: 'exact' | 'semantic' | 'fuzzy' | 'phonetic';
  primaryMuscle: string;
  equipment: string[] | null;
}

export interface MatchOptions {
  query: string;
  topK?: number;
  minScore?: number;
  muscleGroupFilter?: string;
  equipmentFilter?: string[];
}

// Exercise matcher service using Upstash Search
export class ExerciseMatcherService {
  private db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  // Match exercise by voice input or text query
  async matchExercise(options: MatchOptions): Promise<ExerciseMatch[]> {
    const { query, topK = 5, minScore = 0.3, muscleGroupFilter, equipmentFilter } = options;

    const startTime = Date.now();
    const normalizedQuery = normalizeExerciseName(query);

    // Check cache first
    const cacheKey = `exercise_match:${normalizedQuery}:${muscleGroupFilter || ''}:${equipmentFilter?.join(',') || ''}`;
    const cached = await cache.get<ExerciseMatch[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build filter for Upstash Search
    let filter: string | undefined;
    const filterParts: string[] = [];

    if (muscleGroupFilter) {
      filterParts.push(`primaryMuscle = "${muscleGroupFilter}"`);
    }
    if (equipmentFilter && equipmentFilter.length > 0) {
      filterParts.push(`equipment CONTAINS ANY [${equipmentFilter.map((e) => `"${e}"`).join(', ')}]`);
    }

    if (filterParts.length > 0) {
      filter = filterParts.join(' AND ');
    }

    // Query Upstash Search
    const searchResults = await search.query({
      index: SEARCH_INDEXES.EXERCISES,
      query: normalizedQuery,
      topK: topK * 2, // Get more results for filtering
      filter,
    });

    // Process and rank results
    const matches = await this.processSearchResults(searchResults, normalizedQuery, minScore);

    // Take top K
    const topMatches = matches.slice(0, topK);

    // Cache results for 5 minutes
    if (topMatches.length > 0) {
      await cache.set(cacheKey, topMatches, 300);
    }

    const latencyMs = Date.now() - startTime;
    console.log(`Exercise match completed in ${latencyMs}ms for query: "${query}"`);

    return topMatches;
  }

  // Process and re-rank search results
  private async processSearchResults(
    results: SearchResult[],
    normalizedQuery: string,
    minScore: number
  ): Promise<ExerciseMatch[]> {
    const matches: ExerciseMatch[] = [];
    const queryPhonetic = generatePhoneticKey(normalizedQuery);

    for (const result of results) {
      const data = result.data as Record<string, string>;
      let finalScore = result.score;
      let matchType: ExerciseMatch['matchType'] = 'semantic';

      // Boost exact matches
      if (data.normalizedName === normalizedQuery) {
        finalScore = 1.0;
        matchType = 'exact';
      }
      // Boost phonetic matches
      else if (data.phoneticKey === queryPhonetic) {
        finalScore = Math.min(finalScore * 1.3, 0.95);
        matchType = 'phonetic';
      }
      // Boost synonym matches
      else if (data.synonyms?.toLowerCase().includes(normalizedQuery)) {
        finalScore = Math.min(finalScore * 1.2, 0.9);
        matchType = 'fuzzy';
      }

      if (finalScore >= minScore) {
        matches.push({
          id: result.id,
          name: data.name || '',
          score: finalScore,
          matchType,
          primaryMuscle: data.primaryMuscle || '',
          equipment: data.equipment ? data.equipment.split(' ').filter(Boolean) : null,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  // Find substitutes for an exercise (avoiding specific body parts)
  async findSubstitutes(
    exerciseId: string,
    options?: {
      avoidBodyParts?: string[];
      sameEquipment?: boolean;
      topK?: number;
    }
  ): Promise<ExerciseMatch[]> {
    const { avoidBodyParts = [], sameEquipment = false, topK = 5 } = options || {};

    // Get the original exercise
    const original = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, exerciseId),
    });

    if (!original) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    // Check for pre-defined substitutions first
    const substitutions = await this.db.query.exerciseSubstitutions.findMany({
      where: eq(schema.exerciseSubstitutions.originalExerciseId, exerciseId),
    });

    // If we need to avoid specific body parts, filter substitutions
    const validSubstitutions = avoidBodyParts.length > 0
      ? substitutions.filter((s) => !avoidBodyParts.includes(s.affectedBodyPart || ''))
      : substitutions;

    // If we have enough pre-defined substitutions, use those
    if (validSubstitutions.length >= topK) {
      const substituteIds = validSubstitutions.slice(0, topK).map((s) => s.substituteExerciseId);
      const exercises = await Promise.all(
        substituteIds.map((id) =>
          this.db.query.exercises.findFirst({ where: eq(schema.exercises.id, id) })
        )
      );

      return exercises
        .filter((e): e is schema.Exercise => e !== undefined)
        .map((e, i) => ({
          id: e.id,
          name: e.name,
          score: validSubstitutions[i].similarityScore || 0.8,
          matchType: 'semantic' as const,
          primaryMuscle: e.primaryMuscle,
          equipment: e.equipment,
        }));
    }

    // Fall back to search-based matching
    const filterParts = [`primaryMuscle = "${original.primaryMuscle}"`];

    if (sameEquipment && original.equipment && original.equipment.length > 0) {
      filterParts.push(`equipment CONTAINS ANY [${original.equipment.map((e) => `"${e}"`).join(', ')}]`);
    }

    const searchResults = await search.query({
      index: SEARCH_INDEXES.EXERCISES,
      query: `${original.movementPattern || ''} ${original.primaryMuscle}`,
      topK: topK * 2,
      filter: filterParts.join(' AND '),
    });

    // Filter out the original exercise and check body part stress
    const matches: ExerciseMatch[] = [];

    for (const result of searchResults) {
      if (result.id === exerciseId) continue;

      // Check if this exercise stresses any body parts we need to avoid
      if (avoidBodyParts.length > 0) {
        const stressLevels = await this.db.query.exerciseBodyPartStress.findMany({
          where: eq(schema.exerciseBodyPartStress.exerciseId, result.id),
        });

        const hasConflict = stressLevels.some(
          (s) => avoidBodyParts.includes(s.bodyPart) && s.stressLevel === 'high'
        );

        if (hasConflict) continue;
      }

      const data = result.data as Record<string, string>;
      matches.push({
        id: result.id,
        name: data.name || '',
        score: result.score,
        matchType: 'semantic',
        primaryMuscle: data.primaryMuscle || '',
        equipment: data.equipment ? data.equipment.split(' ').filter(Boolean) : null,
      });

      if (matches.length >= topK) break;
    }

    return matches;
  }

  // Get similar exercises (for recommendations)
  async getSimilarExercises(exerciseId: string, topK: number = 5): Promise<ExerciseMatch[]> {
    const exercise = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, exerciseId),
    });

    if (!exercise) {
      throw new Error(`Exercise ${exerciseId} not found`);
    }

    // Search by exercise characteristics
    const searchQuery = [
      exercise.name,
      exercise.primaryMuscle,
      exercise.movementPattern,
      exercise.baseMovement,
    ]
      .filter(Boolean)
      .join(' ');

    const results = await search.query({
      index: SEARCH_INDEXES.EXERCISES,
      query: searchQuery,
      topK: topK + 1, // Include extra to filter out self
    });

    return results
      .filter((r) => r.id !== exerciseId)
      .slice(0, topK)
      .map((r) => {
        const data = r.data as Record<string, string>;
        return {
          id: r.id,
          name: data.name || '',
          score: r.score,
          matchType: 'semantic' as const,
          primaryMuscle: data.primaryMuscle || '',
          equipment: data.equipment ? data.equipment.split(' ').filter(Boolean) : null,
        };
      });
  }
}

// Factory function
export function createExerciseMatcher(
  db: PostgresJsDatabase<typeof schema>
): ExerciseMatcherService {
  return new ExerciseMatcherService(db);
}
