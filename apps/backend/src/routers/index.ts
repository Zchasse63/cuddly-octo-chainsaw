import { router } from '../trpc';
import { authRouter } from './auth';
import { exerciseRouter } from './exercise';
import { workoutRouter } from './workout';
import { voiceRouter } from './voice';
import { coachRouter } from './coach';
import { readinessRouter } from './readiness';
import { programRouter } from './program';
import { injuryRouter } from './injury';

export const appRouter = router({
  auth: authRouter,
  exercise: exerciseRouter,
  workout: workoutRouter,
  voice: voiceRouter,
  coach: coachRouter,
  readiness: readinessRouter,
  program: programRouter,
  injury: injuryRouter,
});

// Export type for client
export type AppRouter = typeof appRouter;
