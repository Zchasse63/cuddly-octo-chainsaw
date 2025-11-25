# VoiceFit Architecture Deep Dive: Current vs. Proposed

A detailed comparison of each architectural layer, what can be incrementally improved, and what requires a rewrite.

---

## Table of Contents

1. [Backend Language: Python vs TypeScript](#1-backend-language-python-vs-typescript)
2. [API Architecture: REST vs tRPC](#2-api-architecture-rest-vs-trpc)
3. [Mobile Navigation: React Navigation vs Expo Router](#3-mobile-navigation-react-navigation-vs-expo-router)
4. [State Management: Zustand vs TanStack Query](#4-state-management-zustand-vs-tanstack-query)
5. [Offline Strategy: WatermelonDB vs SQLite Queue](#5-offline-strategy-watermelondb-vs-sqlite-queue)
6. [Auth Storage: localStorage vs SecureStore](#6-auth-storage-localstorage-vs-securestore)
7. [AI Providers: Multiple vs Single](#7-ai-providers-multiple-vs-single)
8. [Web Apps: Separate vs Unified](#8-web-apps-separate-vs-unified)
9. [Summary: What to Do](#9-summary-what-to-do)

---

## 1. Backend Language: Python vs TypeScript

### Current Implementation (Python/FastAPI)

```python
# apps/backend/main.py - 230KB, 4400+ lines
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel

class VoiceParseRequest(BaseModel):
    text: str
    user_id: str
    context: dict | None = None

class VoiceParseResponse(BaseModel):
    exercise_name: str
    exercise_id: str | None
    sets: list[dict]
    confidence: float

@app.post("/api/voice/parse", response_model=VoiceParseResponse)
async def parse_voice_command(
    request: VoiceParseRequest,
    user: dict = Depends(verify_token)
):
    # Implementation...
    return VoiceParseResponse(...)
```

```typescript
// apps/mobile/src/services/api/VoiceAPIClient.ts
// MANUALLY defined types that must match Python
interface VoiceParseRequest {
  text: string;
  user_id: string;
  context?: Record<string, unknown>;
}

interface VoiceParseResponse {
  exercise_name: string;
  exercise_id: string | null;
  sets: Array<{ reps: number; weight?: number }>;
  confidence: number;
}

async function parseVoiceInput(request: VoiceParseRequest): Promise<VoiceParseResponse> {
  const response = await fetch('/api/voice/parse', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json(); // Hope the types match!
}
```

### The Problems

1. **Type Drift**: Python types and TypeScript types are defined separately. When one changes, the other doesn't automatically update. You discover mismatches at runtime, not compile time.

2. **No Compile-Time Safety**: If the backend returns `exerciseName` but frontend expects `exercise_name`, you won't know until a user reports a bug.

3. **Dual Maintenance**: Every API change requires updating:
   - Python Pydantic model
   - TypeScript interface
   - Any documentation
   - Tests in both languages

4. **Different Ecosystems**: Python developers think differently than TypeScript developers. Code patterns, error handling, and libraries all differ.

### Proposed Implementation (TypeScript/Node.js)

```typescript
// packages/api/src/routers/voice.ts
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

// Single source of truth for types
const VoiceParseInput = z.object({
  text: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

export const voiceRouter = router({
  parse: protectedProcedure
    .input(VoiceParseInput)
    .mutation(async ({ input, ctx }) => {
      // Implementation...
      return {
        exerciseName: 'Bench Press',
        exerciseId: 'uuid-123',
        sets: [{ reps: 8, weight: 225 }],
        confidence: 0.95,
      };
      // Return type is INFERRED - no manual definition needed
    }),
});
```

```typescript
// apps/mobile/hooks/useVoice.ts
import { api } from '@/lib/trpc';

export function useVoiceParse() {
  // Types flow automatically from the router definition
  const mutation = api.voice.parse.useMutation();

  // mutation.data is fully typed as:
  // { exerciseName: string; exerciseId: string; sets: Array<...>; confidence: number }

  // If backend changes, TypeScript errors appear HERE immediately
  return mutation;
}
```

### Why It's Better

| Aspect | Python Backend | TypeScript Backend |
|--------|---------------|-------------------|
| Type Safety | Manual sync (error-prone) | Automatic inference |
| Refactoring | Scary (might break frontend) | Safe (compiler catches issues) |
| Developer Count | Need Python + TS devs | One skill set |
| Shared Code | None | Validators, utils, types |
| Learning Curve | Two languages | One language |
| Hiring | Harder (specialized) | Easier (full-stack TS) |

### Can You Implement Incrementally?

**No - this requires a rewrite.**

You cannot gradually migrate from Python to TypeScript. The backend is either Python or TypeScript. However, you CAN:

1. **Keep Python** but add OpenAPI code generation to auto-generate TypeScript types
2. **Add a TypeScript API layer** that proxies to Python (complexity, but possible)
3. **Build new services in TypeScript** while keeping Python for existing

### Effort Level: 🔴 Full Rewrite (8-12 weeks for backend)

---

## 2. API Architecture: REST vs tRPC

### Current Implementation (REST)

```python
# 129 separate endpoint definitions across main.py
@app.get("/api/workouts/{user_id}")
@app.post("/api/workouts")
@app.put("/api/workouts/{workout_id}")
@app.delete("/api/workouts/{workout_id}")
@app.get("/api/workouts/{workout_id}/sets")
@app.post("/api/workouts/{workout_id}/sets")
# ... 123 more endpoints
```

```typescript
// Frontend must know exact URL, method, and payload structure
const getWorkouts = () => fetch('/api/workouts/' + userId);
const createWorkout = (data) => fetch('/api/workouts', { method: 'POST', body: JSON.stringify(data) });
const updateWorkout = (id, data) => fetch('/api/workouts/' + id, { method: 'PUT', body: JSON.stringify(data) });
// Easy to make typos, wrong methods, wrong payloads
```

### The Problems

1. **URL Strings**: Typos in URLs cause runtime errors (`/api/workotus/` vs `/api/workouts/`)

2. **Method Mismatches**: Using GET when it should be POST causes 405 errors at runtime

3. **No Discoverability**: Developers must read documentation or backend code to know what endpoints exist

4. **Over/Under-fetching**: REST returns fixed shapes. Need user + workouts + PRs? That's 3 requests. Need just user name? Still get entire user object.

5. **Documentation Burden**: OpenAPI/Swagger docs must be manually maintained

### Proposed Implementation (tRPC)

```typescript
// packages/api/src/routers/workout.ts
export const workoutRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      return ctx.db.workouts.findMany({
        where: { userId: ctx.user.id },
        take: input.limit
      });
    }),

  create: protectedProcedure
    .input(CreateWorkoutSchema)
    .mutation(async ({ input, ctx }) => {
      return ctx.db.workouts.create({ data: input });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.workouts.findUnique({ where: { id: input.id } });
    }),
});
```

```typescript
// Frontend - fully typed, autocomplete works
const { data: workouts } = api.workout.list.useQuery({ limit: 10 });
//     ^-- Typed as Workout[]

const createMutation = api.workout.create.useMutation();
createMutation.mutate({ /* autocomplete shows required fields */ });

const { data: workout } = api.workout.byId.useQuery({ id: 'uuid' });
//     ^-- Typed as Workout | null
```

### Why It's Better

| Aspect | REST | tRPC |
|--------|------|------|
| Type Safety | None (strings) | Full (compile-time) |
| Autocomplete | No | Yes (IDE shows all procedures) |
| Documentation | Manual (OpenAPI) | Types ARE documentation |
| Refactoring | Find & replace strings | Compiler-guided |
| Bundle Size | N/A | Tree-shakes unused procedures |
| Learning Curve | Universal | TypeScript-specific |

### Visual Comparison

**REST Workflow:**
```
1. Developer needs to call API
2. Opens documentation or backend code
3. Reads endpoint URL, method, payload structure
4. Writes fetch call with string URL
5. Manually defines TypeScript interface for response
6. Hopes it matches actual response
7. Discovers mismatch in production when user reports bug
```

**tRPC Workflow:**
```
1. Developer needs to call API
2. Types `api.` and sees all available procedures via autocomplete
3. Selects procedure, sees input/output types inline
4. Writes call with full type checking
5. If backend changes, TypeScript error appears immediately
6. Fixes error before code is even committed
```

### Can You Implement Incrementally?

**Partially - but requires TypeScript backend first.**

tRPC is TypeScript-to-TypeScript. It doesn't work with Python. However, you could:

1. **Add GraphQL to Python backend** - Similar benefits to tRPC, works with any backend
2. **Use OpenAPI code generation** - Auto-generate TypeScript types from Python
3. **Build new features with tRPC** - If you add a TypeScript backend layer

### Effort Level: 🔴 Requires TypeScript Backend First

---

## 3. Mobile Navigation: React Navigation vs Expo Router

### Current Implementation (React Navigation)

```typescript
// apps/mobile/src/navigation/RootNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Must manually define all navigation types
type RootStackParamList = {
  Home: undefined;
  WorkoutDetail: { workoutId: string };
  ExerciseLibrary: { category?: string };
  Profile: undefined;
  // ... 30 more screens
};

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Run" component={RunScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'modal' }} />
      {/* 30 more screen definitions */}
    </Stack.Navigator>
  );
}

// Navigation requires importing navigation object
import { useNavigation } from '@react-navigation/native';

function SomeComponent() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Must know exact screen name as string
  navigation.navigate('WorkoutDetail', { workoutId: '123' });
}
```

### The Problems

1. **Manual Type Definitions**: Every screen's params must be manually typed in a central ParamList

2. **String-Based Navigation**: Screen names are strings - typos cause runtime crashes

3. **Centralized Config**: Adding a screen requires modifying navigator AND ParamList

4. **Deep Linking**: Requires manual configuration for each screen

5. **Code Organization**: Navigation logic separated from screen files

### Proposed Implementation (Expo Router)

```
apps/mobile/app/
├── (tabs)/                    # Tab group (automatic tab bar)
│   ├── _layout.tsx           # Tab configuration
│   ├── index.tsx             # Home (/)
│   ├── chat.tsx              # Chat (/chat)
│   └── run.tsx               # Run (/run)
├── workout/
│   ├── [id].tsx              # Dynamic route (/workout/123)
│   └── new.tsx               # Static route (/workout/new)
├── exercise/
│   ├── index.tsx             # /exercise
│   └── [id].tsx              # /exercise/456
├── profile.tsx               # Modal (/profile)
├── _layout.tsx               # Root layout
└── +not-found.tsx            # 404 handler
```

```typescript
// app/(tabs)/_layout.tsx - Tab configuration
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="chat" options={{ title: 'Coach' }} />
      <Tabs.Screen name="run" options={{ title: 'Run' }} />
    </Tabs>
  );
}

// app/workout/[id].tsx - Dynamic route
import { useLocalSearchParams } from 'expo-router';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // id is typed and available automatically
  return <WorkoutView workoutId={id} />;
}

// Navigation from anywhere - just use Link or router
import { Link, router } from 'expo-router';

function SomeComponent() {
  return (
    <>
      {/* Declarative link */}
      <Link href="/workout/123">View Workout</Link>

      {/* Imperative navigation */}
      <Button onPress={() => router.push('/workout/123')}>
        View Workout
      </Button>

      {/* TypeScript error if route doesn't exist! */}
      <Link href="/workotu/123">Typo</Link>  // ❌ Error
    </>
  );
}
```

### Why It's Better

| Aspect | React Navigation | Expo Router |
|--------|-----------------|-------------|
| Route Definition | Centralized config | File = Route |
| Type Safety | Manual ParamList | Automatic from file structure |
| Deep Linking | Manual setup | Automatic |
| Adding Routes | Modify 2+ files | Create 1 file |
| Learning Curve | Complex API | Familiar (Next.js-like) |
| URL-Based | No | Yes (web URLs work) |

### Visual Comparison

**Adding a new screen with React Navigation:**
```
1. Create screen component file
2. Open RootNavigator.tsx
3. Import the screen
4. Add <Stack.Screen> entry
5. Open types file
6. Add screen params to ParamList
7. If modal, configure presentation mode
8. If deep link needed, configure linking config
```

**Adding a new screen with Expo Router:**
```
1. Create file at the right path (e.g., app/settings.tsx)
2. Done. Navigation, types, and deep links all automatic.
```

### Can You Implement Incrementally?

**Yes! This is a file-by-file migration.**

Expo SDK 53 supports gradual migration:

```typescript
// Step 1: Enable Expo Router in app.json
{
  "expo": {
    "experiments": {
      "typedRoutes": true
    }
  }
}

// Step 2: Create app/ directory alongside src/
// Step 3: Move screens one at a time
// Step 4: Use Expo Router's <Stack> to wrap legacy screens temporarily
```

Migration order:
1. Create `app/_layout.tsx` with root Stack
2. Migrate tab screens first (`(tabs)/`)
3. Migrate secondary screens
4. Remove React Navigation dependencies

### Effort Level: 🟡 Medium (2-3 weeks, incremental)

---

## 4. State Management: Zustand vs TanStack Query

### Current Implementation (Zustand for Everything)

```typescript
// apps/mobile/src/store/workout.store.ts
interface WorkoutState {
  workouts: Workout[];
  currentWorkout: Workout | null;
  isLoading: boolean;
  error: string | null;

  fetchWorkouts: () => Promise<void>;
  createWorkout: (data: CreateWorkout) => Promise<void>;
  updateWorkout: (id: string, data: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  workouts: [],
  currentWorkout: null,
  isLoading: false,
  error: null,

  fetchWorkouts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/workouts');
      const data = await response.json();
      set({ workouts: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createWorkout: async (data) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const workout = await response.json();
      set(state => ({
        workouts: [...state.workouts, workout],
        isLoading: false
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  // ... more methods
}));

// Usage in component
function WorkoutList() {
  const { workouts, isLoading, error, fetchWorkouts } = useWorkoutStore();

  useEffect(() => {
    fetchWorkouts();
  }, []);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <List data={workouts} />;
}
```

### The Problems

1. **Manual Loading/Error States**: Every store needs `isLoading`, `error`, and management logic

2. **No Caching**: Data is fetched every time, no smart refetching

3. **No Deduplication**: Multiple components fetching same data = multiple requests

4. **Stale Data**: No automatic background refetch

5. **Manual Invalidation**: After mutation, must manually refetch related data

6. **No Optimistic Updates**: Built-in support missing

7. **Memory Management**: Data stays in memory forever

### Proposed Implementation (TanStack Query + Minimal Zustand)

```typescript
// TanStack Query for SERVER state (data from API)
// apps/mobile/hooks/useWorkouts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/trpc';

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: () => api.workout.list.query(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkout) => api.workout.create.mutate(data),

    // Optimistic update
    onMutate: async (newWorkout) => {
      await queryClient.cancelQueries({ queryKey: ['workouts'] });
      const previous = queryClient.getQueryData(['workouts']);

      queryClient.setQueryData(['workouts'], (old: Workout[]) => [
        ...old,
        { ...newWorkout, id: 'temp-id', createdAt: new Date() }
      ]);

      return { previous };
    },

    // Rollback on error
    onError: (err, newWorkout, context) => {
      queryClient.setQueryData(['workouts'], context?.previous);
    },

    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}

// Usage - SO much cleaner
function WorkoutList() {
  const { data: workouts, isLoading, error } = useWorkouts();
  const createWorkout = useCreateWorkout();

  // Loading, error, caching, refetching - all handled automatically
  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <List
      data={workouts}
      onAdd={(data) => createWorkout.mutate(data)}
    />
  );
}
```

```typescript
// Zustand ONLY for CLIENT state (UI state, not from server)
// apps/mobile/store/ui.store.ts
interface UIState {
  theme: 'light' | 'dark';
  isVoiceModalOpen: boolean;
  activeTab: string;
  setTheme: (theme: 'light' | 'dark') => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  isVoiceModalOpen: false,
  activeTab: 'home',
  setTheme: (theme) => set({ theme }),
  openVoiceModal: () => set({ isVoiceModalOpen: true }),
  closeVoiceModal: () => set({ isVoiceModalOpen: false }),
}));
```

### Why It's Better

| Aspect | Zustand for Everything | TanStack Query + Zustand |
|--------|----------------------|--------------------------|
| Boilerplate | High (loading, error, fetch logic) | Low (declarative) |
| Caching | Manual | Automatic with smart invalidation |
| Deduplication | None | Automatic (same query = one request) |
| Background Refetch | Manual | Automatic (staleTime, refetchOnMount) |
| Optimistic Updates | Manual | Built-in pattern |
| DevTools | Basic | Excellent (React Query Devtools) |
| Memory | Manual cleanup | Automatic garbage collection |

### Visual Comparison

**What happens when two components need the same data:**

Zustand:
```
Component A mounts → fetchWorkouts() → API request
Component B mounts → fetchWorkouts() → API request (duplicate!)
```

TanStack Query:
```
Component A mounts → useQuery(['workouts']) → API request
Component B mounts → useQuery(['workouts']) → Returns cached data instantly
```

### Can You Implement Incrementally?

**Yes! This is perfect for incremental adoption.**

```typescript
// Step 1: Install TanStack Query
npm install @tanstack/react-query

// Step 2: Wrap app with QueryClientProvider
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}

// Step 3: Migrate one store at a time
// Create useWorkouts() hook, then remove workout.store.ts methods one by one
// Keep Zustand for auth, UI state - remove server state methods
```

Migration order:
1. Add QueryClientProvider
2. Migrate read operations first (useQuery)
3. Migrate write operations (useMutation)
4. Remove server state from Zustand stores
5. Keep only UI state in Zustand

### Effort Level: 🟢 Low (1-2 weeks, fully incremental)

---

## 5. Offline Strategy: WatermelonDB vs SQLite Queue

### Current Implementation (WatermelonDB)

```typescript
// apps/mobile/src/services/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 11,
  tables: [
    tableSchema({
      name: 'workout_logs',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'reps', type: 'number' },
        { name: 'weight', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    // ... 12 more table schemas
  ],
});

// Model class required for each table
import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

class WorkoutLog extends Model {
  static table = 'workout_logs';

  @field('user_id') userId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('reps') reps!: number;
  @field('weight') weight?: number;
  @field('synced') synced!: boolean;
  @readonly @date('created_at') createdAt!: Date;
}

// Sync service is complex
// apps/mobile/src/services/sync/SyncService.ts (400+ lines)
class SyncService {
  async syncToCloud() {
    // Get all unsynced records
    const unsyncedLogs = await database
      .get<WorkoutLog>('workout_logs')
      .query(Q.where('synced', false))
      .fetch();

    for (const log of unsyncedLogs) {
      try {
        // Push to Supabase
        await supabase.from('workout_logs').insert({
          id: log.id,
          user_id: log.userId,
          exercise_id: log.exerciseId,
          reps: log.reps,
          weight: log.weight,
        });

        // Mark as synced
        await database.write(async () => {
          await log.update(record => {
            record.synced = true;
          });
        });
      } catch (error) {
        // Complex conflict resolution...
      }
    }
  }

  async pullFromCloud() {
    // Fetch remote changes since last sync
    // Merge with local changes
    // Handle conflicts...
    // 200+ lines of sync logic
  }
}
```

### The Problems

1. **Complexity**: WatermelonDB requires schema definitions, model classes, decorators, and observables

2. **Dual Source of Truth**: Local DB and remote DB must stay in sync - conflict resolution is hard

3. **Schema Migration**: Local schema changes require migration logic

4. **Learning Curve**: Decorators, observables, and reactive queries are unfamiliar patterns

5. **Bundle Size**: WatermelonDB is ~200KB+ additional

6. **Real Sync Issues**: Current implementation has bugs (identified in audit)

### Proposed Implementation (SQLite Queue)

```typescript
// Much simpler: Queue actions when offline, replay when online
// packages/shared/src/offline/ActionQueue.ts
import * as SQLite from 'expo-sqlite';

// Simple action types
type QueuedAction =
  | { type: 'workout.log'; payload: CreateWorkoutLog }
  | { type: 'voice.parse'; payload: { text: string } }
  | { type: 'readiness.submit'; payload: ReadinessScore };

class ActionQueue {
  private db: SQLite.SQLiteDatabase;

  constructor() {
    this.db = SQLite.openDatabaseSync('action-queue.db');
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER DEFAULT 0
      );
    `);
  }

  // Enqueue an action when offline
  enqueue(action: QueuedAction): string {
    const id = crypto.randomUUID();
    this.db.runSync(
      'INSERT INTO queue (id, action, created_at) VALUES (?, ?, ?)',
      [id, JSON.stringify(action), Date.now()]
    );
    return id;
  }

  // Get pending actions
  getPending(): Array<{ id: string; action: QueuedAction }> {
    const rows = this.db.getAllSync('SELECT * FROM queue ORDER BY created_at');
    return rows.map(row => ({
      id: row.id,
      action: JSON.parse(row.action),
    }));
  }

  // Remove completed action
  complete(id: string): void {
    this.db.runSync('DELETE FROM queue WHERE id = ?', [id]);
  }

  // Increment attempt count on failure
  recordAttempt(id: string): void {
    this.db.runSync('UPDATE queue SET attempts = attempts + 1 WHERE id = ?', [id]);
  }
}

// Usage with TanStack Query
// apps/mobile/hooks/useOfflineWorkout.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetInfo } from '@react-native-community/netinfo';

export function useLogWorkout() {
  const netInfo = useNetInfo();
  const queryClient = useQueryClient();
  const queue = useActionQueue();

  return useMutation({
    mutationFn: async (data: CreateWorkoutLog) => {
      if (netInfo.isConnected) {
        // Online: send directly
        return api.workout.log.mutate(data);
      } else {
        // Offline: queue for later
        const id = queue.enqueue({ type: 'workout.log', payload: data });
        return { ...data, id, _queued: true };
      }
    },

    onSuccess: (result) => {
      // Optimistically update cache either way
      queryClient.setQueryData(['workouts'], (old: Workout[]) => [
        ...old,
        result,
      ]);
    },
  });
}

// Background sync when online
// apps/mobile/providers/SyncProvider.tsx
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const netInfo = useNetInfo();
  const queue = useActionQueue();

  useEffect(() => {
    if (!netInfo.isConnected) return;

    // Process queue when back online
    const processQueue = async () => {
      const pending = queue.getPending();

      for (const { id, action } of pending) {
        try {
          switch (action.type) {
            case 'workout.log':
              await api.workout.log.mutate(action.payload);
              break;
            case 'voice.parse':
              await api.voice.parse.mutate(action.payload);
              break;
            // ... other action types
          }
          queue.complete(id);
        } catch (error) {
          queue.recordAttempt(id);
          // Could add exponential backoff
        }
      }
    };

    processQueue();
  }, [netInfo.isConnected]);

  return <>{children}</>;
}
```

### Why It's Better

| Aspect | WatermelonDB | SQLite Queue |
|--------|--------------|--------------|
| Complexity | High (schema, models, observables) | Low (simple queue) |
| Bundle Size | ~200KB | ~20KB (expo-sqlite built-in) |
| Conflict Resolution | Must handle (complex) | Server wins (simple) |
| Schema Migrations | Required | None (just actions) |
| Learning Curve | Steep | Minimal |
| Read While Offline | Yes (local queries) | No (cache only) |

### Trade-off: Offline Reads

WatermelonDB allows offline reads from local database. The queue approach relies on TanStack Query's cache.

**For VoiceFit, this is acceptable because:**
- Users primarily LOG workouts offline (writes)
- Reading historical data can wait for connectivity
- TanStack Query cache provides recent data anyway

**If offline reads are critical:**
- Keep WatermelonDB, but simplify sync logic
- Or use SQLite for reads too, with simpler schema

### Can You Implement Incrementally?

**Partially - for new features, fully incremental.**

1. New features can use the queue approach immediately
2. Existing WatermelonDB can coexist
3. Gradually migrate tables as needed

```typescript
// Hybrid approach during migration
if (feature.useNewOffline) {
  // New queue-based approach
  queue.enqueue({ type: 'workout.log', payload: data });
} else {
  // Legacy WatermelonDB
  await database.write(() => workoutLogs.create(...));
}
```

### Effort Level: 🟡 Medium (3-4 weeks if replacing WatermelonDB)

---

## 6. Auth Storage: localStorage vs SecureStore

### Current Implementation (localStorage)

```typescript
// apps/mobile/src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: async (email, password) => { /* ... */ },
      signOut: async () => { /* ... */ },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage), // ❌ PROBLEM!
    }
  )
);
```

### The Problems

1. **localStorage doesn't exist in React Native**: This will crash or silently fail on actual mobile devices

2. **Tests use polyfills**: Jest tests mock localStorage, so tests pass but production fails

3. **Not secure**: Even if it worked, localStorage is not encrypted

4. **Session tokens exposed**: Anyone with device access can read tokens

### Proposed Implementation (SecureStore)

```typescript
// apps/mobile/src/lib/storage.ts
import * as SecureStore from 'expo-secure-store';

// Adapter that works with Zustand persist
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

// apps/mobile/src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '@/lib/storage';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: async (email, password) => { /* ... */ },
      signOut: async () => { /* ... */ },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage), // ✅ FIXED!
    }
  )
);
```

### Why It's Better

| Aspect | localStorage | SecureStore |
|--------|-------------|-------------|
| React Native Support | No (crashes) | Yes |
| Encryption | No | Yes (Keychain/Keystore) |
| Security | None | Hardware-backed |
| Effort to Fix | 5 minutes | N/A |

### Can You Implement Incrementally?

**Yes! This is a 5-minute fix.**

```typescript
// 1. Install (already in package.json via expo)
// expo-secure-store is included with Expo

// 2. Change one line in auth.store.ts
- storage: createJSONStorage(() => localStorage),
+ storage: createJSONStorage(() => secureStorage),

// 3. Create the secureStorage adapter (10 lines of code)
```

### Effort Level: 🟢 Trivial (30 minutes)

---

## 7. AI Providers: Multiple vs Single

### Current Implementation (3 Providers)

```python
# apps/backend/ uses multiple AI providers

# Grok 4 (xAI) - AI Coach, Program Generation
# File: ai_coach_service.py, program_generation_service.py
from openai import OpenAI
xai_client = OpenAI(base_url="https://api.x.ai/v1", api_key=XAI_API_KEY)
response = xai_client.chat.completions.create(
    model="grok-4-fast-reasoning",
    messages=[...]
)

# Kimi K2 (Moonshot) - Voice Parsing
# File: integrated_voice_parser.py
kimi_client = OpenAI(base_url="https://api.moonshot.ai/v1", api_key=KIMI_API_KEY)
response = kimi_client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[...]
)

# OpenAI - Embeddings (legacy)
# File: exercise_matching_service.py
openai_client = OpenAI(api_key=OPENAI_API_KEY)
response = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=text
)
```

### The Problems

1. **Multiple API Keys**: 3 different keys to manage, rotate, monitor

2. **Different Response Formats**: Subtle differences in how each API returns data

3. **Different Error Handling**: Each provider has different error codes and retry logic

4. **Cost Tracking**: Harder to track total AI spend across providers

5. **Vendor Risk**: Each provider is a dependency that could change/fail

### Proposed Implementation (Unified Provider)

```typescript
// packages/api/src/services/ai/index.ts
import { xai } from '@ai-sdk/xai';
import { generateText, streamText, embed } from 'ai';

// Vercel AI SDK provides unified interface
const model = xai('grok-4-fast');
const embeddingModel = xai('grok-embedding'); // If available, or use Upstash

export const aiService = {
  // Voice parsing - same quality, one provider
  async parseVoice(text: string, context?: SessionContext) {
    const { text: result } = await generateText({
      model,
      system: VOICE_PARSE_SYSTEM_PROMPT,
      prompt: `Parse: "${text}"`,
    });
    return VoiceParseSchema.parse(JSON.parse(result));
  },

  // AI Coach - streaming for better UX
  async *streamCoachResponse(question: string, ragContext: string) {
    const stream = await streamText({
      model,
      system: COACH_SYSTEM_PROMPT + ragContext,
      prompt: question,
    });
    for await (const chunk of stream.textStream) {
      yield chunk;
    }
  },

  // Program generation
  async generateProgram(params: ProgramParams, ragContext: string) {
    const { text: result } = await generateText({
      model,
      system: PROGRAM_SYSTEM_PROMPT + ragContext,
      prompt: JSON.stringify(params),
    });
    return ProgramSchema.parse(JSON.parse(result));
  },

  // Embeddings - use Upstash for this (free tier available)
  async embed(text: string) {
    // Upstash Vector handles embeddings internally
    return upstashVector.embed(text);
  },
};
```

### Why It's Better

| Aspect | Multiple Providers | Single Provider |
|--------|-------------------|-----------------|
| API Keys | 3 | 1 |
| Error Handling | 3 different patterns | 1 pattern |
| Cost Tracking | Fragmented | Unified |
| Switching Providers | Change everywhere | Change once |
| Testing | Mock 3 APIs | Mock 1 API |

### Can You Implement Incrementally?

**Yes! Migrate one use case at a time.**

```python
# Step 1: Keep existing code, add feature flag
USE_GROK_FOR_VOICE = os.getenv("USE_GROK_FOR_VOICE", "false") == "true"

async def parse_voice(text: str):
    if USE_GROK_FOR_VOICE:
        return await grok_parse_voice(text)  # New implementation
    else:
        return await kimi_parse_voice(text)  # Existing implementation

# Step 2: Test in production with flag off
# Step 3: Enable flag, monitor quality
# Step 4: Remove old code when confident
```

Migration order:
1. Create unified AI service abstraction
2. Migrate embeddings to Upstash (already using it)
3. Test Grok for voice parsing (compare quality to Kimi)
4. If quality matches, remove Kimi dependency
5. Remove OpenAI dependency

### Effort Level: 🟢 Low (1 week, incremental)

---

## 8. Web Apps: Separate vs Unified

### Current Implementation (3 Separate Apps)

```
apps/
├── web/                    # Marketing + User features
│   ├── package.json        # Next.js 14, own dependencies
│   ├── src/components/     # AIChat, Calendar, Analytics...
│   └── next.config.js
│
├── web-dashboard/          # Coach dashboard
│   ├── package.json        # Next.js 14, own dependencies
│   ├── src/components/     # CSVImport, ClientList...
│   └── next.config.js
│
└── mobile/                 # React Native
```

### The Problems

1. **Duplicate Dependencies**: Both apps have React, Next.js, Tailwind, Supabase client

2. **Duplicate Components**: Button, Card, Input defined in both places

3. **Different Ports**: Web on 3000, Dashboard on 3001 - CORS complexity

4. **Separate Deployments**: Two Vercel projects to manage

5. **Inconsistent UI**: Components evolve separately, diverge over time

6. **Shared Logic Duplication**: Auth, API clients, types copied between apps

### Proposed Implementation (Unified Next.js App)

```
apps/
├── web/                        # Single Next.js app
│   ├── app/
│   │   ├── (marketing)/       # Public pages (no auth)
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── pricing/
│   │   │   └── about/
│   │   │
│   │   ├── (dashboard)/       # User dashboard (auth required)
│   │   │   ├── layout.tsx     # Dashboard layout with nav
│   │   │   ├── page.tsx       # User home
│   │   │   ├── workouts/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   │
│   │   ├── (coach)/           # Coach portal (coach role required)
│   │   │   ├── layout.tsx     # Coach layout
│   │   │   ├── page.tsx       # Coach home
│   │   │   ├── clients/
│   │   │   ├── programs/
│   │   │   └── import/
│   │   │
│   │   ├── api/               # API routes (including tRPC)
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/            # All components in one place
│   │   ├── ui/                # Primitives (Button, Card)
│   │   ├── dashboard/         # Dashboard-specific
│   │   └── coach/             # Coach-specific
│   │
│   └── package.json           # Single set of dependencies
│
└── mobile/                    # React Native (separate)
```

```typescript
// Route groups provide different layouts without URL prefix
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <RequireAuth>
      <DashboardNav />
      <main>{children}</main>
    </RequireAuth>
  );
}

// app/(coach)/layout.tsx
export default function CoachLayout({ children }) {
  return (
    <RequireAuth requiredRole="coach">
      <CoachNav />
      <main>{children}</main>
    </RequireAuth>
  );
}

// Shared components used everywhere
// components/ui/Button.tsx - ONE definition
// components/ui/Card.tsx - ONE definition
```

### Why It's Better

| Aspect | Separate Apps | Unified App |
|--------|--------------|-------------|
| Dependencies | Duplicated | Shared |
| Components | Duplicated | Single source |
| Deployments | 2 | 1 |
| Bundle Size | Larger total | Smaller (shared code) |
| Consistency | Drift over time | Always consistent |
| Routing | Separate domains/ports | Single domain, route groups |

### Can You Implement Incrementally?

**Yes, but it's a significant effort.**

```
Step 1: Create unified app structure
Step 2: Move shared components to packages/ui
Step 3: Move web pages to apps/web/(marketing)
Step 4: Move dashboard pages to apps/web/(coach)
Step 5: Update deployment to single app
Step 6: Delete apps/web-dashboard
```

**Alternative: Keep separate for now**
- Create `packages/ui` for shared components
- Both apps import from shared package
- Less risk, still reduces duplication

### Effort Level: 🟡 Medium (2-3 weeks for full merge) or 🟢 Low (1 week for shared package only)

---

## 9. Summary: What to Do

### Immediate Fixes (This Week) - No Rewrite Needed

| Change | Effort | Impact | Risk |
|--------|--------|--------|------|
| Fix localStorage → SecureStore | 30 min | Critical bug fix | Zero |
| Fix REQUIRE_AUTH default | 5 min | Security fix | Zero |
| Add missing API endpoints | 1 day | Fix broken features | Low |
| Add TanStack Query | 2-3 days | Better data management | Low |

### Short-Term Improvements (1-2 Sprints) - Incremental

| Change | Effort | Impact | Risk |
|--------|--------|--------|------|
| Migrate to Expo Router | 2-3 weeks | Better DX, simpler code | Medium |
| Consolidate AI providers | 1 week | Cost savings, simplicity | Low |
| Create shared UI package | 1 week | Code reuse | Low |
| Add OpenAPI codegen | 1 week | Type safety | Low |

### Requires Rewrite (Future Major Version)

| Change | Effort | Impact | Risk |
|--------|--------|--------|------|
| TypeScript backend | 8-12 weeks | Full type safety | High |
| tRPC API | 4-6 weeks (after TS backend) | Automatic types | Medium |
| Replace WatermelonDB | 3-4 weeks | Simpler offline | Medium |
| Merge web apps | 2-3 weeks | Single deployment | Medium |

### Recommended Priority Order

```
Phase 1: Critical Fixes (Week 1)
├── Fix SecureStore (30 min)
├── Fix REQUIRE_AUTH (5 min)
├── Add missing endpoints (1 day)
└── Connect OAuth UI to store (1 day)

Phase 2: Quick Wins (Weeks 2-4)
├── Add TanStack Query (incremental)
├── Consolidate AI to Grok (with feature flags)
└── Create packages/ui for shared components

Phase 3: Navigation Upgrade (Weeks 5-7)
└── Migrate to Expo Router (incremental, file by file)

Phase 4: Future Consideration
├── Evaluate TypeScript backend for v2
├── Consider tRPC if doing TS backend
└── Consider WatermelonDB replacement
```

### Decision Matrix

| If you need... | Do this... |
|----------------|------------|
| Fix production bugs NOW | SecureStore + REQUIRE_AUTH + missing endpoints |
| Better developer experience | TanStack Query + Expo Router |
| Long-term maintainability | TypeScript backend + tRPC (major version) |
| Cost savings | Consolidate AI providers |
| Faster feature development | All of the above, in order |

---

## Final Recommendation

**Don't rewrite. Iterate.**

1. Fix the critical bugs (localStorage, auth default) - they're causing real problems
2. Add TanStack Query - it works alongside existing code
3. Migrate to Expo Router gradually - one screen at a time
4. Consolidate AI providers with feature flags - test in production safely
5. Save TypeScript backend for v2.0 - when you have time for a major release

The current architecture works. Make it work better before making it different.
