import { generateCompletion, TEMPERATURES } from '../lib/grok';
import { z } from 'zod';

// Injury detection result schema
const InjuryDetectionSchema = z.object({
  injury_detected: z.boolean(),
  confidence: z.number().min(0).max(1),
  body_part: z.string(),
  severity: z.enum(['mild', 'moderate', 'severe']),
  description: z.string(),
  recommendations: z.array(z.string()),
  exercise_modifications: z.array(z.string()),
  should_see_doctor: z.boolean(),
  red_flags_present: z.array(z.string()),
});

export type InjuryDetectionResult = z.infer<typeof InjuryDetectionSchema>;

const INJURY_SYSTEM_PROMPT = `You are a sports medicine assistant analyzing potential injuries for strength athletes.

GUIDELINES:
1. Distinguish between normal soreness (DOMS) and injury indicators
2. Be conservative - recommend professional consultation when uncertain
3. Provide actionable, specific recommendations
4. Consider acute vs chronic/overuse patterns

SEVERITY LEVELS:
- mild: Minor discomfort, can train with modifications
- moderate: Noticeable limitation, needs significant modification
- severe: Major limitation, needs rest and likely medical attention

RED FLAGS (always recommend doctor):
- Sharp pain during movement
- "Pop" or "tear" sensation
- Significant swelling
- Numbness or tingling
- Pain at rest or at night
- Symptoms >2 weeks without improvement

OUTPUT FORMAT:
{
  "injury_detected": boolean,
  "confidence": 0.0-1.0,
  "body_part": string,
  "severity": "mild" | "moderate" | "severe",
  "description": string,
  "recommendations": [string],
  "exercise_modifications": [string],
  "should_see_doctor": boolean,
  "red_flags_present": [string]
}`;

export interface InjuryContext {
  injuryNotes: string;
  recentWorkouts?: string[];
  injuryHistory?: string[];
  painLevel: number; // 1-10
  experienceLevel: string;
}

export async function detectInjury(
  context: InjuryContext,
  ragContext?: string
): Promise<InjuryDetectionResult> {
  const userPrompt = `Analyze this injury report:

USER NOTES: "${context.injuryNotes}"

USER CONTEXT:
- Recent workouts: ${context.recentWorkouts?.join(', ') || 'Unknown'}
- Previous injuries: ${context.injuryHistory?.join(', ') || 'None'}
- Current pain level: ${context.painLevel}/10
- Training experience: ${context.experienceLevel}

${ragContext ? `KNOWLEDGE CONTEXT:\n${ragContext}\n` : ''}
Provide your analysis.`;

  try {
    const response = await generateCompletion({
      systemPrompt: INJURY_SYSTEM_PROMPT,
      userPrompt,
      temperature: TEMPERATURES.analysis, // Conservative temperature
      maxTokens: 800,
    });

    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    return InjuryDetectionSchema.parse(JSON.parse(cleaned));
  } catch (error) {
    console.error('Injury detection error:', error);

    // Return conservative fallback
    return {
      injury_detected: true,
      confidence: 0.5,
      body_part: 'unknown',
      severity: 'moderate',
      description: 'Unable to analyze automatically. Please consult a healthcare professional.',
      recommendations: [
        'Rest the affected area',
        'Apply ice if there is swelling',
        'Consult a healthcare professional for proper diagnosis',
      ],
      exercise_modifications: ['Avoid exercises that cause pain'],
      should_see_doctor: true,
      red_flags_present: [],
    };
  }
}

// Check if notes indicate DOMS vs injury
export async function classifyPainType(notes: string): Promise<{
  type: 'doms' | 'injury' | 'unclear';
  confidence: number;
  reason: string;
}> {
  const systemPrompt = `Classify if the user's pain description indicates:
- DOMS (Delayed Onset Muscle Soreness): Normal post-workout soreness, diffuse, muscle-specific
- Injury: Sharp pain, joint pain, sudden onset, specific location, functional limitation
- Unclear: Not enough information

Return JSON:
{
  "type": "doms" | "injury" | "unclear",
  "confidence": 0.0-1.0,
  "reason": string
}`;

  try {
    const response = await generateCompletion({
      systemPrompt,
      userPrompt: `Classify this pain description: "${notes}"`,
      temperature: TEMPERATURES.analysis,
      maxTokens: 200,
    });

    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    return JSON.parse(cleaned);
  } catch (error) {
    return {
      type: 'unclear',
      confidence: 0.5,
      reason: 'Unable to classify',
    };
  }
}
