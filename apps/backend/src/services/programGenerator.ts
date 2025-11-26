import { generateCompletion, TEMPERATURES } from '../lib/grok';
import { z } from 'zod';

// Program generation schema
const ProgramExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  rpe: z.number(),
  rest_seconds: z.number(),
  notes: z.string().nullable().optional(),
});

const ProgramSessionSchema = z.object({
  day: z.number(),
  name: z.string(),
  exercises: z.array(ProgramExerciseSchema),
});

const ProgramWeekSchema = z.object({
  week_number: z.number(),
  sessions: z.array(ProgramSessionSchema),
});

const ProgramPhaseSchema = z.object({
  name: z.string(),
  weeks: z.tuple([z.number(), z.number()]),
  focus: z.string(),
});

const GeneratedProgramSchema = z.object({
  program_name: z.string(),
  description: z.string(),
  phases: z.array(ProgramPhaseSchema),
  weeks: z.array(ProgramWeekSchema),
});

export type GeneratedProgram = z.infer<typeof GeneratedProgramSchema>;
export type ProgramSession = z.infer<typeof ProgramSessionSchema>;
export type ProgramExercise = z.infer<typeof ProgramExerciseSchema>;

// Program generation params
export interface ProgramParams {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  frequency: number; // days per week
  duration: number; // minutes per session
  equipment: string[];
  injuries?: string;
  favoriteExercises?: string[];
  exercisesToAvoid?: string[];
  preferredRepRanges?: string;
}

const PROGRAM_SYSTEM_PROMPT = `You are an expert strength coach creating personalized training programs.

REQUIREMENTS:
1. Generate complete 12-week program (all weeks, all sessions)
2. Include periodization with distinct phases
3. Account for user's equipment, injuries, and goals
4. Specify sets, reps, RPE, and rest periods
5. Include exercise progression and variation

OUTPUT FORMAT:
{
  "program_name": string,
  "description": string,
  "phases": [
    {
      "name": string,
      "weeks": [start, end],
      "focus": string
    }
  ],
  "weeks": [
    {
      "week_number": 1,
      "sessions": [
        {
          "day": 1,
          "name": "Push A",
          "exercises": [
            {
              "name": string,
              "sets": number,
              "reps": string,
              "rpe": number,
              "rest_seconds": number,
              "notes": string | null
            }
          ]
        }
      ]
    }
  ]
}

Return ONLY valid JSON - no markdown, no explanations.`;

export async function generateProgram(
  params: ProgramParams,
  ragContext?: string
): Promise<GeneratedProgram> {
  const userPrompt = `Create a 12-week program for this user:

PROFILE:
- Experience: ${params.experienceLevel}
- Goals: ${params.goals.join(', ')}
- Training days per week: ${params.frequency}
- Session duration: ${params.duration} minutes
- Available equipment: ${params.equipment.join(', ')}
- Injuries to work around: ${params.injuries || 'None'}

PREFERENCES:
- Favorite exercises: ${params.favoriteExercises?.join(', ') || 'No preference'}
- Exercises to avoid: ${params.exercisesToAvoid?.join(', ') || 'None'}
- Preferred rep ranges: ${params.preferredRepRanges || 'Standard'}

${ragContext ? `KNOWLEDGE CONTEXT:\n${ragContext}\n` : ''}
Generate the complete program.`;

  try {
    const response = await generateCompletion({
      systemPrompt: PROGRAM_SYSTEM_PROMPT,
      userPrompt,
      temperature: TEMPERATURES.coaching,
      maxTokens: 8000,
    });

    // Clean and parse response
    const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(cleaned);

    return GeneratedProgramSchema.parse(parsed);
  } catch (error) {
    console.error('Program generation error:', error);
    throw new Error('Failed to generate program');
  }
}

// Generate a single week (for streaming/progressive generation)
export async function generateProgramWeek(
  weekNumber: number,
  params: ProgramParams,
  previousWeeks?: ProgramWeekSchema[]
): Promise<z.infer<typeof ProgramWeekSchema>> {
  const userPrompt = `Generate ONLY week ${weekNumber} of a 12-week program.

PROFILE:
- Experience: ${params.experienceLevel}
- Goals: ${params.goals.join(', ')}
- Training days: ${params.frequency}
- Session duration: ${params.duration} minutes
- Equipment: ${params.equipment.join(', ')}
- Injuries: ${params.injuries || 'None'}

${previousWeeks?.length ? `Previous weeks context: ${JSON.stringify(previousWeeks.slice(-2))}` : ''}

Return ONLY the week JSON object.`;

  const response = await generateCompletion({
    systemPrompt: PROGRAM_SYSTEM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 2000,
  });

  const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
  return ProgramWeekSchema.parse(JSON.parse(cleaned));
}

// Quick workout generator (for single session)
export async function generateQuickWorkout(params: {
  type: 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';
  duration: number;
  equipment: string[];
  experience: string;
}): Promise<ProgramSession> {
  const userPrompt = `Generate a single ${params.type} workout:
- Duration: ${params.duration} minutes
- Equipment: ${params.equipment.join(', ')}
- Experience: ${params.experience}

Return a single session object with exercises.`;

  const response = await generateCompletion({
    systemPrompt: PROGRAM_SYSTEM_PROMPT,
    userPrompt,
    temperature: TEMPERATURES.coaching,
    maxTokens: 1000,
  });

  const cleaned = response.trim().replace(/```json\n?|\n?```/g, '');
  return ProgramSessionSchema.parse(JSON.parse(cleaned));
}
