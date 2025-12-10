/**
 * Fast Pattern-Based Message Classifier
 *
 * Handles ~85% of messages without AI calls using regex patterns.
 * Falls back to AI classification for ambiguous cases.
 *
 * This reduces latency from ~1-2s (AI) to <5ms (patterns) for common cases.
 */

import type { MessageIntent, ClassificationResult } from './unifiedCoach';

// Exercise name patterns - common exercises users log
const EXERCISE_PATTERNS = /\b(squat|bench\s*press?|deadlift|overhead\s*press|ohp|row|pull[-\s]?up|chin[-\s]?up|curl|tricep|dip|lunge|leg\s*press|lat\s*pull|cable|fly|raise|extension|press|shrug)\b/i;

// WOD names for CrossFit
const WOD_PATTERNS = /\b(fran|murph|cindy|grace|isabel|diane|helen|annie|jackie|karen|mary|nancy|chelsea|amanda|angie|barbara|filthy\s*fifty)\b/i;

// Body parts for exercise and recovery questions
const BODY_PART_PATTERNS = /\b(shoulder|back|chest|leg|arm|bicep|tricep|quad|hamstring|glute|calf|core|ab|hip|knee|wrist|elbow|neck|lower\s*back)\b/i;

export interface FastClassificationResult extends ClassificationResult {
  usedPattern: boolean;
  patternName?: string;
}

/**
 * Fast pattern-based classification
 * Returns null if AI classification is needed
 */
export function classifyWithPatterns(
  message: string,
  context?: { activeWorkoutId?: string; currentExercise?: string }
): FastClassificationResult | null {
  const lower = message.toLowerCase().trim();
  const extractedData: ClassificationResult['extractedData'] = {};

  // Extract exercise name if present
  const exerciseMatch = lower.match(EXERCISE_PATTERNS);
  if (exerciseMatch) {
    extractedData.exercise = exerciseMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract body part if present
  const bodyPartMatch = lower.match(BODY_PART_PATTERNS);
  if (bodyPartMatch) {
    extractedData.bodyPart = bodyPartMatch[0];
  }

  // ===== GREETING PATTERNS =====
  if (/^(hey|hello|hi|yo|sup|what'?s\s*up|good\s*(morning|afternoon|evening))(\s|$|!)/i.test(lower)) {
    return { intent: 'greeting', confidence: 0.95, extractedData: {}, usedPattern: true, patternName: 'greeting' };
  }

  // ===== WOD LOG PATTERNS =====
  const wodMatch = lower.match(WOD_PATTERNS);
  if (wodMatch) {
    extractedData.wodName = wodMatch[0];
    // Look for time pattern (e.g., "3:45", "12:30", "42 minutes")
    const timeMatch = lower.match(/(\d{1,2}):(\d{2})/);
    const minuteMatch = lower.match(/(\d+)\s*(min|minute)/i);
    if (timeMatch) {
      extractedData.wodTime = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    } else if (minuteMatch) {
      extractedData.wodTime = parseInt(minuteMatch[1]) * 60;
    }
    return { intent: 'wod_log', confidence: 0.9, extractedData, usedPattern: true, patternName: 'wod_log' };
  }

  // ===== WORKOUT LOG PATTERNS =====
  // Pattern: [exercise] [weight] for/x [reps] or [weight] [exercise] [reps]
  const hasWeight = /\d+\s*(lbs?|kg|pounds?|kilos?)?/.test(lower);
  const hasReps = /(for|x|times)\s*\d+|\d+\s*(reps?|times)/i.test(lower);
  const hasActionVerb = /\b(did|just|finished|completed|hit|got|logged)\b/.test(lower);
  const isNotQuestion = !lower.includes('?');

  if ((hasWeight && hasReps && isNotQuestion) || (hasActionVerb && (hasWeight || hasReps))) {
    // Extract weight
    const weightMatch = lower.match(/(\d+)\s*(lbs?|kg|pounds?|kilos?)?/);
    if (weightMatch) {
      extractedData.weight = parseInt(weightMatch[1]);
      extractedData.weightUnit = weightMatch[2]?.startsWith('k') ? 'kg' : 'lbs';
    }
    // Extract reps
    const repsMatch = lower.match(/(?:for|x|times)\s*(\d+)|(\d+)\s*(?:reps?|times)/i);
    if (repsMatch) {
      extractedData.reps = parseInt(repsMatch[1] || repsMatch[2]);
    }
    return { intent: 'workout_log', confidence: 0.85, extractedData, usedPattern: true, patternName: 'workout_log' };
  }

  // ===== EXERCISE SWAP PATTERNS =====
  if (/(instead\s*of|alternative|substitute|swap|replace|switch)/i.test(lower)) {
    return { intent: 'exercise_swap', confidence: 0.9, extractedData, usedPattern: true, patternName: 'swap' };
  }

  // ===== EXERCISE QUESTION PATTERNS =====
  const isQuestion = lower.includes('?') || /^(how|what|why|when|should|can|do|does|is|are|will|show|tell)\s/i.test(lower);
  const isFormQuestion = /(how\s*(to|do\s*i)|proper|correct|form|technique|muscles?|target|work|cue)/i.test(lower);

  if (isQuestion && isFormQuestion && extractedData.exercise) {
    return { intent: 'exercise_question', confidence: 0.9, extractedData, usedPattern: true, patternName: 'exercise_question' };
  }

  // General form questions without specific exercise
  if (isFormQuestion && !hasWeight) {
    return { intent: 'exercise_question', confidence: 0.75, extractedData, usedPattern: true, patternName: 'exercise_question_general' };
  }

  // ===== OFF-TOPIC DETECTION (check early to avoid false matches) =====
  if (/(weather|movie|music|news|politics|stock|crypto|bitcoin|game|tv\s*show)/i.test(lower)) {
    return { intent: 'off_topic', confidence: 0.8, extractedData: {}, usedPattern: true, patternName: 'off_topic' };
  }

  // ===== RECOVERY/PAIN PATTERNS =====
  if (/(hurt|pain|sore|soreness|injury|injured|strain|ache|tight|stiff|rest\s*day|should\s*i\s*rest)/i.test(lower)) {
    return { intent: 'recovery', confidence: 0.85, extractedData, usedPattern: true, patternName: 'recovery' };
  }

  // ===== PROGRAM PATTERNS (check before nutrition to avoid "eat" false matches) =====
  const isProgramRequest = /(create|build|make|design|give\s*me|plan)\s/i.test(lower);
  const isMultiWeek = /(\d+\s*week|multi|full|complete|training\s*program|training\s*plan)/i.test(lower);
  const isDailyWorkout = /(today|push\s*day|pull\s*day|leg\s*day|what\s*should\s*i\s*do)/i.test(lower);

  if (isProgramRequest && isMultiWeek) {
    return { intent: 'full_program', confidence: 0.85, extractedData, usedPattern: true, patternName: 'full_program' };
  }

  if (isProgramRequest || isDailyWorkout) {
    return { intent: 'program_request', confidence: 0.75, extractedData, usedPattern: true, patternName: 'program_request' };
  }

  // ===== NUTRITION PATTERNS =====
  // More specific patterns to avoid false matches like "create" containing "eat"
  const nutritionPatterns = /\b(protein|carbs?|calories?|diet|macro|nutrition|meal|pre[-\s]?workout|post[-\s]?workout|supplement)\b/i;
  const eatingPatterns = /\b(eat|eating|food)\b/i;

  if (nutritionPatterns.test(lower) || (eatingPatterns.test(lower) && isQuestion)) {
    return { intent: 'nutrition', confidence: 0.85, extractedData, usedPattern: true, patternName: 'nutrition' };
  }

  // No pattern matched - needs AI classification
  return null;
}

/**
 * Build an optimized search query for RAG retrieval
 *
 * Instead of using the raw user message, we extract key terms
 * and enhance with domain-specific keywords for better retrieval.
 */
export function buildOptimizedQuery(
  message: string,
  intent: MessageIntent,
  extractedData: ClassificationResult['extractedData']
): string {
  const lower = message.toLowerCase();
  const terms: string[] = [];

  // Add exercise name with technique keywords
  if (extractedData.exercise) {
    terms.push(extractedData.exercise);

    // Add technique keywords based on intent
    if (intent === 'exercise_question') {
      terms.push('technique', 'form', 'cues');
    }
  }

  // Add body part if relevant
  if (extractedData.bodyPart) {
    terms.push(extractedData.bodyPart);

    if (intent === 'recovery') {
      terms.push('pain', 'recovery', 'treatment');
    }
  }

  // Intent-specific keyword enhancement
  switch (intent) {
    case 'exercise_question':
      // Extract what they're asking about
      if (/muscles?|target|work/i.test(lower)) {
        terms.push('muscles', 'targeted', 'activation');
      }
      if (/form|technique|proper/i.test(lower)) {
        terms.push('setup', 'execution', 'cues');
      }
      break;

    case 'nutrition':
      // Extract nutrition topic
      if (/protein/i.test(lower)) terms.push('protein', 'intake', 'requirements');
      if (/pre[-\s]?workout/i.test(lower)) terms.push('pre-workout', 'timing', 'energy');
      if (/post[-\s]?workout/i.test(lower)) terms.push('post-workout', 'recovery', 'nutrition');
      if (/muscle|build|gain/i.test(lower)) terms.push('muscle building', 'hypertrophy', 'nutrition');
      break;

    case 'recovery':
      terms.push('recovery', 'injury', 'prevention');
      if (/rest/i.test(lower)) terms.push('rest', 'deload');
      break;

    case 'program_request':
      // Extract workout type
      if (/push/i.test(lower)) terms.push('push', 'chest', 'shoulders', 'triceps');
      if (/pull/i.test(lower)) terms.push('pull', 'back', 'biceps');
      if (/leg/i.test(lower)) terms.push('legs', 'squat', 'lower body');
      if (/upper/i.test(lower)) terms.push('upper body', 'pressing', 'pulling');
      terms.push('workout', 'programming');
      break;

    default:
      // For general queries, clean up the message
      return lower.replace(/[?!.,]/g, '').slice(0, 100);
  }

  // If no terms extracted, fall back to cleaned message
  if (terms.length === 0) {
    return lower.replace(/[?!.,]/g, '').slice(0, 100);
  }

  return terms.slice(0, 6).join(' ');
}

/**
 * Get enhanced index selection based on classification
 * Returns indexes ordered by relevance
 */
export function getEnhancedIndexes(
  intent: MessageIntent,
  extractedData: ClassificationResult['extractedData']
): string[] {
  const indexes: string[] = [];
  const exercise = extractedData.exercise?.toLowerCase() || '';
  const bodyPart = extractedData.bodyPart?.toLowerCase() || '';

  switch (intent) {
    case 'exercise_question':
      // Prioritize technique indexes for specific exercises
      if (exercise.includes('squat')) {
        indexes.push('squat-technique', 'movement-patterns');
      } else if (exercise.includes('bench') || exercise.includes('press')) {
        indexes.push('sticking-points', 'movement-patterns');
      } else if (exercise.includes('deadlift')) {
        indexes.push('sticking-points', 'movement-patterns');
      } else {
        indexes.push('movement-patterns', 'strength-and-hypertrophy');
      }
      indexes.push('general');
      break;

    case 'nutrition':
      indexes.push('nutrition-and-supplementation', 'nutrition', 'general');
      break;

    case 'recovery':
      if (bodyPart) {
        indexes.push('injury-prevention', 'injury-management');
      }
      indexes.push('recovery-and-performance', 'recovery', 'general');
      break;

    case 'program_request':
      indexes.push('programming', 'program-templates', 'periodization-concepts');
      break;

    case 'full_program':
      indexes.push('programming', 'periodization-concepts', 'program-templates');
      break;

    case 'general_fitness':
      indexes.push('general', 'strength-and-hypertrophy', 'beginner-fundamentals');
      break;

    default:
      indexes.push('general');
  }

  // Dedupe and limit to 3
  return Array.from(new Set(indexes)).slice(0, 3);
}

