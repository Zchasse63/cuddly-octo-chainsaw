// Application constants

// Voice parsing
export const VOICE_CONFIDENCE_HIGH = 0.85;
export const VOICE_CONFIDENCE_LOW = 0.7;

// Rest timer defaults
export const DEFAULT_REST_DURATION = 90; // seconds
export const REST_DURATION_OPTIONS = [30, 60, 90, 120, 180, 300];

// Weight units
export const WEIGHT_UNITS = ['lbs', 'kg'] as const;
export const DEFAULT_WEIGHT_UNIT = 'lbs';

// Exercise matching
export const FUZZY_MATCH_THRESHOLD = 0.8;

// Program generation
export const PROGRAM_WEEKS = 12;
export const MIN_TRAINING_DAYS = 2;
export const MAX_TRAINING_DAYS = 7;
export const MIN_SESSION_DURATION = 20;
export const MAX_SESSION_DURATION = 120;

// Readiness scoring
export const READINESS_EXCELLENT_MIN = 8;
export const READINESS_MODERATE_MIN = 6;
export const READINESS_LOW_MIN = 4;

// Badge types
export const BADGE_CATEGORIES = [
  'strength',
  'volume',
  'consistency',
  'running',
  'milestone',
  'special',
] as const;

// Workout types
export const WORKOUT_TYPES = [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
  'cardio',
  'recovery',
] as const;

// Goals
export const FITNESS_GOALS = [
  'strength',
  'hypertrophy',
  'endurance',
  'weight_loss',
  'general_fitness',
  'powerlifting',
  'bodybuilding',
  'athletic_performance',
] as const;

// Equipment
export const EQUIPMENT_OPTIONS = [
  'barbell',
  'dumbbells',
  'kettlebells',
  'cables',
  'machines',
  'bodyweight',
  'bands',
  'smith_machine',
  'full_gym',
  'home_gym',
] as const;

// AI temperatures
export const AI_TEMPERATURES = {
  parsing: 0.1,
  classification: 0.2,
  analysis: 0.3,
  insights: 0.5,
  coaching: 0.7,
} as const;

// Caching
export const CACHE_TTL = {
  generalCoach: 24 * 60 * 60, // 24 hours
  exerciseSwap: 7 * 24 * 60 * 60, // 7 days
  userProfile: 5 * 60, // 5 minutes
} as const;
