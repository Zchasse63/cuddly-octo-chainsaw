# VoiceFit 2.0 Tech Stack Recommendations

**Goal**: Modern, performant, developer-friendly stack while maintaining all original functionality.

---

## Current Stack Assessment

| Layer | Current | Status | Recommendation |
|-------|---------|--------|----------------|
| Backend API | tRPC v11 | ✅ Keep | Excellent choice |
| ORM | Drizzle | ✅ Keep | Best TypeScript ORM |
| Database | Supabase PostgreSQL | ✅ Keep | Great for this use case |
| Mobile Framework | Expo SDK 53 | ✅ Keep | Modern, well-supported |
| Navigation | Expo Router v4 | ✅ Keep | File-based, great DX |
| Styling | NativeWind v4 | ✅ Keep | Tailwind for RN |
| Client State | Zustand | ✅ Keep | Simple, effective |
| Offline Sync | WatermelonDB | ❌ Replace | **Use PowerSync** |
| Server State | Manual | ❌ Missing | **Add TanStack Query** |

---

## Recommended Stack Upgrades

### 1. Server State: TanStack Query ⭐ HIGH PRIORITY

**Why**: tRPC already uses TanStack Query under the hood, but we should leverage it fully.

```typescript
// Current (basic tRPC)
const { data } = api.workout.list.useQuery();

// Enhanced (with TanStack Query options)
const { data, isLoading, error, refetch } = api.workout.list.useQuery(
  { limit: 20 },
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
  }
);

// Optimistic updates
const utils = api.useUtils();
const mutation = api.workout.logSet.useMutation({
  onMutate: async (newSet) => {
    await utils.workout.current.cancel();
    const previous = utils.workout.current.getData();
    utils.workout.current.setData(undefined, (old) => ({
      ...old,
      sets: [...old.sets, newSet],
    }));
    return { previous };
  },
  onError: (err, newSet, context) => {
    utils.workout.current.setData(undefined, context.previous);
  },
  onSettled: () => {
    utils.workout.current.invalidate();
  },
});
```

**Benefits**:
- Automatic caching and deduplication
- Background refetching
- Optimistic updates (instant UI feedback)
- Offline mutation queueing
- Prefetching

---

### 2. Offline Sync: PowerSync ⭐ HIGH PRIORITY

**Why**: Purpose-built for Supabase, automatic sync, less boilerplate than WatermelonDB.

```typescript
// packages/mobile/src/lib/powersync.ts
import { PowerSyncDatabase } from '@powersync/react-native';
import { SupabaseConnector } from '@powersync/supabase';

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'voicefit.db' },
});

export const connector = new SupabaseConnector({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  powerSync,
});

// In your app
await powerSync.connect(connector);

// Queries work offline automatically
const sets = await powerSync.getAll('SELECT * FROM workout_sets WHERE workout_id = ?', [workoutId]);

// Writes sync when online
await powerSync.execute(
  'INSERT INTO workout_sets (id, workout_id, reps, weight) VALUES (?, ?, ?, ?)',
  [uuid(), workoutId, 8, 225]
);
```

**Benefits**:
- Automatic bi-directional sync
- Works offline seamlessly
- Conflict resolution built-in
- Supabase-native integration

---

### 3. Forms: React Hook Form + Zod ⭐ HIGH PRIORITY

**Why**: Type-safe forms with validation that matches your tRPC schemas.

```typescript
// Shared Zod schema (used by both tRPC and forms)
// packages/shared/src/schemas/workout.ts
export const logSetSchema = z.object({
  exerciseId: z.string().uuid(),
  reps: z.number().min(1).max(100),
  weight: z.number().min(0).max(2000),
  rpe: z.number().min(1).max(10).optional(),
});

// In mobile app
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function LogSetForm({ exerciseId }: { exerciseId: string }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(logSetSchema),
    defaultValues: { exerciseId, reps: 0, weight: 0 },
  });

  const mutation = api.workout.logSet.useMutation();

  return (
    <View>
      <Controller
        control={control}
        name="reps"
        render={({ field }) => (
          <TextInput
            value={String(field.value)}
            onChangeText={(v) => field.onChange(Number(v))}
            keyboardType="numeric"
          />
        )}
      />
      {errors.reps && <Text className="text-red-500">{errors.reps.message}</Text>}

      <Button onPress={handleSubmit((data) => mutation.mutate(data))} />
    </View>
  );
}
```

**Benefits**:
- Single source of truth for validation (Zod)
- Type inference from schemas
- Great error handling
- Minimal re-renders

---

### 4. Animations: React Native Reanimated 3 + Moti ⭐ MEDIUM PRIORITY

**Why**: Smooth 60fps animations, essential for a polished fitness app.

```typescript
// PR celebration animation
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';

function PRCelebration({ isVisible }: { isVisible: boolean }) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.5, translateY: 50 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }}
    >
      <Text className="text-4xl">🏆 NEW PR!</Text>
    </MotiView>
  );
}

// Swipeable set card
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function SwipeableSetCard({ onDelete }: { onDelete: () => void }) {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd(() => {
      if (translateX.value < -100) {
        onDelete();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        {/* Card content */}
      </Animated.View>
    </GestureDetector>
  );
}
```

**Packages**:
- `react-native-reanimated` - Core animation library
- `moti` - Declarative animations (simpler API)
- `react-native-gesture-handler` - Touch gestures

---

### 5. AI Integration: Vercel AI SDK ⭐ MEDIUM PRIORITY

**Why**: Streaming responses, tool calling, works great with tRPC.

```typescript
// apps/backend/src/services/ai-coach.ts
import { streamText, generateText, tool } from 'ai';
import { xai } from '@ai-sdk/xai';

// Streaming AI coach response
export async function streamCoachResponse(
  userId: string,
  message: string,
  context: CoachContext
) {
  const result = await streamText({
    model: xai('grok-2'),
    system: buildCoachSystemPrompt(context),
    messages: [{ role: 'user', content: message }],
    tools: {
      suggestExercise: tool({
        description: 'Suggest an alternative exercise',
        parameters: z.object({
          currentExercise: z.string(),
          reason: z.enum(['injury', 'equipment', 'preference']),
        }),
        execute: async ({ currentExercise, reason }) => {
          return getExerciseSubstitutions(currentExercise, reason, context);
        },
      }),
      analyzeVolume: tool({
        description: 'Analyze training volume for a muscle group',
        parameters: z.object({ muscleGroup: z.string() }),
        execute: async ({ muscleGroup }) => {
          return analyzeWeeklyVolume(userId, muscleGroup);
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}

// In tRPC router
export const coachRouter = router({
  chat: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async function* ({ ctx, input }) {
      const stream = await streamCoachResponse(ctx.user.id, input.message, ctx);
      for await (const chunk of stream) {
        yield chunk;
      }
    }),
});
```

**Benefits**:
- Streaming responses (better UX)
- Built-in tool calling
- Provider-agnostic (easy to switch AI models)
- TypeScript-first

---

### 6. Background Jobs: Trigger.dev ⭐ MEDIUM PRIORITY

**Why**: Modern job queue for long-running tasks (program generation, analytics).

```typescript
// apps/backend/src/jobs/generate-program.ts
import { task } from '@trigger.dev/sdk/v3';

export const generateProgramTask = task({
  id: 'generate-program',
  maxDuration: 300, // 5 minutes
  run: async (payload: { userId: string; preferences: ProgramPreferences }) => {
    // Step 1: Analyze user history
    const history = await analyzeTrainingHistory(payload.userId);

    // Step 2: Generate program with AI
    const program = await generateWithAI(history, payload.preferences);

    // Step 3: Save to database
    await saveProgramToDatabase(payload.userId, program);

    // Step 4: Notify user
    await sendPushNotification(payload.userId, 'Your program is ready!');

    return { programId: program.id };
  },
});

// Trigger from tRPC
export const programRouter = router({
  generate: protectedProcedure
    .input(programPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const handle = await generateProgramTask.trigger({
        userId: ctx.user.id,
        preferences: input,
      });
      return { jobId: handle.id };
    }),

  status: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return await runs.retrieve(input.jobId);
    }),
});
```

**Use cases**:
- AI program generation (can take 30+ seconds)
- Weekly analytics computation
- Batch embedding generation
- Email/notification sending

---

### 7. Error Tracking: Sentry ⭐ HIGH PRIORITY

**Why**: Essential for production apps. Know about crashes before users report them.

```typescript
// apps/mobile/src/lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoSessionTracking: true,
  tracesSampleRate: 0.2,
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation: Sentry.reactNavigationIntegration,
    }),
  ],
});

// Capture tRPC errors
export const trpcErrorHandler = (error: TRPCError) => {
  Sentry.captureException(error, {
    tags: { type: 'trpc', code: error.code },
    extra: { path: error.path },
  });
};

// User context
Sentry.setUser({ id: user.id, email: user.email });
```

**Also add to backend**:
```typescript
// apps/backend/src/lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

---

### 8. Analytics: PostHog ⭐ MEDIUM PRIORITY

**Why**: Open-source, privacy-focused, includes feature flags, session replay.

```typescript
// apps/mobile/src/lib/analytics.ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog(process.env.EXPO_PUBLIC_POSTHOG_KEY!, {
  host: 'https://app.posthog.com',
});

// Track events
posthog.capture('workout_completed', {
  duration_minutes: 45,
  exercises_count: 6,
  total_volume: 15000,
  prs_hit: 2,
});

// Feature flags
const showNewCoachUI = await posthog.isFeatureEnabled('new-coach-ui');

// User identification
posthog.identify(user.id, {
  email: user.email,
  tier: user.tier,
  experience_level: user.experienceLevel,
});
```

**Features we'd use**:
- Event tracking (workout completed, PR hit, voice command used)
- Feature flags (A/B testing)
- Session recording (debug UX issues)
- Funnels (onboarding completion)

---

### 9. Push Notifications: Expo Notifications ⭐ MEDIUM PRIORITY

**Why**: Built into Expo, simple setup, works well.

```typescript
// apps/mobile/src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  });

  // Save token to backend
  await api.user.savePushToken.mutate({ token: token.data });

  return token.data;
}

// Backend: Send notification
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { profile: true },
  });

  if (!user?.pushToken) return;

  await expo.sendPushNotificationsAsync([{
    to: user.pushToken,
    title,
    body,
    data,
    sound: 'default',
  }]);
}
```

**Notification types**:
- Workout reminders
- PR celebrations
- Coach messages
- Program updates
- Streak warnings

---

### 10. Image Optimization: expo-image + Cloudinary ⭐ LOW PRIORITY

**Why**: Better performance than `<Image>`, optimized loading.

```typescript
// Use expo-image instead of RN Image
import { Image } from 'expo-image';

function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Image
      source={{ uri: exercise.thumbnailUrl }}
      placeholder={blurhash}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      style={{ width: 100, height: 100 }}
    />
  );
}

// Cloudinary for user uploads (progress photos)
const uploadUrl = cloudinary.url(publicId, {
  transformation: [
    { width: 800, height: 800, crop: 'limit' },
    { quality: 'auto' },
    { fetch_format: 'auto' },
  ],
});
```

---

### 11. Maps: react-native-maps + Mapbox ⭐ MEDIUM PRIORITY (for running)

**Why**: Essential for run tracking, route display.

```typescript
// apps/mobile/src/components/RunMap.tsx
import MapView, { Polyline, Marker } from 'react-native-maps';

function RunMap({ route }: { route: Coordinate[] }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: route[0].lat,
        longitude: route[0].lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Polyline
        coordinates={route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
        strokeColor="#3B82F6"
        strokeWidth={4}
      />
      <Marker coordinate={{ latitude: route[0].lat, longitude: route[0].lng }}>
        <View className="bg-green-500 rounded-full p-2">
          <Text>🏃</Text>
        </View>
      </Marker>
    </MapView>
  );
}
```

---

### 12. Code Quality: Biome ⭐ LOW PRIORITY

**Why**: 10-100x faster than ESLint + Prettier combined.

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  }
}
```

**Or stick with ESLint flat config** if team prefers.

---

### 13. Testing: Vitest + Testing Library + Maestro ⭐ MEDIUM PRIORITY

```typescript
// Unit tests with Vitest (faster than Jest)
// apps/backend/src/services/__tests__/voice-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from '../voice-parser';

describe('parseVoiceCommand', () => {
  it('parses basic set', async () => {
    const result = await parseVoiceCommand('bench press 225 for 8');
    expect(result).toEqual({
      exercise: 'Barbell Bench Press',
      weight: 225,
      reps: 8,
      confidence: expect.any(Number),
    });
  });
});

// E2E with Maestro (mobile)
// .maestro/flows/log-workout.yaml
appId: com.voicefit.app
---
- launchApp
- tapOn: "Start Workout"
- tapOn: "Bench Press"
- inputText: "225"
- tapOn: "Log Set"
- assertVisible: "Set logged"
```

---

## Final Recommended Stack

### Core (Keep)
- **tRPC v11** - Type-safe API
- **Drizzle ORM** - TypeScript ORM
- **Supabase** - Database + Auth
- **Expo SDK 53** - Mobile framework
- **Expo Router v4** - Navigation
- **NativeWind v4** - Styling
- **Zustand** - Client state
- **Turborepo** - Monorepo

### Add New
| Tool | Purpose | Priority |
|------|---------|----------|
| **TanStack Query** | Server state, caching, optimistic updates | ⭐⭐⭐ |
| **PowerSync** | Offline sync with Supabase | ⭐⭐⭐ |
| **React Hook Form + Zod** | Type-safe forms | ⭐⭐⭐ |
| **Sentry** | Error tracking | ⭐⭐⭐ |
| **Reanimated 3 + Moti** | Smooth animations | ⭐⭐ |
| **Vercel AI SDK** | Streaming AI, tool calling | ⭐⭐ |
| **Trigger.dev** | Background jobs | ⭐⭐ |
| **PostHog** | Analytics + feature flags | ⭐⭐ |
| **Expo Notifications** | Push notifications | ⭐⭐ |
| **react-native-maps** | Run route display | ⭐⭐ |
| **expo-image** | Optimized images | ⭐ |
| **Vitest** | Fast unit tests | ⭐ |
| **Maestro** | Mobile E2E tests | ⭐ |
| **Biome** | Linting/formatting | ⭐ |

---

## Package Updates

```json
// apps/mobile/package.json additions
{
  "dependencies": {
    "@powersync/react-native": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "react-native-reanimated": "^3.16.0",
    "moti": "^0.29.0",
    "react-native-gesture-handler": "^2.20.0",
    "@sentry/react-native": "^5.33.0",
    "posthog-react-native": "^3.3.0",
    "expo-notifications": "~0.29.0",
    "expo-image": "~2.0.0",
    "react-native-maps": "^1.18.0"
  }
}

// apps/backend/package.json additions
{
  "dependencies": {
    "ai": "^3.4.0",
    "@ai-sdk/xai": "^0.0.1",
    "@trigger.dev/sdk": "^3.0.0",
    "@sentry/node": "^8.0.0",
    "posthog-node": "^4.2.0",
    "expo-server-sdk": "^3.10.0"
  }
}
```

---

## Migration Order

1. **Week 1**: TanStack Query integration (already in tRPC, just configure)
2. **Week 1**: React Hook Form + Zod for all forms
3. **Week 2**: Sentry setup (both mobile and backend)
4. **Week 2**: Reanimated 3 + Moti for animations
5. **Week 3**: PowerSync offline setup
6. **Week 3**: PostHog analytics
7. **Week 4**: Vercel AI SDK for coach
8. **Week 4**: Trigger.dev for background jobs
9. **Week 5**: Push notifications
10. **Week 6**: Maps for running

This can happen in parallel with the database/feature work from the main implementation plan.
