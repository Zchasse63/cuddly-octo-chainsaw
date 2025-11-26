import { router } from '../trpc';
import { authRouter } from './auth';
import { exerciseRouter } from './exercise';
import { workoutRouter } from './workout';
import { voiceRouter } from './voice';
import { coachRouter } from './coach';
import { readinessRouter } from './readiness';
import { programRouter } from './program';
import { injuryRouter } from './injury';
import { onboardingRouter } from './onboarding';
import { gamificationRouter } from './gamification';
import { searchRouter } from './search';
import { conversationsRouter } from './conversations';
import { substitutionsRouter } from './substitutions';
import { knowledgeRouter } from './knowledge';

export const appRouter = router({
  auth: authRouter,
  exercise: exerciseRouter,
  workout: workoutRouter,
  voice: voiceRouter,
  coach: coachRouter,
  readiness: readinessRouter,
  program: programRouter,
  injury: injuryRouter,
  onboarding: onboardingRouter,
  gamification: gamificationRouter,
  search: searchRouter,
  conversations: conversationsRouter,
  substitutions: substitutionsRouter,
  knowledge: knowledgeRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
