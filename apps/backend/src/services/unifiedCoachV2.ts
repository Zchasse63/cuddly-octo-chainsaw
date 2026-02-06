/**
 * Unified Coach Service V2 - Tool-Based Architecture
 *
 * This is the new tool-based implementation of the VoiceFit AI coach.
 * Uses Vercel AI SDK with xAI's Grok model and tool calling.
 */

import { generateText, streamText, AI_CONFIG, stepCountIs } from '../lib/ai';
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

🚨 CRITICAL RESPONSE REQUIREMENTS 🚨
1. You MUST ALWAYS generate a text response - NEVER return empty text
2. After calling tools, you MUST synthesize the results into natural language
3. If tools return data, you MUST reference that data in your response
4. Even if tools fail or return empty results, you MUST still generate helpful text

REQUIRED WORKFLOW FOR DATA QUERIES:
Step 1: Call the appropriate tool(s) to get current data
Step 2: Wait for tool results
Step 3: MANDATORY: Generate a natural language response that incorporates the tool results
   - If data found: Explain what the data shows in 2-4 conversational sentences
   - If no data found: Acknowledge this and suggest next steps
   - If tool error: Explain you couldn't retrieve data and offer alternatives

TOOL USAGE GUIDE - When the user asks about these topics, CALL THESE TOOLS FIRST:
- Profile/goals/experience → getUserProfile
- Today's workout/schedule → getTodaysWorkout
- Recent workouts/history → getRecentWorkouts
- Personal records/PRs → getPersonalRecords
- Health/recovery/readiness → getReadinessScore, getHealthMetrics
- Program progress → getActiveProgram, getProgramProgress
- Injuries/pain → getActiveInjuries, getExercisesToAvoid
- Exercise form/technique → getExerciseFormTips, searchKnowledgeBase
- Find exercises → searchExercises

PERSONALITY & STYLE:
- Use contractions (you're, let's, we'll)
- Celebrate progress, be constructive on setbacks
- Reference specific numbers/data from tool results
- Ask follow-up questions when helpful
- Use their name occasionally
- Keep responses concise (2-4 sentences) unless detail requested

CONSTRAINTS:
- Medical concerns → recommend consulting a professional
- Tool errors → acknowledge gracefully and offer alternatives
- Never fabricate data - always use tools for facts`;

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
      // Determine if this query requires tool calling
      const needsTools = requiresToolCall(message);

      const result = await generateText({
        model: AI_CONFIG.responses,
        tools,
        system: COACH_SYSTEM_PROMPT,
        messages,
        stopWhen: stepCountIs(5), // Allow multi-turn tool execution
        temperature: 0.1, // Lower temperature for more deterministic tool selection
        ...(needsTools ? { toolChoice: 'required' } : {}),
      });

      // Check for 0 tool calls when tools are expected
      const toolCallCount = result.toolCalls?.length || 0;
      if (toolCallCount === 0 && requiresToolCall(message)) {
        // Log 0-tool-call event for monitoring
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[AI] 0 tool calls detected for query that likely requires data:', {
            message: message.substring(0, 100),
            userId: userContext.userId,
          });
        }

        // Return helpful fallback message
        return {
          message: "I couldn't retrieve your data right now. Please try rephrasing your question or be more specific about what you'd like to know.",
          intent: 'general_fitness',
          toolsUsed: [],
        };
      }

      // CRITICAL VALIDATION: Ensure non-empty message
      // If AI called tools but didn't generate text (Grok bug), synthesize from tool results
      let finalMessage = result.text;
      if (!finalMessage || finalMessage.trim() === '') {
        if (toolCallCount > 0) {
          // AI called tools but failed to generate text - synthesize response from tool results
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[AI] Empty text after tool calls - synthesizing from tool results', {
              userId: userContext.userId,
              toolsUsed: result.toolCalls?.map(tc => tc.toolName),
            });
          }

          // Extract tool results and synthesize a natural response
          const toolResults = result.toolResults || [];
          const mappedToolCalls = (result.toolCalls || []).map(tc => ({
            toolName: tc.toolName,
            args: 'args' in tc ? tc.args : undefined
          }));
          const synthesized = synthesizeResponseFromTools(mappedToolCalls, toolResults, message);
          finalMessage = synthesized || "I retrieved your information but couldn't generate a response. Please try rephrasing your question.";
        } else {
          // No tools called and no text - generic fallback
          finalMessage = "I'm having trouble generating a response right now. Please try rephrasing your question.";
        }
      }

      return {
        message: finalMessage,
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
      // Determine if this query requires tool calling
      const needsTools = requiresToolCall(message);

      const result = streamText({
        model: AI_CONFIG.responses,
        tools,
        system: COACH_SYSTEM_PROMPT,
        messages,
        stopWhen: stepCountIs(5), // Allow multi-turn tool execution
        temperature: 0.1, // Lower temperature for more deterministic tool selection
        ...(needsTools ? { toolChoice: 'required' } : {}),
      });

      // Yield text chunks
      for await (const chunk of result.textStream) {
        yield { chunk };
      }

      // Yield final result
      const finalText = await result.text;
      const toolCalls = await result.toolCalls;

      // Check for 0 tool calls when tools are expected
      const toolCallCount = toolCalls?.length || 0;
      if (toolCallCount === 0 && requiresToolCall(message)) {
        // Log 0-tool-call event for monitoring
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[AI Stream] 0 tool calls detected for query that likely requires data:', {
            message: message.substring(0, 100),
            userId: userContext.userId,
          });
        }

        yield {
          final: {
            message: "I couldn't retrieve your data right now. Please try rephrasing your question or be more specific about what you'd like to know.",
            intent: 'general_fitness',
            toolsUsed: [],
          },
        };
        return;
      }

      // CRITICAL VALIDATION: Ensure non-empty message for streaming too
      let finalMessage = finalText;
      if (!finalMessage || finalMessage.trim() === '') {
        if (toolCallCount > 0) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn('[AI Stream] Empty text after tool calls - synthesizing from tool results', {
              userId: userContext.userId,
              toolsUsed: toolCalls?.map(tc => tc.toolName),
            });
          }

          // Extract tool results and synthesize a natural response
          const toolResults = await result.toolResults;
          const mappedToolCalls = (toolCalls || []).map(tc => ({
            toolName: tc.toolName,
            args: 'args' in tc ? tc.args : undefined
          }));
          const synthesized = synthesizeResponseFromTools(mappedToolCalls, toolResults || [], message);
          finalMessage = synthesized || "I retrieved your information but couldn't generate a response. Please try rephrasing your question.";
        } else {
          finalMessage = "I'm having trouble generating a response right now. Please try rephrasing your question.";
        }
      }

      yield {
        final: {
          message: finalMessage,
          toolsUsed: toolCalls?.map(tc => tc.toolName) || [],
        },
      };
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine if a message likely requires tool calls to answer properly.
 * Helps detect when AI returns 0 tool calls for data-requiring queries.
 */
function requiresToolCall(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Keywords that indicate data retrieval is needed
  const dataKeywords = [
    'my profile', 'my goal', 'my tier', 'my experience',
    'today', 'this week', 'recent', 'latest', 'current',
    'workout', 'exercise', 'training', 'program',
    'personal record', 'pr', 'max',
    'injury', 'injuries', 'hurt', 'pain',
    'streak', 'badge', 'achievement',
    'progress', 'history', 'stats',
    'how much', 'how many', 'show me', 'what is my',
  ];

  return dataKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Synthesize a natural language response from tool calls and their results.
 * Fallback for when Grok AI calls tools but fails to generate final text.
 *
 * @param toolCalls - Array of tool calls made by the AI
 * @param toolResults - Array of tool results returned
 * @param originalMessage - The user's original question
 * @returns A synthesized natural language response based on the tool data
 */
function synthesizeResponseFromTools(
  toolCalls: Array<{ toolName: string; args: unknown }>,
  toolResults: Array<{ output: unknown; toolName?: string }>,
  originalMessage: string
): string {
  if (!toolCalls || toolCalls.length === 0 || !toolResults || toolResults.length === 0) {
    return '';
  }

  // Get the primary tool used
  const primaryTool = toolCalls[0];
  // Tool results structure: { type: "tool-result", toolName: string, output: { success: boolean, data: T } }
  const primaryResultOutput = toolResults[0]?.output as any;

  if (!primaryResultOutput) {
    return '';
  }

  // Check if tool returned error
  if (primaryResultOutput.success === false) {
    const errorMsg = primaryResultOutput.error?.message || 'Unknown error';
    return `I tried to retrieve that information but encountered an issue: ${errorMsg}. Please try again or rephrase your question.`;
  }

  // If tool returned success with data, synthesize based on tool type
  if (primaryResultOutput.success === true && primaryResultOutput.data) {
    const data = primaryResultOutput.data;

    // getUserProfile - synthesize profile information
    if (primaryTool.toolName === 'getUserProfile') {
      const parts = [];
      if (data.experienceLevel) {
        parts.push(`You're ${data.experienceLevel === 'beginner' ? 'a beginner' : data.experienceLevel === 'intermediate' ? 'an intermediate' : 'an advanced'} athlete`);
      }
      if (data.goals && data.goals.length > 0) {
        parts.push(`focused on ${data.goals.join(', ')}`);
      }
      if (data.tier) {
        parts.push(`currently on the ${data.tier} tier`);
      }

      return parts.length > 0
        ? parts.join(', ') + '.'
        : 'I found your profile information.';
    }

    // getRecentWorkouts - synthesize workout history
    if (primaryTool.toolName === 'getRecentWorkouts') {
      const workouts = data.workouts || data;
      if (Array.isArray(workouts)) {
        if (workouts.length === 0) {
          return "You haven't logged any workouts recently.";
        }
        return `You've completed ${workouts.length} workout${workouts.length > 1 ? 's' : ''} recently.`;
      }
    }

    // getActiveInjuries - synthesize injury information
    if (primaryTool.toolName === 'getActiveInjuries') {
      if (data.activeInjuries) {
        return `You currently have an injury: ${data.activeInjuries}.`;
      }
      return "You don't have any active injuries logged.";
    }

    // getTodaysWorkout - synthesize today's workout
    if (primaryTool.toolName === 'getTodaysWorkout') {
      if (data.workout) {
        const workout = data.workout;
        return `Today's workout is ${workout.name || 'a training session'}.`;
      }
      return "You don't have a workout scheduled for today.";
    }

    // Generic fallback for successful tool calls with data
    const toolName = primaryTool.toolName;
    return `I retrieved your ${toolName.replace(/^get/, '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()} information.`;
  }

  // Ultimate fallback
  return `I used ${primaryTool.toolName} but couldn't generate a complete response. Please try asking again.`;
}

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

