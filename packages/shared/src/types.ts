import { z } from 'zod';

// User types
export const ExperienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const TierSchema = z.enum(['free', 'premium', 'coach']);
export type Tier = z.infer<typeof TierSchema>;

export const ThemeSchema = z.enum(['light', 'dark', 'auto']);
export type Theme = z.infer<typeof ThemeSchema>;

// Workout types
export const WorkoutStatusSchema = z.enum(['active', 'completed', 'cancelled']);
export type WorkoutStatus = z.infer<typeof WorkoutStatusSchema>;

export const LoggingMethodSchema = z.enum(['voice', 'manual', 'quick_log']);
export type LoggingMethod = z.infer<typeof LoggingMethodSchema>;

// Exercise types
export const MuscleGroupSchema = z.enum([
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques',
  'lower_back', 'traps', 'lats', 'full_body'
]);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

export const MovementPatternSchema = z.enum([
  'push', 'pull', 'squat', 'hinge', 'lunge', 'carry', 'rotation', 'isolation'
]);
export type MovementPattern = z.infer<typeof MovementPatternSchema>;

export const EquipmentTypeSchema = z.enum([
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'machine',
  'bodyweight', 'bands', 'smith_machine', 'ez_bar', 'trap_bar'
]);
export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;

// Readiness types
export const ReadinessTrendSchema = z.enum(['improving', 'stable', 'declining']);
export type ReadinessTrend = z.infer<typeof ReadinessTrendSchema>;

// Injury types
export const InjurySeveritySchema = z.enum(['mild', 'moderate', 'severe']);
export type InjurySeverity = z.infer<typeof InjurySeveritySchema>;

export const PainTypeSchema = z.enum(['doms', 'injury', 'unclear']);
export type PainType = z.infer<typeof PainTypeSchema>;

// Voice parsing types
export interface VoiceParseResult {
  exercise_name: string | null;
  weight: number | null;
  weight_unit: 'lbs' | 'kg' | null;
  reps: number | null;
  rpe: number | null;
  sets: number | null;
  confidence: number;
}

// Chat types
export const ChatCategorySchema = z.enum([
  'workout_log', 'exercise_swap', 'question', 'off_topic', 'general'
]);
export type ChatCategory = z.infer<typeof ChatCategorySchema>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Program types
export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  rpe: number;
  rest_seconds: number;
  notes?: string | null;
}

export interface ProgramSession {
  day: number;
  name: string;
  exercises: ProgramExercise[];
}

export interface ProgramWeek {
  week_number: number;
  sessions: ProgramSession[];
}

export interface ProgramPhase {
  name: string;
  weeks: [number, number];
  focus: string;
}

export interface GeneratedProgram {
  program_name: string;
  description: string;
  phases: ProgramPhase[];
  weeks: ProgramWeek[];
}
