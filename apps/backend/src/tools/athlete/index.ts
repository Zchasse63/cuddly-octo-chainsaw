/**
 * Athlete Tools Index
 *
 * Exports all 35 athlete-facing tools organized by category.
 */

// Profile Tools (5)
import { profileTools as _profileTools } from './profile';
export { profileTools } from './profile';
export {
  getUserProfile,
  getUserPreferences,
  getActiveInjuries,
  getUserStreaks,
  getUserBadges,
} from './profile';

// Workout Tools (8)
import { workoutTools as _workoutTools } from './workout';
export { workoutTools } from './workout';
export {
  getTodaysWorkout,
  getRecentWorkouts,
  getExerciseHistory,
  getPersonalRecords,
  logWorkoutSet,
  getActiveWorkout,
  searchExercises,
  getExerciseSubstitutes,
} from './workout';

// Program Tools (4)
import { programTools as _programTools } from './program';
export { programTools } from './program';
export {
  getActiveProgram,
  getProgramProgress,
  getUpcomingWorkouts,
  getProgramWeek,
} from './program';

// Health Tools (6)
import { healthTools as _healthTools } from './health';
export { healthTools } from './health';
export {
  getReadinessScore,
  getHealthMetrics,
  getSleepData,
  getDailySummary,
  getFatigueScore,
  getNutritionLog,
} from './health';

// Running Tools (4)
import { runningTools as _runningTools } from './running';
export { runningTools } from './running';
export {
  getRecentRuns,
  getRunningPRs,
  getRunningStats,
  getShoeMileage,
} from './running';

// Injury Tools (3)
import { injuryTools as _injuryTools } from './injury';
export { injuryTools } from './injury';
export {
  getInjuryHistory,
  getInjuryRiskAssessment,
  getExercisesToAvoid,
} from './injury';

// Knowledge Tools (3)
import { knowledgeTools as _knowledgeTools } from './knowledge';
export { knowledgeTools } from './knowledge';
export {
  searchKnowledgeBase,
  getExerciseFormTips,
  getTrainingPrinciples,
} from './knowledge';

// Analytics Tools (2)
import { analyticsTools as _analyticsTools } from './analytics';
export { analyticsTools } from './analytics';
export {
  getVolumeAnalytics,
  getProgressTrends,
} from './analytics';

// Combined athlete tools object
export const athleteTools = {
  // Profile (5)
  getUserProfile: () => import('./profile').then(m => m.getUserProfile),
  getUserPreferences: () => import('./profile').then(m => m.getUserPreferences),
  getActiveInjuries: () => import('./profile').then(m => m.getActiveInjuries),
  getUserStreaks: () => import('./profile').then(m => m.getUserStreaks),
  getUserBadges: () => import('./profile').then(m => m.getUserBadges),

  // Workout (8)
  getTodaysWorkout: () => import('./workout').then(m => m.getTodaysWorkout),
  getRecentWorkouts: () => import('./workout').then(m => m.getRecentWorkouts),
  getExerciseHistory: () => import('./workout').then(m => m.getExerciseHistory),
  getPersonalRecords: () => import('./workout').then(m => m.getPersonalRecords),
  logWorkoutSet: () => import('./workout').then(m => m.logWorkoutSet),
  getActiveWorkout: () => import('./workout').then(m => m.getActiveWorkout),
  searchExercises: () => import('./workout').then(m => m.searchExercises),
  getExerciseSubstitutes: () => import('./workout').then(m => m.getExerciseSubstitutes),

  // Program (4)
  getActiveProgram: () => import('./program').then(m => m.getActiveProgram),
  getProgramProgress: () => import('./program').then(m => m.getProgramProgress),
  getUpcomingWorkouts: () => import('./program').then(m => m.getUpcomingWorkouts),
  getProgramWeek: () => import('./program').then(m => m.getProgramWeek),

  // Health (6)
  getReadinessScore: () => import('./health').then(m => m.getReadinessScore),
  getHealthMetrics: () => import('./health').then(m => m.getHealthMetrics),
  getSleepData: () => import('./health').then(m => m.getSleepData),
  getDailySummary: () => import('./health').then(m => m.getDailySummary),
  getFatigueScore: () => import('./health').then(m => m.getFatigueScore),
  getNutritionLog: () => import('./health').then(m => m.getNutritionLog),

  // Running (4)
  getRecentRuns: () => import('./running').then(m => m.getRecentRuns),
  getRunningPRs: () => import('./running').then(m => m.getRunningPRs),
  getRunningStats: () => import('./running').then(m => m.getRunningStats),
  getShoeMileage: () => import('./running').then(m => m.getShoeMileage),

  // Injury (3)
  getInjuryHistory: () => import('./injury').then(m => m.getInjuryHistory),
  getInjuryRiskAssessment: () => import('./injury').then(m => m.getInjuryRiskAssessment),
  getExercisesToAvoid: () => import('./injury').then(m => m.getExercisesToAvoid),

  // Knowledge (3)
  searchKnowledgeBase: () => import('./knowledge').then(m => m.searchKnowledgeBase),
  getExerciseFormTips: () => import('./knowledge').then(m => m.getExerciseFormTips),
  getTrainingPrinciples: () => import('./knowledge').then(m => m.getTrainingPrinciples),

  // Analytics (2)
  getVolumeAnalytics: () => import('./analytics').then(m => m.getVolumeAnalytics),
  getProgressTrends: () => import('./analytics').then(m => m.getProgressTrends),
};

// Total count of athlete tools
export const ATHLETE_TOOL_COUNT = 35;

// All athlete tools as an object for registration
export function getAllAthleteTools() {
  return {
    ..._profileTools,
    ..._workoutTools,
    ..._programTools,
    ..._healthTools,
    ..._runningTools,
    ..._injuryTools,
    ..._knowledgeTools,
    ..._analyticsTools,
  };
}

