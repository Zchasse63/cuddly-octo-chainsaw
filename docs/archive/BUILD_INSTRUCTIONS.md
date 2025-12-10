# VoiceFit 2.0 Build Instructions

**For:** Claude Code / AI Assistant
**Project:** VoiceFit - Voice-first fitness tracking app
**Start Date:** [Insert date]

---

## Project Overview

You are building VoiceFit 2.0, a complete rebuild of a voice-first fitness tracking application. This is a **greenfield build** - start fresh with no legacy code. All features, UI specifications, and AI prompts are documented in this repository.

### Core Value Proposition
VoiceFit lets users log workouts hands-free using voice commands. Say "bench press 225 for 8" and it's logged. The app includes AI coaching, personalized program generation, running tracking, wearable integration, and a coach platform.

### Target Platforms
- **Mobile:** iOS and Android (React Native/Expo)
- **Web:** Single unified web app (Next.js)
- **Backend:** TypeScript/Node.js with tRPC

---

## Reference Documents

Read these documents in order before starting any work:

| Document | Purpose | Read First |
|----------|---------|------------|
| `docs/COMPLETE_REBUILD_PLAN.md` | Master feature list, phases, timelines | ✅ Yes |
| `docs/UI_SPECIFICATION.md` | Design system, colors, components | ✅ Yes |
| `docs/AI_PROMPTS_REFERENCE.md` | All AI service prompts | When building AI features |
| `docs/ARCHITECTURE_DEEP_DIVE.md` | Architecture decisions explained | For context |

---

## Technology Stack (Required)

Use these exact technologies. Do not substitute without explicit approval:

### Backend
```
- Runtime: Node.js 20+ with TypeScript
- API Layer: tRPC v11 (NOT REST)
- Database: PostgreSQL via Supabase
- ORM: Drizzle ORM (NOT Prisma)
- Auth: Supabase Auth with JWT
- File Storage: Supabase Storage
- Vector Search: Upstash Vector
- Cache: Upstash Redis
```

### Mobile App
```
- Framework: Expo SDK 53+ with Expo Router
- Navigation: Expo Router (file-based, NOT React Navigation)
- State: TanStack Query (server) + Zustand (UI only)
- Styling: NativeWind v4 (Tailwind for RN)
- Animations: React Native Reanimated
- Secure Storage: expo-secure-store (NOT AsyncStorage for tokens)
- Offline: WatermelonDB
- Icons: Lucide React Native
```

### Web App
```
- Framework: Next.js 14+ with App Router
- Styling: Tailwind CSS
- State: TanStack Query + Zustand
- API: tRPC client
```

### AI Services
```
- Primary Model: Grok 4 (xAI) - coaching, voice parsing, programs, health analysis
- RAG: Upstash Vector for knowledge retrieval
```

---

## Build Phases

Follow these phases in order. Do not skip ahead.

### Phase 0: Foundation (Weeks 1-4)

**Goal:** Working app shell with auth and database

**Tasks:**
1. Initialize Expo project with Expo Router
2. Set up tRPC backend with Drizzle ORM
3. Create Supabase project, configure auth
4. Implement secure authentication flow:
   - Email/password signup and login
   - Apple Sign-In and Google Sign-In
   - JWT token storage in SecureStore (CRITICAL: not AsyncStorage)
   - Auth state persistence
5. Build database schema (see COMPLETE_REBUILD_PLAN.md Section 5)
6. Create base UI components from UI_SPECIFICATION.md:
   - Button, Card, Input, PillBadge
   - LoadingSpinner, Toast, ErrorMessage
   - ThemeProvider with light/dark mode
7. Set up tab navigation with GlassTabBar
8. Implement basic profile screen

**Deliverable:** User can sign up, log in, see empty dashboard, toggle theme

**Critical Requirements:**
- Auth tokens MUST use SecureStore, not AsyncStorage
- All API calls through tRPC, no raw fetch
- Theme follows UI_SPECIFICATION.md exactly

---

### Phase 1: Voice Logging (Weeks 5-10)

**Goal:** Core workout logging with voice commands

**Tasks:**
1. Implement voice recording with expo-av
2. Integrate Whisper API for speech-to-text
3. Build voice parser service (see AI_PROMPTS_REFERENCE.md #3)
4. Create exercise database:
   - Seed 452 exercises from current data
   - Implement fuzzy search + semantic matching
5. Build workout logging screens:
   - Active workout view with voice button
   - Manual set entry fallback
   - Rest timer with notifications
6. Implement session state management:
   - Track current exercise
   - Remember last weight for "same weight" commands
   - PR detection and celebration
7. Build workout history and detail views
8. Implement offline support with WatermelonDB sync

**Deliverable:** User can start workout, log sets by voice, see history

**Voice Parser Requirements:**
- Confidence threshold: 0.85 (high), 0.70 (low - show confirmation)
- Support phrases: "185 for 8", "same weight for 10", "bench 225 5 reps RPE 8"
- Session context: know current exercise, last weight used

---

### Phase 2: AI Coaching (Weeks 11-16)

**Goal:** AI Coach chat and program generation

**Tasks:**
1. Build chat interface (see UI_SPECIFICATION.md chat components)
2. Implement chat classifier (AI_PROMPTS_REFERENCE.md #2)
3. Build AI Coach service with RAG:
   - Integrate Upstash Vector
   - Implement smart namespace selection
   - Stream responses to UI
4. Create conversational onboarding flow:
   - 6-step flow (welcome → experience → goals → equipment → frequency → injuries)
   - Use Personality Engine for natural responses
5. Build program generation:
   - 12-week periodized programs
   - JSON output parsed into database
   - Program display with day/week navigation
6. Implement exercise swap feature:
   - AI-ranked substitutes
   - Equipment and injury filtering

**Deliverable:** User can chat with AI, complete onboarding, receive personalized program

**AI Requirements:**
- Grok 4 for coaching (temperature 0.7)
- Classification at temperature 0.3
- Cache general queries for 24 hours

---

### Phase 3: Running (Weeks 17-20)

**Goal:** GPS-based running with badges

**Tasks:**
1. Implement GPS tracking with expo-location
2. Build run active screen:
   - Live map view
   - Pace, distance, time display
   - Split tracking
3. Create running workout types:
   - Easy run, tempo, intervals, long run
4. Build pace coaching:
   - Target pace display
   - Audio cues for pace deviation
5. Implement running badges:
   - Distance milestones
   - Streak badges
   - PR badges
6. Add Apple Watch / Wear OS companion (native modules needed)

**Deliverable:** User can track runs with GPS, earn badges, see pace trends

---

### Phase 4: Wearables (Weeks 21-28)

**Goal:** Health data integration

**Tasks:**
1. Integrate WHOOP API (OAuth flow)
2. Integrate Terra API for other wearables
3. Build health metrics dashboard:
   - HRV, resting HR, sleep score
   - Recovery score display
4. Create readiness check-in flow
5. Implement injury detection (AI_PROMPTS_REFERENCE.md #7)
6. Build health insights (AI_PROMPTS_REFERENCE.md #8)

**Deliverable:** User sees wearable data, gets health insights, injury detection

---

### Phase 5: Coach Platform (Weeks 29-34)

**Goal:** Web dashboard for coaches

**Tasks:**
1. Build Next.js coach dashboard
2. Implement coach-client relationship system
3. Create program assignment flow
4. Build CSV import for programs
5. Add client progress monitoring
6. Implement messaging system

**Deliverable:** Coaches can manage clients, assign programs, monitor progress

---

### Phase 6: Advanced Features (Weeks 35-44)

**Goal:** Calendar, multi-sport, social

**Tasks:**
1. Calendar integration (Apple/Google)
2. Multi-sport support (cycling, swimming)
3. Community features
4. Achievement system expansion
5. Export functionality

---

### Phase 7: Health Intelligence (Weeks 45-60)

**Goal:** Advanced AI health correlations

**Tasks:**
1. Correlation discovery engine
2. Pattern recognition
3. Predictive analytics
4. Natural language insights

**Reference:** See `Zed/AI_HEALTH_INTELLIGENCE_ENGINE.md` for detailed specs

---

## Code Standards

### File Structure
```
/apps
  /mobile          # Expo app
    /app           # Expo Router pages
    /src
      /components  # Reusable components
      /hooks       # Custom hooks
      /services    # API services
      /stores      # Zustand stores
      /theme       # Design tokens
      /types       # TypeScript types
      /utils       # Utilities
  /web             # Next.js app
  /backend         # tRPC backend
    /src
      /routers     # tRPC routers
      /services    # Business logic
      /db          # Drizzle schemas
      /ai          # AI service integrations
/packages
  /shared          # Shared types/utils
```

### Naming Conventions
- Components: PascalCase (`WorkoutCard.tsx`)
- Hooks: camelCase with `use` prefix (`useWorkout.ts`)
- Services: camelCase (`workoutService.ts`)
- Types: PascalCase (`Workout`, `Exercise`)
- Database tables: snake_case (`workout_sets`)
- API routes: camelCase (`workout.create`)

### Component Guidelines
1. All components must support light/dark theme via `useTheme()`
2. Use design tokens from `tokens.ts`, never hardcode colors
3. Use Reanimated for animations, follow spring configs in UI_SPECIFICATION.md
4. Include haptic feedback on interactive elements (see haptics section)
5. Support loading and error states
6. Add accessibility labels

### Type Safety
- Enable strict TypeScript everywhere
- No `any` types without explicit justification
- Use Zod for runtime validation
- tRPC provides end-to-end type safety - leverage it

---

## Testing Requirements

For each phase:
1. Unit tests for services and utilities
2. Component tests for UI components
3. Integration tests for API routes
4. E2E tests for critical flows (auth, workout logging, voice)

---

## What You Cannot Do (Developer Handoff)

These tasks require human developers with access to actual devices and services:

1. **Running the app** - You can write code but cannot execute React Native
2. **Native modules** - Apple Watch, HealthKit, Google Fit require native development
3. **API key configuration** - Store secrets securely in environment
4. **Visual QA** - Screenshots needed to verify UI matches spec
5. **Real API testing** - Actual Supabase and xAI API calls
6. **App Store deployment** - Requires Apple/Google developer accounts
7. **OAuth setup** - Apple/Google Sign-In requires console configuration

---

## Getting Started

When beginning work, follow this sequence:

1. **Read** `COMPLETE_REBUILD_PLAN.md` completely
2. **Read** `UI_SPECIFICATION.md` design system
3. **Create** initial project structure with Expo and tRPC
4. **Implement** Phase 0 foundation
5. **Commit** frequently with descriptive messages
6. **Document** any deviations or decisions made

### First Session Prompt
```
Read all documents in the docs/ folder. Then start Phase 0: Foundation.
Create the Expo project with Expo Router, set up tRPC backend with
Drizzle ORM, and implement secure authentication. Follow the tech
stack exactly as specified in the build instructions.
```

---

## Questions to Ask Before Building

If any of these are unclear, ask before proceeding:

1. Supabase project URL and keys?
2. AI API keys (xAI/Grok)?
3. Any features to prioritize or skip?
4. Target MVP date?
5. Team structure for handoff?

---

## Success Criteria

The rebuild is successful when:

- [ ] All Phase 0-2 features work (auth, voice logging, AI coach)
- [ ] UI matches UI_SPECIFICATION.md exactly
- [ ] All AI prompts produce expected outputs
- [ ] Offline mode works for workout logging
- [ ] Performance: <100ms voice parsing, <2s program generation
- [ ] Code is clean, typed, and documented
- [ ] Tests pass for critical paths

---

*Last updated: 2025-01-25*
*Generated from VoiceFit codebase analysis*
