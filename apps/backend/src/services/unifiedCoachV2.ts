/**
 * Unified Coach Service V2 - Tool-Based Architecture
 *
 * This is the new tool-based implementation of the VoiceFit AI coach.
 * Uses Vercel AI SDK with xAI's Grok model and tool calling.
 */

import { generateText, streamText, AI_CONFIG } from '../lib/ai';
import { collectTools } from '../tools/registry';
import { createToolContext } from '../tools/context';
import { getAllAthleteTools } from '../tools/athlete';
import { getAllCoachTools } from '../tools/coach';
import { shouldUseToolCalling } from '../lib/featureFlags';
import type { Database } from '../db';

// ============================================
// TYPES
// ============================================

export interface UserContext {
  userId: string;
  name?: string;
  experienceLevel?: string;
  goals?: string[];
  injuries?: string[];
  preferredEquipment?: string[];
  preferredWeightUnit?: 'lbs' | 'kg';
  activeWorkoutId?: string;
  currentExercise?: string;
  currentExerciseId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface CoachResponse {
  message: string;
  intent?: string;
  sources?: Array<{ title: string; category: string }>;
  toolsUsed?: string[];
  workoutLogged?: {
    exerciseId: string;
    exerciseName: string;
    weight?: number;
    weightUnit?: string;
    reps: number;
    setNumber: number;
    isPr: boolean;
  };
  needsConfirmation?: boolean;
  confirmationData?: unknown;
}

export interface StreamChunk {
  chunk?: string;
  final?: CoachResponse;
}

// ============================================
// SYSTEM PROMPT
// ============================================

const COACH_SYSTEM_PROMPT = `You are VoiceFit's AI fitness coach - knowledgeable, supportive, and conversational.

IMPORTANT: You have access to tools that let you query the user's data. ALWAYS use tools to get current information before answering questions about:
- Today's workout or schedule (use getTodaysWorkout)
- Recent training history (use getRecentWorkouts, getExerciseHistory)
- Personal records (use getPersonalRecords)
- Health and recovery (use getReadinessScore, getHealthMetrics)
- Program progress (use getActiveProgram, getProgramProgress)
- Injuries (use getActiveInjuries, getExercisesToAvoid)
- Exercise form and tips (use getExerciseFormTips, searchKnowledgeBase)

PERSONALITY:
- Use contractions naturally (you're, let's, we'll)
- Celebrate progress, be constructive on setbacks
- Reference specific data from tool results
- Ask follow-up questions when helpful
- Use their name occasionally

CONSTRAINTS:
- Keep responses concise (2-4 sentences unless detail requested)
- For medical concerns, recommend consulting a professional
- If a tool returns an error, acknowledge it gracefully
- Never make up data - always use tools to get real information`;

// ============================================
// UNIFIED COACH SERVICE V2
// ============================================

export interface UnifiedCoachV2 {
  processMessage(message: string, context: UserContext): Promise<CoachResponse>;
  streamMessage(message: string, context: UserContext): AsyncGenerator<StreamChunk>;
}

export async function createUnifiedCoachV2(db: Database): Promise<UnifiedCoachV2> {
  return {
    async processMessage(
      message: string,
      userContext: UserContext
    ): Promise<CoachResponse> {
      // Check if tool calling is enabled for this user
      if (!shouldUseToolCalling(userContext.userId)) {
        // Return a message indicating legacy mode
        return {
          message: 'Tool calling is not enabled for this user. Please use the legacy coach.',
          intent: 'system',
        };
      }

      // Create tool context
      const toolCtx = await createToolContext(db, userContext.userId);

      // Collect appropriate tools based on user role
      const athleteTools = getAllAthleteTools();
      const coachToolsMap = toolCtx.userRole === 'coach' ? getAllCoachTools() : {};

      const tools = {
        ...collectTools(toolCtx, athleteTools),
        ...collectTools(toolCtx, coachToolsMap),
      };

      // Build conversation messages
      const messages = buildMessages(message, userContext);

      // Use Vercel AI SDK with tool calling
      const result = await generateText({
        model: AI_CONFIG.responses,
        tools,
        system: COACH_SYSTEM_PROMPT,
        messages,
      });

      return {
        message: result.text,
        intent: extractIntent(result),
        toolsUsed: result.toolCalls?.map(tc => tc.toolName) || [],
      };
    },

    async *streamMessage(
      message: string,
      userContext: UserContext
    ): AsyncGenerator<StreamChunk> {
      // Check if tool calling is enabled
      if (!shouldUseToolCalling(userContext.userId)) {
        yield {
          final: {
            message: 'Tool calling is not enabled. Please use the legacy coach.',
            intent: 'system',
          },
        };
        return;
      }

      // Create tool context
      const toolCtx = await createToolContext(db, userContext.userId);

      // Collect tools
      const athleteTools = getAllAthleteTools();
      const tools = collectTools(toolCtx, athleteTools);

      // Build messages
      const messages = buildMessages(message, userContext);

      // Stream with tool calling
      const result = streamText({
        model: AI_CONFIG.responses,
        tools,
        system: COACH_SYSTEM_PROMPT,
        messages,
      });

      // Yield text chunks
      for await (const chunk of result.textStream) {
        yield { chunk };
      }

      // Yield final result
      const finalText = await result.text;
      const toolCalls = await result.toolCalls;

      yield {
        final: {
          message: finalText,
          toolsUsed: toolCalls?.map(tc => tc.toolName) || [],
        },
      };
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildMessages(
  message: string,
  context: UserContext
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add conversation history (last 10 messages)
  if (context.conversationHistory) {
    const recentHistory = context.conversationHistory.slice(-10);
    messages.push(...recentHistory);
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  return messages;
}

function extractIntent(result: { toolCalls?: Array<{ toolName: string }> }): string {
  if (!result.toolCalls || result.toolCalls.length === 0) {
    return 'general_fitness';
  }

  // Map tool names to intents
  const toolName = result.toolCalls[0].toolName;

  if (toolName.includes('Workout') || toolName.includes('Exercise')) {
    return 'workout';
  }
  if (toolName.includes('Program')) {
    return 'program';
  }
  if (toolName.includes('Health') || toolName.includes('Readiness')) {
    return 'health';
  }
  if (toolName.includes('Running')) {
    return 'running';
  }
  if (toolName.includes('Injury')) {
    return 'recovery';
  }
  if (toolName.includes('Knowledge') || toolName.includes('Form')) {
    return 'exercise_question';
  }
  if (toolName.includes('Client')) {
    return 'coach';
  }

  return 'general_fitness';
}

