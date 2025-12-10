/**
 * Unified Coach Service
 *
 * The brain of VoiceFit - handles ALL chat interactions through a single
 * intelligent interface. This is the ChatGPT-style unified entry point for:
 *
 * - Workout logging (voice or text)
 * - Exercise questions & form tips
 * - Program generation & adjustments
 * - Exercise substitutions
 * - Nutrition guidance
 * - Recovery advice
 * - Running/cardio coaching
 * - CrossFit WOD logging
 * - General fitness Q&A
 */

import { generateCompletion, streamCompletion, TEMPERATURES, xai, AI_CONFIG } from '../lib/ai';
import { search, cache } from '../lib/upstash';
import { SEARCH_INDEXES, UPSTASH_INDEXES, getIndexesForContext } from './searchIndexer';
import {
  classifyWithPatterns,
  buildOptimizedQuery,
  getEnhancedIndexes,
  type FastClassificationResult,
} from './fastClassifier';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { eq, desc, and, sql, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import {
  generateFullProgram,
  saveProgramToDatabase,
  activateProgram,
  generateQuickWorkout,
} from './programGenerator';
import type { ProgramQuestionnaireData } from '../db/schema/onboarding';

// ============================================
// TYPES
// ============================================

export type MessageIntent =
  | 'workout_log'       // "Bench 225 for 8"
  | 'exercise_question' // "How do I deadlift?"
  | 'exercise_swap'     // "What can I do instead of squats?"
  | 'program_request'   // "Create a push day for me"
  | 'full_program'      // "Create me a full training program" (premium)
  | 'program_question'  // "What should I do today?"
  | 'nutrition'         // "How much protein should I eat?"
  | 'recovery'          // "My shoulder hurts"
  | 'running'           // "Plan a 5k training"
  | 'running_program'   // "Create me a 5k training plan"
  | 'wod_log'           // "Fran: 3:45"
  | 'general_fitness'   // General fitness questions
  | 'greeting'          // "Hey", "Hello"
  | 'off_topic';        // Non-fitness topics

export interface ClassificationResult {
  intent: MessageIntent;
  confidence: number;
  extractedData: {
    exercise?: string;
    weight?: number;
    weightUnit?: 'lbs' | 'kg';
    reps?: number;
    sets?: number;
    rpe?: number;
    wodName?: string;
    wodTime?: number;
    wodRounds?: number;
    wodReps?: number;
    bodyPart?: string;
    muscleGroup?: string;
  };
}

export interface CoachMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: MessageIntent;
    workoutLogged?: boolean;
    prAchieved?: boolean;
    exerciseId?: string;
    wodId?: string;
    sources?: string[];
  };
}

export interface UserContext {
  userId: string;
  name?: string;
  experienceLevel?: string;
  goals?: string[];
  injuries?: string[];
  preferredEquipment?: string[];
  preferredWeightUnit?: 'lbs' | 'kg';

  // Current session context
  activeWorkoutId?: string;
  currentExercise?: string;
  currentExerciseId?: string;
  lastWeight?: number;
  lastWeightUnit?: string;
  setCount?: number;

  // Recent history
  recentPrs?: Array<{ exercise: string; weight: number; reps: number }>;
  todaysWorkout?: { name?: string; exercises?: string[] };

  // Conversation
  conversationHistory?: CoachMessage[];
}

export interface CoachResponse {
  message: string;
  intent: MessageIntent;

  // For workout logging
  workoutLogged?: {
    exerciseId: string;
    exerciseName: string;
    weight?: number;
    weightUnit?: string;
    reps: number;
    setNumber: number;
    isPr: boolean;
  };

  // For exercise swaps
  substitutes?: Array<{
    exerciseId: string;
    name: string;
    reason: string;
  }>;

  // For knowledge queries
  sources?: Array<{
    title: string;
    category: string;
  }>;

  // For form tips
  formTips?: {
    setup: string[];
    execution: string[];
    breathing: string[];
    commonMistakes: string[];
  };

  // For confirmations
  needsConfirmation?: boolean;
  confirmationData?: any;

  // For program generation
  programGenerated?: {
    programId: string;
    name: string;
    durationWeeks: number;
    daysPerWeek: number;
    programType: string;
  };

  // For questionnaire requests
  questionsNeeded?: {
    field: string;
    question: string;
    options?: string[];
  }[];

  // Conversation management
  conversationId?: string;
}

// ============================================
// CLASSIFICATION
// ============================================

const CLASSIFIER_PROMPT = `You are VoiceFit's message classifier. Analyze user messages and classify their intent.

INTENTS:
- workout_log: Logging a set (has exercise, weight, reps) - "bench 225 for 8", "just did 10 pullups"
- exercise_question: Asking about how to do an exercise - "how do I deadlift?", "what muscles does bench work?"
- exercise_swap: Wants alternative exercise - "what can I do instead of squats?", "my shoulder hurts, swap bench"
- program_request: Wants a SINGLE workout plan - "create a push day", "what should I do for legs today?"
- full_program: Wants a MULTI-WEEK training program - "create a training program for me", "I want a 12 week program", "build me a workout plan", "design a program based on my goals"
- program_question: Asking about their current program - "what's next?", "am I on track?"
- nutrition: Food/diet questions - "how much protein?", "what should I eat?"
- recovery: Pain, soreness, rest - "my back hurts", "should I rest today?"
- running: Quick cardio/running question - "what pace should I run?"
- running_program: Wants a MULTI-WEEK running plan - "create me a 5k training plan", "I want to train for a marathon", "build me a couch to 5k program"
- wod_log: CrossFit WOD result - "Fran 3:45", "finished Murph in 42 minutes"
- general_fitness: Other fitness topics - "how do I get stronger?", "best way to build muscle"
- greeting: Hello, hi, hey
- off_topic: Non-fitness (redirect politely)

KEY DISTINCTION:
- program_request = single workout for TODAY (quick)
- full_program = multi-week training plan (needs questionnaire)

Extract any relevant data from the message.

OUTPUT JSON:
{
  "intent": "<intent>",
  "confidence": 0.0-1.0,
  "extractedData": {
    "exercise": string | null,
    "weight": number | null,
    "weightUnit": "lbs" | "kg" | null,
    "reps": number | null,
    "sets": number | null,
    "rpe": number | null,
    "wodName": string | null,
    "wodTime": number | null,
    "wodRounds": number | null,
    "wodReps": number | null,
    "bodyPart": string | null,
    "muscleGroup": string | null
  }
}`;

/**
 * Hybrid classification: pattern-based first, AI fallback for ambiguous cases.
 *
 * This approach reduces latency from ~1-2s (AI) to <5ms (patterns) for ~85% of messages.
 *
 * @param message - The user's message to classify
 * @param context - Optional user context for better classification
 * @returns Classification result with intent, confidence, and extracted data
 */
async function classifyMessage(
  message: string,
  context?: UserContext
): Promise<ClassificationResult & { usedPattern?: boolean }> {
  const startTime = Date.now();

  // Try pattern-based classification first (< 5ms)
  const patternResult = classifyWithPatterns(message, {
    activeWorkoutId: context?.activeWorkoutId,
    currentExercise: context?.currentExercise,
  });

  // If high confidence pattern match, use it
  if (patternResult && patternResult.confidence >= 0.75) {
    console.log(`[Classifier] Pattern match: ${patternResult.intent} (${Date.now() - startTime}ms)`);
    return patternResult;
  }

  // Fall back to AI classification for ambiguous cases
  console.log(`[Classifier] AI fallback required for: "${message.slice(0, 50)}..."`);

  const contextStr = context ? `
Current exercise: ${context.currentExercise || 'none'}
Last weight: ${context.lastWeight || 'unknown'} ${context.lastWeightUnit || ''}
Active workout: ${context.activeWorkoutId ? 'yes' : 'no'}` : '';

  try {
    const response = await generateCompletion({
      systemPrompt: CLASSIFIER_PROMPT,
      userPrompt: `${contextStr}\n\nMESSAGE: "${message}"`,
      temperature: TEMPERATURES.classification,
      maxTokens: 300,
      model: 'fast',
    });

    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(cleaned);

    console.log(`[Classifier] AI result: ${parsed.intent} (${Date.now() - startTime}ms)`);

    return {
      intent: parsed.intent || 'general_fitness',
      confidence: parsed.confidence || 0.5,
      extractedData: parsed.extractedData || {},
      usedPattern: false,
    };
  } catch (error) {
    console.error('Classification error:', error);

    // If we had a low-confidence pattern match, use it as fallback
    if (patternResult) {
      console.log(`[Classifier] AI failed, using low-confidence pattern: ${patternResult.intent}`);
      return patternResult;
    }

    return {
      intent: 'general_fitness',
      confidence: 0.3,
      extractedData: {},
      usedPattern: false,
    };
  }
}

// ============================================
// UNIFIED COACH SERVICE
// ============================================

export class UnifiedCoachService {
  private db: PostgresJsDatabase<typeof schema>;

  constructor(db: PostgresJsDatabase<typeof schema>) {
    this.db = db;
  }

  /**
   * Main entry point - process any message through the unified coach
   */
  async processMessage(
    message: string,
    context: UserContext
  ): Promise<CoachResponse> {
    // 1. Classify the message
    const classification = await classifyMessage(message, context);

    // 2. Route to appropriate handler
    switch (classification.intent) {
      case 'workout_log':
        return this.handleWorkoutLog(message, classification, context);

      case 'exercise_question':
        return this.handleExerciseQuestion(message, classification, context);

      case 'exercise_swap':
        return this.handleExerciseSwap(message, classification, context);

      case 'program_request':
      case 'program_question':
        return this.handleProgramQuery(message, classification, context);

      case 'full_program':
        return this.handleFullProgramRequest(message, classification, context);

      case 'nutrition':
        return this.handleNutritionQuery(message, context);

      case 'recovery':
        return this.handleRecoveryQuery(message, classification, context);

      case 'running':
        return this.handleRunningQuery(message, context);

      case 'running_program':
        return this.handleRunningProgramRequest(message, classification, context);

      case 'wod_log':
        return this.handleWodLog(message, classification, context);

      case 'greeting':
        return this.handleGreeting(context);

      case 'off_topic':
        return this.handleOffTopic();

      case 'general_fitness':
      default:
        return this.handleGeneralQuery(message, context);
    }
  }

  /**
   * Stream response for real-time chat UI
   */
  async *streamMessage(
    message: string,
    context: UserContext
  ): AsyncGenerator<{ chunk?: string; final?: CoachResponse }> {
    const classification = await classifyMessage(message, context);

    // For workout logs and WOD logs, don't stream - return immediately
    if (classification.intent === 'workout_log') {
      const response = await this.handleWorkoutLog(message, classification, context);
      yield { final: response };
      return;
    }

    if (classification.intent === 'wod_log') {
      const response = await this.handleWodLog(message, classification, context);
      yield { final: response };
      return;
    }

    // For other intents, stream the response
    const systemPrompt = this.buildSystemPrompt(context);
    const ragContext = await this.getRAGContext(message, classification.intent, classification.extractedData);

    const userPrompt = this.buildUserPrompt(message, context, ragContext);

    let fullResponse = '';

    for await (const chunk of streamCompletion({
      systemPrompt,
      userPrompt,
      temperature: TEMPERATURES.coaching,
      maxTokens: 600,
    })) {
      fullResponse += chunk;
      yield { chunk };
    }

    yield {
      final: {
        message: fullResponse,
        intent: classification.intent,
      },
    };
  }

  // ============================================
  // INTENT HANDLERS
  // ============================================

  private async handleWorkoutLog(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const { extractedData } = classification;

    // Need an active workout
    if (!context.activeWorkoutId) {
      return {
        message: "You don't have an active workout. Want me to start one for you?",
        intent: 'workout_log',
        needsConfirmation: true,
        confirmationData: { action: 'start_workout' },
      };
    }

    // Match exercise
    let exerciseId = context.currentExerciseId;
    let exerciseName = context.currentExercise;

    if (extractedData.exercise) {
      const match = await this.matchExercise(extractedData.exercise);
      if (match) {
        exerciseId = match.id;
        exerciseName = match.name;
      } else {
        return {
          message: `I couldn't find "${extractedData.exercise}". Did you mean something else?`,
          intent: 'workout_log',
          needsConfirmation: true,
        };
      }
    }

    if (!exerciseId) {
      return {
        message: "What exercise are you logging?",
        intent: 'workout_log',
      };
    }

    // Get weight (use context if "same weight")
    let weight = extractedData.weight;
    let weightUnit: 'lbs' | 'kg' = (extractedData.weightUnit || context.preferredWeightUnit || 'lbs') as 'lbs' | 'kg';

    if (!weight && message.toLowerCase().includes('same')) {
      weight = context.lastWeight;
      weightUnit = (context.lastWeightUnit || 'lbs') as 'lbs' | 'kg';
    }

    const reps = extractedData.reps;
    if (!reps) {
      return {
        message: `${exerciseName} - how many reps?`,
        intent: 'workout_log',
      };
    }

    // Calculate set number
    const setCount = (context.setCount || 0) + 1;

    // Calculate estimated 1RM and check for PR
    const estimated1rm = weight ? weight * (1 + reps / 30) : null;

    const existingPr = await this.db.execute(sql`
      SELECT MAX(estimated_1rm) as max_1rm
      FROM personal_records
      WHERE user_id = ${context.userId}
        AND exercise_id = ${exerciseId}
    `);

    const maxExisting = ((existingPr as unknown as Array<{ max_1rm: number }>)[0])?.max_1rm || 0;
    const isPr = estimated1rm !== null && estimated1rm > maxExisting;

    // Log the set
    const [set] = await this.db
      .insert(schema.workoutSets)
      .values({
        workoutId: context.activeWorkoutId,
        exerciseId,
        userId: context.userId,
        setNumber: setCount,
        reps,
        weight,
        weightUnit,
        rpe: extractedData.rpe,
        loggingMethod: 'voice',
        voiceTranscript: message,
        confidence: classification.confidence,
        isPr,
        estimated1rm,
        syncedAt: new Date(),
      })
      .returning();

    // Generate confirmation
    const confirmationMessage = this.generateWorkoutConfirmation({
      exercise: exerciseName!,
      weight,
      weightUnit,
      reps,
      setNumber: setCount,
      isPr,
    });

    return {
      message: confirmationMessage,
      intent: 'workout_log',
      workoutLogged: {
        exerciseId: exerciseId!,
        exerciseName: exerciseName!,
        weight,
        weightUnit,
        reps,
        setNumber: setCount,
        isPr,
      },
    };
  }

  private async handleExerciseQuestion(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const exerciseName = classification.extractedData.exercise;

    // Get form tips if specific exercise mentioned
    let formTips;
    if (exerciseName) {
      formTips = await this.getFormTips(exerciseName);
    }

    // Get RAG context with extracted exercise/body part data
    const ragContext = await this.getRAGContext(message, 'exercise_question', classification.extractedData);

    const response = await generateCompletion({
      systemPrompt: this.buildSystemPrompt(context),
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return {
      message: response,
      intent: 'exercise_question',
      formTips,
    };
  }

  private async handleExerciseSwap(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const exerciseName = classification.extractedData.exercise || context.currentExercise;
    const bodyPart = classification.extractedData.bodyPart;

    if (!exerciseName) {
      return {
        message: "Which exercise do you want to swap out?",
        intent: 'exercise_swap',
      };
    }

    // Find the exercise
    const exercise = await this.matchExercise(exerciseName);
    if (!exercise) {
      return {
        message: `I couldn't find "${exerciseName}". Can you be more specific?`,
        intent: 'exercise_swap',
      };
    }

    // Get substitutes
    const substitutes = await this.findSubstitutes(exercise.id, {
      avoidBodyParts: bodyPart ? [bodyPart] : context.injuries,
      sameEquipment: true,
    });

    const substituteList = substitutes
      .slice(0, 3)
      .map((s, i) => `${i + 1}. ${s.name}`)
      .join('\n');

    const reason = bodyPart
      ? `to avoid stress on your ${bodyPart}`
      : context.injuries?.length
      ? `considering your ${context.injuries.join(', ')}`
      : 'based on similar movement pattern';

    return {
      message: `Here are some alternatives to ${exercise.name} ${reason}:\n\n${substituteList}\n\nWant me to use one of these instead?`,
      intent: 'exercise_swap',
      substitutes: substitutes.slice(0, 3).map((s) => ({
        exerciseId: s.id,
        name: s.name,
        reason: s.reason || 'Similar movement pattern',
      })),
    };
  }

  private async handleProgramQuery(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const ragContext = await this.getRAGContext(message, 'program_request', classification.extractedData);

    const systemPrompt = `${this.buildSystemPrompt(context)}

You are helping with workout programming. You can:
- Suggest workout splits
- Create individual workout plans
- Recommend exercises for specific goals
- Adjust programs based on user feedback

Be specific with exercise recommendations. Include sets, reps, and rest periods when suggesting workouts.`;

    const response = await generateCompletion({
      systemPrompt,
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 700,
    });

    return {
      message: response,
      intent: classification.intent,
    };
  }

  /**
   * Handle full training program generation (premium feature)
   * This initiates the questionnaire flow or generates a program if we have enough data
   */
  private async handleFullProgramRequest(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    // Check if user has an existing questionnaire
    const existingQuestionnaire = await this.db.query.programQuestionnaire.findFirst({
      where: eq(schema.programQuestionnaire.userId, context.userId),
      orderBy: [desc(schema.programQuestionnaire.createdAt)],
    });

    // If we have questionnaire data, offer to generate program
    if (existingQuestionnaire?.completedAt) {
      // Check if they have an active program
      const activeProgram = await this.db.query.trainingPrograms.findFirst({
        where: and(
          eq(schema.trainingPrograms.userId, context.userId),
          eq(schema.trainingPrograms.status, 'active')
        ),
      });

      if (activeProgram) {
        return {
          message: `You already have an active program: "${activeProgram.name}" (Week ${activeProgram.currentWeek}/${activeProgram.durationWeeks}). Would you like to:\n\n1. Continue with your current program\n2. Pause it and create a new one\n3. See today's workout\n\nWhat would you like to do?`,
          intent: 'full_program',
          needsConfirmation: true,
          confirmationData: {
            action: 'program_exists',
            programId: activeProgram.id,
            programName: activeProgram.name,
          },
        };
      }

      // Generate program based on existing questionnaire
      return this.generateAndSaveProgram(existingQuestionnaire as ProgramQuestionnaireData, context);
    }

    // No questionnaire - start the flow
    return {
      message: `I'd love to create a personalized training program for you!

To build the best program, I need to know a few things about you. This is a premium feature that will generate a multi-week structured plan based on your goals.

Let's start with the basics - what type of training are you most interested in?

1. **Strength training** - Building muscle, getting stronger
2. **Running/Cardio** - 5K, 10K, marathon training
3. **Hybrid** - Both strength and running
4. **CrossFit** - High-intensity functional fitness

Just reply with your choice (or the number)!`,
      intent: 'full_program',
      questionsNeeded: [
        {
          field: 'trainingType',
          question: 'What type of training are you interested in?',
          options: ['strength_only', 'running_only', 'hybrid', 'crossfit'],
        },
      ],
      needsConfirmation: true,
      confirmationData: {
        action: 'start_questionnaire',
        step: 'training_type',
      },
    };
  }

  /**
   * Handle running program generation (5K, 10K, marathon plans)
   */
  private async handleRunningProgramRequest(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    // Check if they mentioned a specific race distance
    const distanceMatch = message.toLowerCase().match(/5k|10k|half.?marathon|marathon|couch.?to.?5k/i);
    const targetDistance = distanceMatch ? distanceMatch[0].replace(/\s/g, '') : null;

    // Check for existing questionnaire
    const existingQuestionnaire = await this.db.query.programQuestionnaire.findFirst({
      where: eq(schema.programQuestionnaire.userId, context.userId),
      orderBy: [desc(schema.programQuestionnaire.createdAt)],
    });

    if (existingQuestionnaire?.completedAt) {
      // Update questionnaire with running focus and generate
      const updatedQuestionnaire = {
        ...existingQuestionnaire,
        trainingType: 'running_only' as const,
        targetRaceDistance: targetDistance || existingQuestionnaire.targetRaceDistance,
      };

      return this.generateAndSaveProgram(updatedQuestionnaire as ProgramQuestionnaireData, context);
    }

    // Start running-specific questionnaire
    const distanceQuestion = targetDistance
      ? `Great! A ${targetDistance} plan it is!`
      : 'What distance are you training for?';

    return {
      message: `${distanceQuestion}

To create the perfect running program, I need a few more details:

1. **Current fitness level**: Are you a beginner, intermediate, or advanced runner?
2. **Weekly mileage**: How many miles/km do you currently run per week?
3. **Goal**: Do you have a target race date or finish time?

Let's start - what's your current running experience level?`,
      intent: 'running_program',
      questionsNeeded: [
        {
          field: 'experienceLevel',
          question: 'What is your running experience level?',
          options: ['beginner', 'intermediate', 'advanced'],
        },
        {
          field: 'weeklyMileage',
          question: 'How many miles/km do you run per week?',
        },
        {
          field: 'targetRaceDate',
          question: 'When is your target race? (optional)',
        },
      ],
      needsConfirmation: true,
      confirmationData: {
        action: 'start_running_questionnaire',
        targetDistance,
        step: 'experience_level',
      },
    };
  }

  /**
   * Actually generate and save a program from questionnaire data
   */
  private async generateAndSaveProgram(
    questionnaire: ProgramQuestionnaireData,
    context: UserContext
  ): Promise<CoachResponse> {
    try {
      // Generate the program
      const generatedProgram = await generateFullProgram(questionnaire, this.db);

      // Save to database
      const programId = await saveProgramToDatabase(
        generatedProgram,
        context.userId,
        questionnaire,
        this.db
      );

      return {
        message: `🎉 Your personalized ${generatedProgram.durationWeeks}-week **${generatedProgram.name}** has been created!

**Program Overview:**
- Type: ${generatedProgram.programType}
- Duration: ${generatedProgram.durationWeeks} weeks
- Training days: ${generatedProgram.daysPerWeek} per week
- Goal: ${generatedProgram.primaryGoal}

The program is ready! Would you like me to:
1. **Activate it** - Start the program (I'll add workouts to your calendar)
2. **Review it** - See the full week-by-week breakdown
3. **Adjust it** - Make changes before starting

Just let me know!`,
        intent: 'full_program',
        programGenerated: {
          programId,
          name: generatedProgram.name,
          durationWeeks: generatedProgram.durationWeeks,
          daysPerWeek: generatedProgram.daysPerWeek,
          programType: generatedProgram.programType,
        },
        needsConfirmation: true,
        confirmationData: {
          action: 'program_generated',
          programId,
        },
      };
    } catch (error) {
      console.error('Program generation error:', error);
      return {
        message: "I had trouble generating your program. Let me try a simpler approach - what's your main goal? (e.g., build muscle, lose fat, run a 5K)",
        intent: 'full_program',
      };
    }
  }

  private async handleNutritionQuery(
    message: string,
    context: UserContext
  ): Promise<CoachResponse> {
    const ragContext = await this.getRAGContext(message, 'nutrition');

    const systemPrompt = `${this.buildSystemPrompt(context)}

You are helping with nutrition questions. You can:
- Provide general macro guidance
- Discuss protein timing
- Talk about pre/post workout nutrition
- Give hydration advice

Note: VoiceFit tracks nutrition via Apple Health and wearables - we don't do manual food logging.
For specific calorie/macro targets, recommend they check their health app data.`;

    const response = await generateCompletion({
      systemPrompt,
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return {
      message: response,
      intent: 'nutrition',
    };
  }

  private async handleRecoveryQuery(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const bodyPart = classification.extractedData.bodyPart;
    const ragContext = await this.getRAGContext(
      message,
      'recovery',
      classification.extractedData
    );

    const systemPrompt = `${this.buildSystemPrompt(context)}

You are helping with recovery and potential injury concerns. You can:
- Suggest rest or deload
- Recommend mobility work
- Suggest exercise modifications
- Advise when to see a professional

IMPORTANT: For actual pain or injury, always recommend consulting a healthcare professional.
Be cautious and prioritize safety.`;

    const response = await generateCompletion({
      systemPrompt,
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return {
      message: response,
      intent: 'recovery',
    };
  }

  private async handleRunningQuery(
    message: string,
    context: UserContext
  ): Promise<CoachResponse> {
    const ragContext = await this.getRAGContext(message, 'running');

    const systemPrompt = `${this.buildSystemPrompt(context)}

You are helping with running and cardio. You can:
- Suggest running programs (5K, 10K, etc.)
- Discuss pacing strategies
- Talk about heart rate zones
- Advise on running form
- Recommend cross-training

The app has GPS tracking for runs on the Running tab.`;

    const response = await generateCompletion({
      systemPrompt,
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return {
      message: response,
      intent: 'running',
    };
  }

  private async handleWodLog(
    message: string,
    classification: ClassificationResult,
    context: UserContext
  ): Promise<CoachResponse> {
    const { extractedData } = classification;

    if (!extractedData.wodName) {
      return {
        message: "Which WOD did you do?",
        intent: 'wod_log',
      };
    }

    // Find the WOD
    const wod = await this.db.query.crossfitWods.findFirst({
      where: ilike(schema.crossfitWods.name, extractedData.wodName),
    });

    if (!wod) {
      return {
        message: `I don't have "${extractedData.wodName}" in the WOD library. Want to log a custom WOD?`,
        intent: 'wod_log',
        needsConfirmation: true,
        confirmationData: { action: 'custom_wod', wodName: extractedData.wodName },
      };
    }

    // Create the log
    const [log] = await this.db
      .insert(schema.wodLogs)
      .values({
        userId: context.userId,
        wodId: wod.id,
        resultTimeSeconds: extractedData.wodTime,
        resultRounds: extractedData.wodRounds,
        resultReps: extractedData.wodReps,
        rawVoiceInput: message,
      })
      .returning();

    // Check for PR
    const existingBenchmark = await this.db.query.wodBenchmarks.findFirst({
      where: and(
        eq(schema.wodBenchmarks.userId, context.userId),
        eq(schema.wodBenchmarks.wodId, wod.id)
      ),
    });

    let isPr = false;
    if (extractedData.wodTime) {
      if (!existingBenchmark || extractedData.wodTime < (existingBenchmark.bestTimeSeconds || Infinity)) {
        isPr = true;

        if (existingBenchmark) {
          await this.db
            .update(schema.wodBenchmarks)
            .set({
              wodLogId: log.id,
              bestTimeSeconds: extractedData.wodTime,
              previousBestTimeSeconds: existingBenchmark.bestTimeSeconds,
              improvementSeconds: existingBenchmark.bestTimeSeconds
                ? existingBenchmark.bestTimeSeconds - extractedData.wodTime
                : undefined,
              achievedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.wodBenchmarks.id, existingBenchmark.id));
        } else {
          await this.db.insert(schema.wodBenchmarks).values({
            userId: context.userId,
            wodId: wod.id,
            wodLogId: log.id,
            bestTimeSeconds: extractedData.wodTime,
            achievedAt: new Date(),
          });
        }
      }
    }

    const timeStr = extractedData.wodTime
      ? this.formatWodTime(extractedData.wodTime)
      : `${extractedData.wodRounds} rounds + ${extractedData.wodReps} reps`;

    const prMessage = isPr ? " That's a new PR! " : "";

    return {
      message: `${wod.name} logged: ${timeStr}${prMessage}Great work!`,
      intent: 'wod_log',
    };
  }

  private handleGreeting(context: UserContext): CoachResponse {
    const name = context.name ? `, ${context.name}` : '';
    const greetings = [
      `Hey${name}! Ready to train?`,
      `What's up${name}! What are we working on today?`,
      `Hey${name}! How can I help you today?`,
    ];

    return {
      message: greetings[Math.floor(Math.random() * greetings.length)],
      intent: 'greeting',
    };
  }

  private handleOffTopic(): CoachResponse {
    const responses = [
      "I'm your fitness coach, so I'm best at helping with workouts, nutrition, and training. What can I help you with?",
      "That's outside my expertise! I specialize in fitness and training. Got any workout questions?",
      "I'm all about fitness! Let me know if you want to talk workouts, nutrition, or recovery.",
    ];

    return {
      message: responses[Math.floor(Math.random() * responses.length)],
      intent: 'off_topic',
    };
  }

  private async handleGeneralQuery(
    message: string,
    context: UserContext
  ): Promise<CoachResponse> {
    const ragContext = await this.getRAGContext(message, 'general_fitness');

    const response = await generateCompletion({
      systemPrompt: this.buildSystemPrompt(context),
      userPrompt: this.buildUserPrompt(message, context, ragContext),
      temperature: TEMPERATURES.coaching,
      maxTokens: 500,
    });

    return {
      message: response,
      intent: 'general_fitness',
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private buildSystemPrompt(context: UserContext): string {
    return `You are VoiceFit's AI fitness coach - the core of the app. Users interact with you through a ChatGPT-style interface for ALL their fitness needs.

PERSONALITY:
- Conversational and supportive (use contractions naturally)
- Expert knowledge without being condescending
- Celebrate progress, be constructive on setbacks
- Keep responses concise (2-4 sentences) unless more detail is needed
- Reference the user's specific situation when relevant

USER CONTEXT:
- Name: ${context.name || 'User'}
- Experience: ${context.experienceLevel || 'Unknown'}
- Goals: ${context.goals?.join(', ') || 'Not specified'}
- Injuries/limitations: ${context.injuries?.join(', ') || 'None'}
- Preferred equipment: ${context.preferredEquipment?.join(', ') || 'Full gym'}
${context.recentPrs?.length ? `- Recent PRs: ${context.recentPrs.map(pr => `${pr.exercise}: ${pr.weight}x${pr.reps}`).join(', ')}` : ''}
${context.activeWorkoutId ? `- Currently in a workout` : ''}
${context.currentExercise ? `- Current exercise: ${context.currentExercise}` : ''}

CAPABILITIES:
- Log workouts via voice or text
- Answer exercise and form questions
- Suggest exercise substitutions
- Create and adjust programs
- Provide nutrition guidance
- Help with recovery and injury prevention
- Track running and cardio
- Log CrossFit WODs

Always be helpful and keep the user engaged with their fitness journey.`;
  }

  private buildUserPrompt(
    message: string,
    context: UserContext,
    ragContext?: string
  ): string {
    const conversationHistory = context.conversationHistory
      ?.slice(-5)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    return `${ragContext ? `RELEVANT KNOWLEDGE:\n${ragContext}\n\n` : ''}${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n\n` : ''}USER: ${message}`;
  }

  /**
   * Get RAG context with optimized query building, index selection, and caching.
   *
   * Improvements over naive approach:
   * 1. Builds optimized search queries with domain-specific keywords
   * 2. Selects indexes based on intent AND extracted data (exercise, body part)
   * 3. Caches results in Redis for 10 minutes to reduce latency
   * 4. Properly formats retrieved knowledge for the AI prompt
   */
  private async getRAGContext(
    message: string,
    intent: MessageIntent,
    extractedData?: ClassificationResult['extractedData']
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Build optimized search query
      const optimizedQuery = buildOptimizedQuery(message, intent, extractedData || {});

      // Get enhanced indexes based on intent and extracted data
      const indexes = getEnhancedIndexes(intent, extractedData || {});

      // Check cache first (key based on query + indexes)
      const cacheKey = `rag:${intent}:${optimizedQuery}`;
      const cached = await cache.get<string>(cacheKey);
      if (cached) {
        console.log(`[RAG] Cache HIT: "${optimizedQuery}" (${Date.now() - startTime}ms)`);
        return cached;
      }

      console.log(`[RAG] Query: "${optimizedQuery}" | Indexes: ${indexes.join(', ')}`);

      // Query multiple indexes in parallel
      const results = await search.queryMultiple({
        indexes,
        query: optimizedQuery,
        topK: 5,
      });

      console.log(`[RAG] Found ${results.length} results (${Date.now() - startTime}ms)`);

      if (results.length === 0) return '';

      // Format results with relevance scoring
      const formattedContext = results
        .slice(0, 3) // Limit context size for token efficiency
        .map((r, i) => {
          const content = r.content as Record<string, string> | undefined;
          const text = content?.text || '';
          const category = content?.category || r.metadata?.category || 'General';

          // Truncate to ~500 chars but try to end at sentence boundary
          let truncatedText = text;
          if (text.length > 500) {
            const cutoff = text.slice(0, 550);
            const lastPeriod = cutoff.lastIndexOf('.');
            truncatedText = lastPeriod > 400 ? cutoff.slice(0, lastPeriod + 1) : cutoff.slice(0, 500) + '...';
          }

          return `[Source ${i + 1}: ${category}]\n${truncatedText}`;
        })
        .join('\n\n');

      // Cache for 10 minutes (600 seconds)
      if (formattedContext) {
        await cache.set(cacheKey, formattedContext, 600);
      }

      return formattedContext;
    } catch (error) {
      console.error('RAG context error:', error);
      return '';
    }
  }

  private async matchExercise(name: string): Promise<schema.Exercise | null> {
    // Try exact match first
    let exercise = await this.db.query.exercises.findFirst({
      where: ilike(schema.exercises.name, name),
    });

    if (exercise) return exercise;

    // Try partial match
    exercise = await this.db.query.exercises.findFirst({
      where: ilike(schema.exercises.name, `%${name}%`),
    });

    if (exercise) return exercise;

    // Try synonym match
    exercise = await this.db.query.exercises.findFirst({
      where: sql`${name} ILIKE ANY(synonyms)`,
    });

    return exercise || null;
  }

  private async findSubstitutes(
    exerciseId: string,
    options?: {
      avoidBodyParts?: string[];
      sameEquipment?: boolean;
    }
  ): Promise<Array<schema.Exercise & { reason?: string }>> {
    const original = await this.db.query.exercises.findFirst({
      where: eq(schema.exercises.id, exerciseId),
    });

    if (!original) return [];

    // Get similar exercises
    const similar = await this.db.query.exercises.findMany({
      where: and(
        eq(schema.exercises.primaryMuscle, original.primaryMuscle),
        sql`${schema.exercises.id} != ${exerciseId}`
      ),
      limit: 5,
    });

    return similar;
  }

  private async getFormTips(exerciseName: string): Promise<CoachResponse['formTips']> {
    try {
      // Get technique indexes based on exercise name
      const indexes = getIndexesForContext({ exerciseName });

      const results = await search.queryMultiple({
        indexes,
        query: `${exerciseName} form technique cues`,
        topK: 10,
      });

      const tips: CoachResponse['formTips'] = {
        setup: [],
        execution: [],
        breathing: [],
        commonMistakes: [],
      };

      for (const r of results) {
        const content = r.content as Record<string, string> | undefined;
        const text = content?.text || '';
        const cueType = content?.type as keyof typeof tips;

        // Extract coaching cues from text content
        if (text.includes('Cue') || text.includes('cue')) {
          // Parse cues from the text
          if (text.toLowerCase().includes('setup') || text.toLowerCase().includes('position')) {
            tips.setup?.push(text.slice(0, 200));
          } else if (text.toLowerCase().includes('fault') || text.toLowerCase().includes('mistake')) {
            tips.commonMistakes?.push(text.slice(0, 200));
          } else {
            tips.execution?.push(text.slice(0, 200));
          }
        } else if (cueType && tips[cueType]) {
          tips[cueType]!.push(text.slice(0, 200));
        }
      }

      // Dedupe and limit each category
      tips.setup = Array.from(new Set(tips.setup)).slice(0, 3);
      tips.execution = Array.from(new Set(tips.execution)).slice(0, 3);
      tips.breathing = Array.from(new Set(tips.breathing)).slice(0, 2);
      tips.commonMistakes = Array.from(new Set(tips.commonMistakes)).slice(0, 3);

      return tips;
    } catch (error) {
      return undefined;
    }
  }

  private generateWorkoutConfirmation(params: {
    exercise: string;
    weight?: number;
    weightUnit?: string;
    reps: number;
    setNumber: number;
    isPr: boolean;
  }): string {
    const { exercise, weight, weightUnit, reps, setNumber, isPr } = params;

    const weightStr = weight ? `${weight}${weightUnit || 'lbs'} × ` : '';

    if (isPr) {
      return `🎉 PR! ${exercise}: ${weightStr}${reps} reps! Set ${setNumber} - incredible!`;
    }

    const confirmations = [
      `Got it! ${exercise}: ${weightStr}${reps}. Set ${setNumber} ✓`,
      `Logged! ${exercise} - ${weightStr}${reps} reps. Set ${setNumber} done!`,
      `${exercise}: ${weightStr}${reps} ✓ (Set ${setNumber})`,
    ];

    return confirmations[Math.floor(Math.random() * confirmations.length)];
  }

  private formatWodTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Factory function
export function createUnifiedCoach(
  db: PostgresJsDatabase<typeof schema>
): UnifiedCoachService {
  return new UnifiedCoachService(db);
}
