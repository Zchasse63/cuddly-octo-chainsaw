import { generateCompletion, streamCompletion, TEMPERATURES } from '../lib/grok';
import { z } from 'zod';

// Chat classification result schema
const ClassificationSchema = z.object({
  category: z.enum(['workout_log', 'exercise_swap', 'question', 'off_topic', 'general']),
  confidence: z.number().min(0).max(1),
  extracted_exercise: z.string().nullable(),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

// System prompts
const CLASSIFIER_SYSTEM_PROMPT = `You are a message classifier for VoiceFit, a fitness app.

CATEGORIES:
1. workout_log - Logging exercise sets (numbers, weights, reps)
2. exercise_swap - Wants to replace an exercise
3. question - Asking for fitness advice
4. off_topic - Non-fitness topics (redirect politely)
5. general - Greetings, thanks, unclear

OUTPUT FORMAT:
{
  "category": "workout_log" | "exercise_swap" | "question" | "off_topic" | "general",
  "confidence": 0.0-1.0,
  "extracted_exercise": string | null
}

Be conservative - only classify as workout_log if clearly logging a set.`;

const COACH_SYSTEM_PROMPT = `You are VoiceFit's AI fitness coach - knowledgeable, supportive, and conversational.

PERSONALITY:
- Use contractions naturally (you're, let's, we'll)
- Celebrate progress, be constructive on setbacks
- Expert knowledge without being condescending
- Reference the user's specific situation
- Ask follow-up questions when helpful
- Use their name occasionally

EXPERTISE AREAS:
- Strength training and hypertrophy
- Program design and periodization
- Recovery and injury prevention
- Nutrition for performance
- Running and cardio

CONSTRAINTS:
- Keep responses concise (2-4 sentences unless detail requested)
- Base advice on the knowledge context provided
- If unsure, say so rather than guessing
- For medical concerns, recommend consulting a professional`;

const OFF_TOPIC_RESPONSES = [
  "I'm your fitness coach, so I'm best at helping with workouts, nutrition, and training questions. What can I help you with today?",
  "That's a bit outside my wheelhouse! I specialize in fitness and training. Got any workout questions?",
  "I'm all about fitness! Let me know if you want to talk workouts, nutrition, or recovery.",
];

// Classify a message
export async function classifyMessage(message: string): Promise<ClassificationResult> {
  try {
    const response = await generateCompletion({
      systemPrompt: CLASSIFIER_SYSTEM_PROMPT,
      userPrompt: `Classify this message: "${message}"`,
      temperature: TEMPERATURES.classification,
      maxTokens: 200,
      model: 'fast',
    });

    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    return ClassificationSchema.parse(JSON.parse(cleaned));
  } catch (error) {
    console.error('Classification error:', error);
    return {
      category: 'general',
      confidence: 0.5,
      extracted_exercise: null,
    };
  }
}

// User context for AI coach
export interface CoachContext {
  name?: string;
  experienceLevel?: string;
  goals?: string[];
  programName?: string;
  programWeek?: number;
  recentPrs?: string[];
  injuries?: string;
}

// Generate coach response
export async function generateCoachResponse(
  question: string,
  context: CoachContext,
  ragContext?: string
): Promise<string> {
  const userPrompt = `USER CONTEXT:
- Name: ${context.name || 'User'}
- Experience: ${context.experienceLevel || 'Unknown'}
- Goals: ${context.goals?.join(', ') || 'Not specified'}
- Current program: ${context.programName || 'None'}, Week ${context.programWeek || 'N/A'}
- Recent PRs: ${context.recentPrs?.join(', ') || 'None'}
- Active injuries: ${context.injuries || 'None'}

${ragContext ? `KNOWLEDGE BASE CONTEXT:\n${ragContext}\n` : ''}
USER QUESTION: ${question}

Provide a helpful, personalized response.`;

  return generateCompletion({
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 500,
  });
}

// Stream coach response (for chat UI)
export async function* streamCoachResponse(
  question: string,
  context: CoachContext,
  ragContext?: string
) {
  const userPrompt = `USER CONTEXT:
- Name: ${context.name || 'User'}
- Experience: ${context.experienceLevel || 'Unknown'}
- Goals: ${context.goals?.join(', ') || 'Not specified'}
- Current program: ${context.programName || 'None'}, Week ${context.programWeek || 'N/A'}
- Recent PRs: ${context.recentPrs?.join(', ') || 'None'}
- Active injuries: ${context.injuries || 'None'}

${ragContext ? `KNOWLEDGE BASE CONTEXT:\n${ragContext}\n` : ''}
USER QUESTION: ${question}

Provide a helpful, personalized response.`;

  for await (const chunk of streamCompletion({
    systemPrompt: COACH_SYSTEM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 500,
  })) {
    yield chunk;
  }
}

// Get off-topic redirect response
export function getOffTopicResponse(): string {
  return OFF_TOPIC_RESPONSES[Math.floor(Math.random() * OFF_TOPIC_RESPONSES.length)];
}

// Exercise swap ranking
const SWAP_SYSTEM_PROMPT = `You are a strength coach finding the best exercise substitutes.

RANKING CRITERIA (in order of importance):
1. Equipment availability - must have required equipment
2. Injury compatibility - avoid aggravating injuries
3. Movement pattern similarity - same muscle groups and pattern
4. Experience appropriateness - match user's skill level
5. Goal alignment - support their training goals

OUTPUT FORMAT:
{
  "substitutes": [
    {
      "exercise_name": string,
      "rank": 1-5,
      "reasoning": string (max 100 chars),
      "equipment_required": [string],
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ]
}`;

export interface SwapContext {
  exerciseName: string;
  experienceLevel?: string;
  goals?: string[];
  equipment?: string[];
  injuries?: string;
  candidates: Array<{ name: string; equipment: string[] }>;
}

export async function rankExerciseSwaps(context: SwapContext) {
  const userPrompt = `Find substitutes for: ${context.exerciseName}

USER CONTEXT:
- Experience: ${context.experienceLevel || 'Unknown'}
- Goals: ${context.goals?.join(', ') || 'General fitness'}
- Available equipment: ${context.equipment?.join(', ') || 'Full gym'}
- Active injuries: ${context.injuries || 'None'}

CANDIDATE EXERCISES:
${JSON.stringify(context.candidates, null, 2)}

Rank the top 5 best substitutes for this user.`;

  try {
    const response = await generateCompletion({
      systemPrompt: SWAP_SYSTEM_PROMPT,
      userPrompt,
      temperature: TEMPERATURES.analysis,
      maxTokens: 1000,
    });

    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Swap ranking error:', error);
    return { substitutes: [] };
  }
}
