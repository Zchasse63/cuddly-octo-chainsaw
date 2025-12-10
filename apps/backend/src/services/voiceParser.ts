import { generateCompletion, TEMPERATURES } from '../lib/ai';
import { z } from 'zod';

// Output schema for voice parser
const VoiceParseResultSchema = z.object({
  exercise_name: z.string().nullable(),
  weight: z.number().nullable(),
  weight_unit: z.enum(['lbs', 'kg']).nullable(),
  reps: z.number().nullable(),
  rpe: z.number().nullable(),
  sets: z.number().nullable(),
  confidence: z.number().min(0).max(1),
});

export type VoiceParseResult = z.infer<typeof VoiceParseResultSchema>;

// Session context for voice parsing
export interface VoiceSessionContext {
  currentExercise?: string;
  lastWeight?: number;
  lastWeightUnit?: string;
  preferredUnit?: string;
}

const VOICE_PARSER_SYSTEM_PROMPT = `You are a workout voice command parser. Convert the transcript into structured JSON.

RULES:
1. Extract only explicitly mentioned data
2. Use null for unmentioned fields
3. "Same weight" means use the previous weight from context
4. Confidence reflects how clear the command was

OUTPUT FORMAT:
{
  "exercise_name": string | null,
  "weight": number | null,
  "weight_unit": "lbs" | "kg" | null,
  "reps": number | null,
  "rpe": number | null,
  "sets": number | null,
  "confidence": 0.0-1.0
}

Return ONLY valid JSON.`;

/**
 * Parse voice commands into structured workout data.
 * Uses grok-3-mini-fast for fast, lightweight JSON extraction.
 *
 * @param transcript - The voice transcript to parse
 * @param context - Optional session context for resolving relative references
 * @returns Structured workout data with confidence score
 */
export async function parseVoiceCommand(
  transcript: string,
  context?: VoiceSessionContext
): Promise<VoiceParseResult> {
  const startTime = Date.now();

  const userPrompt = `CONTEXT:
- Current exercise: ${context?.currentExercise || 'not set'}
- Last weight used: ${context?.lastWeight || 'unknown'} ${context?.lastWeightUnit || ''}
- User's preferred unit: ${context?.preferredUnit || 'lbs'}

TRANSCRIPT: "${transcript}"

Parse this into structured workout data.`;

  try {
    const response = await generateCompletion({
      systemPrompt: VOICE_PARSER_SYSTEM_PROMPT,
      userPrompt,
      temperature: TEMPERATURES.parsing,
      maxTokens: 300,
      // Use grok-4-fast for fast voice parsing (~1100ms vs ~3100ms for mini)
      model: 'fast',
    });

    // Log latency in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.log('[VoiceParser] Latency:', Date.now() - startTime, 'ms');
    }

    // Clean and parse response
    const cleanedResponse = response.trim().replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(cleanedResponse);

    // Handle "same weight" case
    if (
      parsed.weight === null &&
      context?.lastWeight &&
      transcript.toLowerCase().includes('same')
    ) {
      parsed.weight = context.lastWeight;
      parsed.weight_unit = context.lastWeightUnit || 'lbs';
    }

    return VoiceParseResultSchema.parse(parsed);
  } catch (error) {
    console.error('Voice parsing error:', error);

    // Return low confidence result on error
    return {
      exercise_name: null,
      weight: null,
      weight_unit: null,
      reps: null,
      rpe: null,
      sets: null,
      confidence: 0.1,
    };
  }
}

// Confirmation message templates
const CONFIRMATIONS = {
  standard: [
    'Got it! {exercise}: {weight} × {reps}',
    'Logged! {weight} for {reps} on {exercise}',
    '{exercise} logged: {weight} × {reps}',
  ],
  pr: [
    '🎉 New PR! {exercise}: {weight} × {reps}!',
    'PR alert! {weight} × {reps} on {exercise}! 💪',
    "That's a PR! {exercise}: {weight} for {reps}!",
  ],
  setNumber: {
    1: 'First set down!',
    2: 'Set 2 complete!',
    3: 'Halfway there!',
    4: 'Set 4 done!',
    5: 'Final set!',
  } as Record<number, string>,
};

export function generateConfirmation(params: {
  exercise: string;
  weight: number;
  reps: number;
  isPr: boolean;
  setNumber?: number;
  unit?: string;
}): string {
  const { exercise, weight, reps, isPr, setNumber, unit = 'lbs' } = params;

  const templates = isPr ? CONFIRMATIONS.pr : CONFIRMATIONS.standard;
  const template = templates[Math.floor(Math.random() * templates.length)];

  let message = template
    .replace('{exercise}', exercise)
    .replace('{weight}', `${weight}${unit}`)
    .replace('{reps}', String(reps));

  if (setNumber && CONFIRMATIONS.setNumber[setNumber]) {
    message = `${CONFIRMATIONS.setNumber[setNumber]} ${message}`;
  }

  return message;
}
