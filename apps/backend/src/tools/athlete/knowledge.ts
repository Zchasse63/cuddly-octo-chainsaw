/**
 * Knowledge Tools
 *
 * Tools for searching knowledge base, getting form tips, and training principles.
 */

import { z } from 'zod';
import { eq, ilike } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { search } from '../../lib/upstash';
import { SEARCH_INDEXES } from '../../services/searchIndexer';
import { exercises, exerciseCues } from '../../db/schema';

// Tool 31: Search Knowledge Base
export const searchKnowledgeBase = createTool({
  name: 'searchKnowledgeBase',
  description: 'Search the fitness knowledge base for training, nutrition, and recovery information',
  parameters: z.object({
    query: z.string().min(1).describe('Search query'),
    category: z.enum(['strength', 'running', 'mobility', 'injury', 'nutrition', 'recovery']).optional(),
    limit: z.number().min(1).max(10).default(5),
  }),
  execute: async (params, _ctx) => {
    const filterParts: string[] = [];
    if (params.category) {
      filterParts.push(`category = "${params.category}"`);
    }

    const results = await search.query({
      index: SEARCH_INDEXES.KNOWLEDGE,
      query: params.query,
      topK: params.limit,
      filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
    });

    if (results.length === 0) {
      return toolSuccess({
        hasResults: false,
        message: 'No matching knowledge found',
        query: params.query,
      });
    }

    return toolSuccess({
      hasResults: true,
      results: results.map(r => ({
        id: r.id,
        score: r.score,
        title: r.data?.title ?? '',
        content: r.data?.content ?? '',
        category: r.data?.category ?? '',
        chunkType: r.data?.chunkType ?? '',
      })),
    });
  },
});

// Tool 32: Get Exercise Form Tips
export const getExerciseFormTips = createTool({
  name: 'getExerciseFormTips',
  description: 'Get form cues and tips for a specific exercise. Use this when the user asks "how do I perform squats correctly", "what are form cues for bench press", "show me tips for deadlifts", "how to improve my overhead press form", or when providing exercise technique guidance.',
  parameters: z.object({
    exerciseId: z.string().uuid().optional().describe('Exercise ID'),
    exerciseName: z.string().optional().describe('Exercise name (if ID not known)'),
  }),
  execute: async (params, ctx) => {
    const { exerciseId, exerciseName } = params;
    let exercise;

    // If exerciseId provided, look up directly
    if (exerciseId) {
      exercise = await ctx.db.query.exercises.findFirst({
        where: eq(exercises.id, exerciseId),
      });
    }
    // If name provided, search database by name (case-insensitive)
    else if (exerciseName) {
      // First try exact match (case-insensitive)
      exercise = await ctx.db.query.exercises.findFirst({
        where: ilike(exercises.name, exerciseName),
      });

      // If no exact match, try partial match
      if (!exercise) {
        exercise = await ctx.db.query.exercises.findFirst({
          where: ilike(exercises.name, `%${exerciseName}%`),
        });
      }

      // If still no match, use Upstash to find the best exercise name,
      // then look it up by that name in the database
      if (!exercise) {
        const searchResults = await search.query({
          index: SEARCH_INDEXES.EXERCISES,
          query: exerciseName,
          topK: 1,
        });

        if (searchResults.length > 0 && searchResults[0].data?.name) {
          // Use the name from the search result to query the database
          const matchedName = searchResults[0].data.name as string;
          exercise = await ctx.db.query.exercises.findFirst({
            where: ilike(exercises.name, matchedName),
          });
        }
      }
    }

    if (!exercise) {
      return toolError('Exercise not found', 'EXERCISE_NOT_FOUND');
    }

    // Get cues for this exercise
    const cues = await ctx.db.query.exerciseCues.findMany({
      where: eq(exerciseCues.exerciseId, exercise.id),
    });

    return toolSuccess({
      exercise: {
        id: exercise.id,
        name: exercise.name,
        primaryMuscle: exercise.primaryMuscle,
        movementPattern: exercise.movementPattern,
      },
      formCues: cues.map(c => ({
        type: c.cueType,
        text: c.cueText,
      })),
      // Note: commonMistakes and formTips columns not in current schema
      // Cues contain the form guidance; these arrays are for future expansion
      commonMistakes: [],
      tips: [],
    });
  },
});

// Tool 33: Get Training Principles
export const getTrainingPrinciples = createTool({
  name: 'getTrainingPrinciples',
  description: 'Get training principles and guidelines for a specific topic',
  parameters: z.object({
    topic: z.enum([
      'progressive_overload',
      'deload',
      'periodization',
      'recovery',
      'warm_up',
      'stretching',
      'nutrition_timing',
      'sleep',
      'injury_prevention',
    ]).describe('Training principle topic'),
  }),
  execute: async (params, _ctx) => {
    // Search knowledge base for the topic
    const results = await search.query({
      index: SEARCH_INDEXES.KNOWLEDGE,
      query: params.topic.replace('_', ' '),
      topK: 3,
      filter: 'chunkType = "training_principle"',
    });

    if (results.length === 0) {
      // Return static fallback content
      const fallbackContent = getStaticPrinciple(params.topic);
      return toolSuccess({
        topic: params.topic,
        fromKnowledgeBase: false,
        content: fallbackContent,
      });
    }

    return toolSuccess({
      topic: params.topic,
      fromKnowledgeBase: true,
      principles: results.map(r => ({
        title: r.data?.title ?? '',
        content: r.data?.content ?? '',
      })),
    });
  },
});

// Static fallback content for training principles
function getStaticPrinciple(topic: string): string {
  const principles: Record<string, string> = {
    progressive_overload: 'Gradually increase weight, reps, or volume over time to continue making progress.',
    deload: 'Reduce training intensity/volume by 40-60% every 4-6 weeks to allow recovery.',
    periodization: 'Vary training phases (hypertrophy, strength, power) to optimize long-term progress.',
    recovery: 'Allow 48-72 hours between training the same muscle group. Sleep 7-9 hours.',
    warm_up: 'Start with 5-10 minutes of light cardio, then dynamic stretches and warm-up sets.',
    stretching: 'Dynamic stretching before training, static stretching after. Hold stretches 30-60 seconds.',
    nutrition_timing: 'Consume protein within 2 hours post-workout. Carbs help replenish glycogen.',
    sleep: 'Aim for 7-9 hours. Sleep is when muscle repair and growth hormone release occur.',
    injury_prevention: 'Warm up properly, use good form, progress gradually, and listen to your body.',
  };
  return principles[topic] ?? 'No information available for this topic.';
}

// Export all knowledge tools
export const knowledgeTools = {
  searchKnowledgeBase,
  getExerciseFormTips,
  getTrainingPrinciples,
};

