# VoiceFit Complete Rebuild Plan

**Date:** 2025-01-25
**Purpose:** Complete feature inventory and phased rebuild plan for VoiceFit 2.0
**Status:** Planning Phase
**Approach:** Greenfield rebuild with TypeScript stack

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Decision](#architecture-decision)
3. [Complete Feature Registry](#complete-feature-registry)
4. [Phase 0: Foundation](#phase-0-foundation-weeks-1-4)
5. [Phase 1: Core Voice Logging](#phase-1-core-voice-logging-weeks-5-10)
6. [Phase 2: AI Coaching & Programs](#phase-2-ai-coaching--programs-weeks-11-16)
7. [Phase 3: Running & GPS](#phase-3-running--gps-weeks-17-20)
8. [Phase 4: Wearable Integration](#phase-4-wearable-integration-weeks-21-28)
9. [Phase 5: Coach Platform](#phase-5-coach-platform-weeks-29-34)
10. [Phase 6: Advanced Features](#phase-6-advanced-features-weeks-35-44)
11. [Phase 7: AI Health Intelligence](#phase-7-ai-health-intelligence-weeks-45-60)
12. [Future Phases](#future-phases-beyond-week-60)
13. [Migration Checklist](#migration-checklist)
14. [Risk Assessment](#risk-assessment)

---

## Executive Summary

This document provides a complete rebuild plan for VoiceFit, ensuring **every single feature** from the current codebase is accounted for and rebuilt using a modern TypeScript-first architecture.

### Current State Summary
- **129 API endpoints** in FastAPI/Python backend
- **45+ database tables** in Supabase
- **30+ mobile screens** in React Native/Expo
- **50+ Python services** (40,000+ lines)
- **3 AI providers** (Grok 4, Kimi K2, OpenAI)
- **11 external integrations** (WHOOP, Terra, Supabase, etc.)

### Target State
- **TypeScript/Node.js backend** with tRPC
- **Single AI provider** (Grok 4) with Upstash Vector
- **Expo Router** for navigation
- **TanStack Query + Zustand** for state
- **SecureStore** for auth (not localStorage)
- **Unified web app** (merge web + dashboard)

---

## Architecture Decision

### New Tech Stack

| Layer | Current | New |
|-------|---------|-----|
| **Backend Language** | Python/FastAPI | TypeScript/Node.js |
| **API Style** | REST (129 endpoints) | tRPC (type-safe RPC) |
| **Database** | Supabase + SQLAlchemy | Supabase + Drizzle ORM |
| **Mobile Navigation** | React Navigation | Expo Router |
| **Server State** | Zustand + manual fetching | TanStack Query |
| **Client State** | Zustand (everything) | Zustand (UI only) |
| **Offline Storage** | WatermelonDB | Expo SQLite Queue |
| **Auth Storage** | localStorage (broken) | SecureStore |
| **AI Providers** | Grok 4 + Kimi K2 + OpenAI | Grok 4 only |
| **Vector Search** | Upstash Search | Upstash Vector |
| **Web Apps** | 2 separate Next.js apps | 1 unified Next.js app |

### Why TypeScript Backend?

1. **Full-stack type safety** - Types flow from DB → API → Frontend
2. **Single language** - One team can work on everything
3. **tRPC** - Zero codegen, automatic type inference
4. **Faster development** - No context switching between Python and TypeScript
5. **Better tooling** - ESLint, Prettier, TypeScript compiler

---

## Complete Feature Registry

### Legend
- ✅ **Must Have** - Core functionality, rebuild in Phase 1-3
- ⚡ **Important** - Key differentiator, rebuild in Phase 4-5
- 🔮 **Future** - From roadmap docs, build in Phase 6+

---

### A. Voice & Workout Logging (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Voice command parsing (Kimi K2) | ✅ Must Have | 1 | Move to Grok 4 |
| Voice session management | ✅ Must Have | 1 | Tracks current exercise, last weight |
| "Same weight" detection | ✅ Must Have | 1 | References previous set |
| Exercise matching (fuzzy + semantic) | ✅ Must Have | 1 | 452 exercises in DB |
| Auto-save high confidence sets | ✅ Must Have | 1 | Threshold: 0.85 |
| PR detection & celebration | ✅ Must Have | 1 | Epley formula |
| Workout builder UI | ✅ Must Have | 1 | Drag-drop segments |
| Quick log bar | ✅ Must Have | 1 | Weight, reps, RPE inputs |
| Set logging with metadata | ✅ Must Have | 1 | Tracks logging method |
| Active workout tracking | ✅ Must Have | 1 | Start/complete/cancel |
| Workout completion flow | ✅ Must Have | 1 | Save to DB, sync |
| Rest timers | ✅ Must Have | 1 | 90s default, configurable |
| Live Activity (iOS) | ⚡ Important | 3 | Dynamic Island |
| Voice FAB with pulse animation | ✅ Must Have | 1 | Reanimated 3 |

---

### B. AI Coaching & Programs (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| AI Coach chat interface | ✅ Must Have | 2 | Streaming responses |
| RAG with 41 namespaces | ✅ Must Have | 2 | Upstash Search |
| Smart namespace selection | ✅ Must Have | 2 | 1-3 vs all namespaces |
| Personality engine (tone profiles) | ✅ Must Have | 2 | Beginner/intermediate/advanced |
| Off-topic handling | ✅ Must Have | 2 | Humorous redirects |
| 12-week program generation | ✅ Must Have | 2 | Grok 4 + RAG |
| Periodization (phases) | ✅ Must Have | 2 | Hypertrophy → Strength → Peak |
| Program with warm-up/cooldown | ✅ Must Have | 2 | Auto-included |
| Exercise substitution service | ✅ Must Have | 2 | Injury-aware swaps |
| AI re-ranking for swaps | ✅ Must Have | 2 | Context-aware |
| Chat message classification | ✅ Must Have | 2 | Route to appropriate handler |
| Onboarding extraction | ✅ Must Have | 2 | Parse preferences from chat |
| Exercise explanation service | ✅ Must Have | 2 | Form cues, common mistakes |
| Post-workout insights | ⚡ Important | 2 | Muscle group analysis |

---

### C. Running & GPS (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| GPS tracking | ✅ Must Have | 3 | expo-location |
| Real-time distance/pace/calories | ✅ Must Have | 3 | Haversine formula |
| Lap/split tracking | ✅ Must Have | 3 | Manual lap marks |
| Auto-pause | ✅ Must Have | 3 | Speed threshold |
| Countdown start | ✅ Must Have | 3 | 3/5/10 seconds |
| Route polyline on map | ✅ Must Have | 3 | react-native-maps |
| Elevation gain/loss | ✅ Must Have | 3 | From GPS data |
| Grade-adjusted pace (GAP) | ✅ Must Have | 3 | Terrain difficulty |
| Run summary screen | ✅ Must Have | 3 | Map replay, splits |
| Shoe tracking | ⚡ Important | 3 | Mileage, replacement alerts |
| Running pace coach | ⚡ Important | 3 | Target pace guidance |
| Interval workout support | ⚡ Important | 3 | Warmup/work/recovery segments |
| Saved workout templates | ✅ Must Have | 3 | Reusable run workouts |

---

### D. Injury Detection & Recovery (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Injury detection from notes | ✅ Must Have | 2 | NLP keyword matching |
| Injury RAG service | ✅ Must Have | 2 | Sport-specific namespaces |
| Body part classification | ✅ Must Have | 2 | Shoulder, knee, back, etc. |
| Severity scoring (mild/moderate/severe) | ✅ Must Have | 2 | Conservative thresholds |
| Recovery recommendations | ✅ Must Have | 2 | Exercise modifications |
| Active injury tracking | ✅ Must Have | 2 | Status: active/recovering/resolved |
| Recovery check-in modal | ⚡ Important | 2 | Weekly progress |
| Red flag detection | ✅ Must Have | 2 | Doctor referral triggers |
| Injury-aware program modifications | ✅ Must Have | 2 | Auto-adjust exercises |
| DOMS vs injury classification | ✅ Must Have | 2 | Filter false positives |

---

### E. Analytics & Tracking (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Volume tracking (weekly/monthly) | ✅ Must Have | 2 | Tonnage calculations |
| Muscle group distribution | ✅ Must Have | 2 | Balance analysis |
| Fatigue monitoring (7 indicators) | ⚡ Important | 4 | Multi-factor score |
| Deload recommendations | ⚡ Important | 4 | Volume + recovery based |
| PR history & progression | ✅ Must Have | 1 | 1RM tracking |
| Readiness scores | ✅ Must Have | 2 | Simple (emoji) or detailed |
| 7-day trend analysis | ✅ Must Have | 2 | Improving/stable/declining |
| Volume charts (Victory Native) | ✅ Must Have | 2 | Weekly volume bars |
| Adherence tracking | ⚡ Important | 5 | Quad/ham, push/pull ratios |
| Badge system (90 badges) | ⚡ Important | 3 | Achievement unlocks |
| Streak tracking | ⚡ Important | 3 | Workout/readiness streaks |

---

### F. Wearable Integration (Current + Planned)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| WHOOP OAuth integration | ⚡ Important | 4 | Recovery, strain, sleep |
| Terra API integration | ⚡ Important | 4 | Multi-provider aggregation |
| Apple Health (HealthKit) | ⚡ Important | 4 | iOS native |
| Google Fit / Health Connect | ⚡ Important | 4 | Android native |
| Garmin Connect | 🔮 Future | 4 | Via Terra or direct |
| Oura Ring | 🔮 Future | 4 | Via Terra |
| Wearable raw event logging | ⚡ Important | 4 | Audit trail |
| Daily metrics normalization | ⚡ Important | 4 | Dedupe across sources |
| Sleep sessions tracking | ⚡ Important | 4 | Duration, stages, score |
| Activity sessions | ⚡ Important | 4 | HR zones, calories |
| Daily summaries | ⚡ Important | 4 | Aggregated from all sources |
| Source priority system | ⚡ Important | 4 | WHOOP > Oura > Garmin |
| Auto-populate readiness | ⚡ Important | 4 | From wearable data |
| Heart rate during workout | 🔮 Future | 4 | Real-time HR zones |
| Stryd running power | 🔮 Future | 6 | Power metrics |
| Nix biosensor | 🔮 Future | 7 | Sweat/hydration |

---

### G. Coach Platform (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Coach profiles | ⚡ Important | 5 | Specializations, certs |
| Client assignments | ⚡ Important | 5 | Coach-client relationships |
| Client invitations | ⚡ Important | 5 | Email invite flow |
| Client selector (coach view) | ⚡ Important | 5 | Switch between clients |
| Coach dashboard | ⚡ Important | 5 | Multi-client analytics |
| CSV program import | ⚡ Important | 5 | Bulk import with AI mapping |
| Program assignment | ⚡ Important | 5 | Assign programs to clients |
| Client analytics viewing | ⚡ Important | 5 | Scoped to client |
| Organizations (B2B) | 🔮 Future | 6 | Gyms, studios, teams |
| Coach revenue/payments | 🔮 Future | 7 | Stripe integration |

---

### H. Nutrition (Current + Planned)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Daily nutrition summary | ⚡ Important | 4 | Calories, macros |
| Nutrition trends (7-day) | ⚡ Important | 4 | Charts |
| Manual nutrition entry | ⚡ Important | 4 | Fallback input |
| Apple Health nutrition sync | 🔮 Future | 4 | Auto-sync |
| Terra nutrition sync | 🔮 Future | 4 | MyFitnessPal, etc. |
| Nutrition insights | 🔮 Future | 7 | AI correlations |
| Pre/post workout nutrition | 🔮 Future | 7 | Timing recommendations |

---

### I. Calendar & Scheduling (Current + Planned)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Training calendar screen | ✅ Must Have | 2 | Weekly view |
| Scheduled workouts | ✅ Must Have | 2 | Date, template, status |
| Workout templates | ✅ Must Have | 2 | Reusable definitions |
| Drag-drop rescheduling | 🔮 Future | 5 | Calendar UI |
| Conflict detection | 🔮 Future | 5 | Interference rules |
| Availability windows | 🔮 Future | 5 | Travel, vacation, injury |
| AI schedule suggestions | 🔮 Future | 6 | Auto-adjustment |
| Multi-sport scheduling | 🔮 Future | 6 | Hybrid athlete support |

---

### J. User Management (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| User profiles | ✅ Must Have | 0 | Experience, goals, tier |
| Authentication (Supabase) | ✅ Must Have | 0 | Email, Apple, Google SSO |
| SecureStore for tokens | ✅ Must Have | 0 | **Fix localStorage bug** |
| User preferences | ✅ Must Have | 1 | Equipment, exercises, etc. |
| Conversational pref updates | ⚡ Important | 2 | Update via chat |
| Avatar upload | ✅ Must Have | 1 | Supabase storage |
| Tier management (free/premium) | ✅ Must Have | 0 | Feature gating |
| Dark mode | ✅ Must Have | 1 | Theme toggle |
| Notification settings | ✅ Must Have | 1 | Toggle types |

---

### K. Offline & Sync (Current)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Offline workout logging | ✅ Must Have | 1 | SQLite queue |
| Background sync (30s interval) | ✅ Must Have | 1 | Auto-sync when online |
| Sync status indicator | ✅ Must Have | 1 | Show sync state |
| Message persistence | ✅ Must Have | 2 | Chat history cache |
| Conflict resolution | ⚡ Important | 1 | Handle sync conflicts |
| 7-day workout cache | ✅ Must Have | 1 | Offline access |

---

### L. Health Intelligence (Planned - From AI_HEALTH_INTELLIGENCE_ENGINE.md)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Correlation discovery | 🔮 Future | 7 | Nutrition ↔ Performance |
| Pattern recognition | 🔮 Future | 7 | Recurring outcome patterns |
| Injury risk prediction | 🔮 Future | 7 | 7-day forecasting |
| Performance prediction | 🔮 Future | 7 | Expected workout quality |
| Nutrition optimization | 🔮 Future | 7 | Personalized recommendations |
| Anomaly detection | 🔮 Future | 7 | Unusual patterns flagged |
| Causal inference | 🔮 Future | 7 | Prove causation vs correlation |
| Natural language insights | 🔮 Future | 7 | GPT-4 generated explanations |
| Weekly summary emails | 🔮 Future | 7 | Automated insights |
| Proactive AI coach | 🔮 Future | 7 | Push suggestions |

---

### M. Multi-Sport Support (Planned)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Running programs (structured) | 🔮 Future | 6 | Tempo, intervals, long runs |
| CrossFit WOD support | 🔮 Future | 6 | AMRAP, EMOM, Tabata |
| Hyrox programming | 🔮 Future | 6 | Station-specific training |
| Triathlon support | 🔮 Future | 7 | Swim/bike/run |
| Cycling workouts | 🔮 Future | 7 | Power tracking |
| Swimming tracking | 🔮 Future | 7 | Lap counter, pace |
| Hybrid athlete profiles | 🔮 Future | 6 | Priority ranking |
| Interference mitigation | 🔮 Future | 6 | No heavy legs before runs |
| Brick workouts | 🔮 Future | 7 | Multi-sport transitions |

---

### N. Advanced Features (Planned)

| Feature | Status | Phase | Notes |
|---------|--------|-------|-------|
| Lock screen widget (iOS) | 🔮 Future | 6 | Voice button on lock screen |
| Apple Watch app | 🔮 Future | 7 | Native watchOS |
| Video form analysis | 🔮 Future | 7+ | Computer vision |
| Equipment brand tracking | 🔮 Future | 6 | Machine-specific loads |
| Gym location detection | 🔮 Future | 6 | Geofencing |
| Social features | 🔮 Future | 7+ | Activity feed, challenges |
| In-app music controls | 🔮 Future | 7+ | Spotify, Apple Music |
| Exercise video library | 🔮 Future | 7+ | Curated technique videos |

---

## Phase 0: Foundation (Weeks 1-4)

### Goals
- Set up new monorepo with TypeScript
- Configure tRPC and Drizzle ORM
- Implement authentication with SecureStore fix
- Create base mobile app shell with Expo Router

### Features to Build

#### 0.1 Project Setup (Week 1)
- [ ] Create new monorepo structure (Turborepo)
- [ ] Configure TypeScript across all packages
- [ ] Set up ESLint, Prettier, Husky
- [ ] Configure Drizzle ORM with Supabase
- [ ] Set up tRPC server and client

#### 0.2 Authentication (Week 2)
- [ ] Implement Supabase Auth integration
- [ ] **SecureStore for token storage** (fix localStorage bug)
- [ ] Email/password authentication
- [ ] Apple Sign-In
- [ ] Google Sign-In
- [ ] Session persistence and refresh

#### 0.3 Database Migration (Week 2-3)
- [ ] Define Drizzle schema for core tables:
  - users, user_profiles
  - exercises (452 exercises seed)
  - workout_logs, sets
  - readiness_scores
- [ ] Generate TypeScript types from schema
- [ ] Create migration scripts

#### 0.4 Mobile App Shell (Week 3-4)
- [ ] Expo Router file-based navigation
- [ ] Tab navigation (Home, Coach, Run)
- [ ] Theme system (dark/light mode)
- [ ] Base component library
- [ ] TanStack Query setup

### Deliverables
- Working auth flow with secure token storage
- Database schema with type-safe ORM
- Empty mobile app with navigation structure
- tRPC endpoints for auth

---

## Phase 1: Core Voice Logging (Weeks 5-10)

### Goals
- Implement voice-first workout logging
- Build exercise matching system
- Create workout tracking UI
- Set up offline sync

### Features to Build

#### 1.1 Voice Parsing (Week 5-6)
- [ ] Grok 4 voice command parser
- [ ] Session management (last exercise, last weight)
- [ ] "Same weight" detection
- [ ] Confidence scoring system
- [ ] tRPC procedure: `voice.parse`

#### 1.2 Exercise Matching (Week 6-7)
- [ ] Fuzzy matching (80% threshold)
- [ ] Semantic matching with embeddings
- [ ] Synonym generation
- [ ] Auto-exercise creation
- [ ] 452 exercises seeded with embeddings
- [ ] tRPC procedure: `exercise.match`, `exercise.create`

#### 1.3 Workout Tracking (Week 7-8)
- [ ] Active workout store (Zustand)
- [ ] Start/complete/cancel workout
- [ ] Set logging (exercise, weight, reps, RPE)
- [ ] Rest timer with configurable duration
- [ ] PR detection and celebration
- [ ] tRPC procedures: `workout.start`, `workout.log`, `workout.complete`

#### 1.4 Mobile UI (Week 8-9)
- [ ] HomeScreen with dashboard
- [ ] Voice FAB with pulse animation
- [ ] QuickLogBar component
- [ ] CurrentSetBar component
- [ ] Workout celebration screen
- [ ] PR history screen

#### 1.5 Offline Sync (Week 9-10)
- [ ] Expo SQLite for local storage
- [ ] Sync queue for pending operations
- [ ] 30-second background sync
- [ ] Sync status indicator
- [ ] Conflict resolution strategy

### Deliverables
- Voice-first workout logging working end-to-end
- Exercise matching with fuzzy + semantic
- Offline-capable workout tracking
- PR detection and celebration

---

## Phase 2: AI Coaching & Programs (Weeks 11-16)

### Goals
- Build AI coach chat interface
- Implement program generation
- Add injury detection
- Create analytics dashboard

### Features to Build

#### 2.1 AI Coach Chat (Week 11-12)
- [ ] Chat interface (Gifted Chat or custom)
- [ ] Streaming responses from Grok 4
- [ ] RAG with Upstash Vector (41 namespaces)
- [ ] Smart namespace selection
- [ ] Personality engine (tone profiles)
- [ ] Off-topic handling with humor
- [ ] tRPC procedure: `coach.chat` (streaming)

#### 2.2 Message Classification (Week 12-13)
- [ ] Local classifier (on-device, free tier)
- [ ] Backend classifier (Grok 4, premium)
- [ ] Route to appropriate handler:
  - workout_log → voice parser
  - exercise_swap → swap service
  - question → AI coach
  - onboarding → extraction
  - off_topic → redirect

#### 2.3 Program Generation (Week 13-14)
- [ ] Program generation with Grok 4
- [ ] 12-week periodized programs
- [ ] Smart namespace selector for RAG
- [ ] Warm-up/cooldown auto-inclusion
- [ ] Program templates and scheduling
- [ ] tRPC procedure: `program.generate`

#### 2.4 Injury Detection (Week 14-15)
- [ ] NLP keyword matching
- [ ] Injury RAG service
- [ ] Body part classification
- [ ] Severity scoring
- [ ] Recovery recommendations
- [ ] Active injury tracking
- [ ] tRPC procedure: `injury.detect`, `injury.log`

#### 2.5 Analytics (Week 15-16)
- [ ] Volume tracking (tonnage)
- [ ] Muscle group distribution
- [ ] Readiness scores (simple + detailed)
- [ ] 7-day trend analysis
- [ ] Volume charts (Victory Native)
- [ ] Training calendar screen
- [ ] tRPC procedures: `analytics.volume`, `analytics.readiness`

### Deliverables
- AI coach with streaming chat
- 12-week program generation
- Injury detection and tracking
- Analytics dashboard with charts

---

## Phase 3: Running & GPS (Weeks 17-20)

### Goals
- Implement GPS run tracking
- Build run analytics
- Add badge system
- Implement Live Activity (iOS)

### Features to Build

#### 3.1 GPS Tracking (Week 17-18)
- [ ] expo-location integration
- [ ] Real-time distance/pace/calories
- [ ] Haversine formula for accuracy
- [ ] Route polyline storage
- [ ] Auto-pause at low speed
- [ ] Countdown start
- [ ] tRPC procedure: `run.save`

#### 3.2 Run UI (Week 18-19)
- [ ] RunScreen with live stats
- [ ] Map with route display
- [ ] Lap tracking (manual marks)
- [ ] Run summary screen
- [ ] Splits breakdown
- [ ] Run settings (auto-pause, countdown)

#### 3.3 Run Analytics (Week 19)
- [ ] Elevation gain/loss
- [ ] Grade-adjusted pace (GAP)
- [ ] Terrain difficulty classification
- [ ] Shoe tracking (mileage, replacement)
- [ ] Run history with filtering

#### 3.4 Badges & Streaks (Week 19-20)
- [ ] 90 badge types
- [ ] Badge unlock detection
- [ ] Streak tracking (workout, readiness)
- [ ] Achievement celebration UI
- [ ] tRPC procedures: `badge.check`, `badge.unlock`

#### 3.5 Live Activity - iOS (Week 20)
- [ ] ActivityKit integration
- [ ] Dynamic Island support
- [ ] Lock screen widget
- [ ] Real-time updates during workout
- [ ] Voice command button

### Deliverables
- Full GPS run tracking
- Run analytics with GAP
- Badge and streak system
- iOS Live Activity support

---

## Phase 4: Wearable Integration (Weeks 21-28)

### Goals
- Integrate WHOOP and Terra
- Implement Apple Health / Google Fit
- Build health metrics dashboard
- Add fatigue and deload features

### Features to Build

#### 4.1 Apple Health / HealthKit (Week 21-22)
- [ ] iOS HealthKit permissions
- [ ] Read: sleep, HRV, resting HR, steps
- [ ] Background sync service
- [ ] Normalize to daily_metrics format

#### 4.2 Google Fit / Health Connect (Week 22-23)
- [ ] Android Health Connect permissions
- [ ] Read: sleep, HR, steps, activities
- [ ] Parity with iOS implementation

#### 4.3 WHOOP Integration (Week 23-24)
- [ ] OAuth flow
- [ ] Recovery score sync
- [ ] Strain score sync
- [ ] Sleep data sync
- [ ] Webhook handler

#### 4.4 Terra API Integration (Week 24-25)
- [ ] Multi-provider aggregation
- [ ] Garmin, Oura support
- [ ] Standardized data format
- [ ] Provider priority system

#### 4.5 Health Metrics (Week 25-26)
- [ ] Wearable raw events table
- [ ] Daily metrics normalization
- [ ] Sleep sessions tracking
- [ ] Activity sessions
- [ ] Daily summaries aggregation
- [ ] Source priority (WHOOP > Oura > Garmin)

#### 4.6 Fatigue & Deload (Week 26-27)
- [ ] 7-indicator fatigue monitoring
- [ ] Deload recommendation engine
- [ ] Volume + recovery analysis
- [ ] Auto-adjust volume suggestions

#### 4.7 Nutrition (Week 27-28)
- [ ] Daily nutrition summary
- [ ] Manual nutrition entry
- [ ] Nutrition trends chart
- [ ] Apple Health nutrition sync
- [ ] Terra nutrition sync

### Deliverables
- WHOOP and Terra integration
- Apple Health / Google Fit sync
- Health metrics dashboard
- Fatigue monitoring and deload recommendations

---

## Phase 5: Coach Platform (Weeks 29-34)

### Goals
- Build coach dashboard
- Implement client management
- Add CSV program import
- Create unified web app

### Features to Build

#### 5.1 Coach Profiles (Week 29-30)
- [ ] Coach profile creation
- [ ] Specializations and certifications
- [ ] Role-based access (owner, admin, coach)
- [ ] tRPC procedure: `coach.profile`

#### 5.2 Client Management (Week 30-31)
- [ ] Client invitations (email)
- [ ] Invitation acceptance flow
- [ ] Client assignments table
- [ ] Coach-client RLS policies
- [ ] Client selector (switch context)
- [ ] tRPC procedures: `coach.invite`, `coach.clients`

#### 5.3 CSV Import (Week 31-32)
- [ ] File upload (S3 or Supabase Storage)
- [ ] AI schema detection
- [ ] Column mapping review
- [ ] Program quality validation
- [ ] Bulk import with progress
- [ ] tRPC procedure: `import.csv`

#### 5.4 Coach Analytics (Week 32-33)
- [ ] Client analytics scoped view
- [ ] Adherence tracking
- [ ] Progress monitoring
- [ ] Multi-client dashboard

#### 5.5 Unified Web App (Week 33-34)
- [ ] Merge web + web-dashboard
- [ ] Route groups for different sections
- [ ] Shared component library
- [ ] Responsive design
- [ ] Same tRPC client as mobile

### Deliverables
- Full coach platform
- Client invitation and management
- CSV program import
- Unified web application

---

## Phase 6: Advanced Features (Weeks 35-44)

### Goals
- Add calendar drag-drop
- Implement multi-sport basics
- Build equipment tracking
- Add lock screen widget

### Features to Build

#### 6.1 Calendar UI (Week 35-37)
- [ ] Interactive calendar view
- [ ] Drag-drop rescheduling
- [ ] Conflict detection engine
- [ ] Conflict warning UI
- [ ] Auto-suggest better dates

#### 6.2 Multi-Sport Foundation (Week 37-40)
- [ ] Athlete profiles (hybrid, CrossFit, etc.)
- [ ] Running programs (structured)
- [ ] CrossFit WOD support (AMRAP, EMOM)
- [ ] Hyrox programming
- [ ] Interference mitigation rules

#### 6.3 Equipment Intelligence (Week 40-42)
- [ ] Equipment brands database
- [ ] Machine models and attachments
- [ ] Gym location detection (geofencing)
- [ ] Location-based equipment defaults
- [ ] Load adjustment algorithm

#### 6.4 Lock Screen Widget (Week 42-44)
- [ ] iOS widget extension
- [ ] Voice command from lock screen
- [ ] Android equivalent (foreground notification)
- [ ] Quick-log from widget

### Deliverables
- Drag-drop calendar
- Multi-sport support basics
- Equipment tracking
- Lock screen widgets

---

## Phase 7: AI Health Intelligence (Weeks 45-60)

### Goals
- Build correlation discovery engine
- Implement predictive models
- Add natural language insights
- Create proactive AI coach

### Features to Build

#### 7.1 Data Pipeline (Week 45-48)
- [ ] Daily health snapshot generation
- [ ] Feature engineering
- [ ] Data quality scoring
- [ ] Time-series alignment

#### 7.2 Correlation Engine (Week 48-52)
- [ ] Pearson/Spearman correlation
- [ ] Time-lagged correlation
- [ ] Nutrition ↔ Performance
- [ ] Sleep ↔ Recovery
- [ ] Training ↔ Injury

#### 7.3 Pattern Recognition (Week 52-54)
- [ ] Clustering (K-means, DBSCAN)
- [ ] Sequence mining
- [ ] Performance decline patterns
- [ ] Injury risk patterns
- [ ] Optimal performance patterns

#### 7.4 Predictive Models (Week 54-58)
- [ ] Injury risk prediction (7-day)
- [ ] Performance forecasting
- [ ] Nutrition optimization
- [ ] XGBoost / Random Forest models
- [ ] Model confidence scoring

#### 7.5 Natural Language Insights (Week 58-60)
- [ ] GPT-4 insight generation
- [ ] Personalized explanations
- [ ] Actionable recommendations
- [ ] Insight prioritization
- [ ] Weekly summary emails

### Deliverables
- Correlation discovery engine
- Injury risk prediction
- Performance forecasting
- Natural language insights

---

## Future Phases (Beyond Week 60)

### Phase 8: Apple Watch App
- Native watchOS application
- Voice logging from wrist
- Workout tracking standalone
- Interval guidance

### Phase 9: Video Form Analysis
- Computer vision for form checks
- Pose estimation (MediaPipe)
- Automated form cues
- Rep counting

### Phase 10: Social Features
- Activity feed (opt-in)
- Following/followers
- Challenges and competitions
- Clubs and groups
- Leaderboards

### Phase 11: Coaching Business Platform
- Payment processing (Stripe Connect)
- Subscription management
- Revenue dashboard
- Client billing

### Phase 12: Advanced Integrations
- Triathlon support (swim/bike/run)
- Stryd running power
- Nix biosensor (hydration)
- In-app music controls
- Exercise video library

---

## Migration Checklist

### Before Starting Rebuild
- [ ] Export all 452 exercises with embeddings
- [ ] Export all AI prompts (documented in audit)
- [ ] Export all RAG namespaces content
- [ ] Document all business logic rules
- [ ] Archive current codebase as backup

### During Rebuild
- [ ] Use same Supabase project (shared database)
- [ ] Create new tables with `v2_` prefix during transition
- [ ] Implement feature parity before enhancements
- [ ] Test each phase against original functionality

### After Rebuild
- [ ] Migrate users to new app
- [ ] Remove `v2_` prefix from tables
- [ ] Deprecate old API endpoints
- [ ] Archive old codebase

---

## Risk Assessment

### HIGH RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Delays launch | Strict phase gates, MVP each phase |
| AI prompt regression | Degraded quality | A/B test prompts against original |
| Data migration issues | User data loss | Parallel run, backup everything |
| Performance regression | Poor UX | Benchmark against current app |

### MEDIUM RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| TypeScript learning curve | Slower development | Team training, pair programming |
| tRPC complexity | Integration issues | Start simple, iterate |
| Offline sync bugs | Data conflicts | Extensive testing, queue-based |

### LOW RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| UI differences | User confusion | Follow existing design system |
| Third-party API changes | Integration breaks | Abstract behind service layer |

---

## Summary

This rebuild plan ensures **every feature** from the current VoiceFit codebase is accounted for, plus all planned features from the roadmap documents.

### Phase Timeline
| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| **0: Foundation** | 4 weeks | Auth, DB, App Shell |
| **1: Voice Logging** | 6 weeks | Core workout logging |
| **2: AI Coaching** | 6 weeks | Chat, programs, injury |
| **3: Running** | 4 weeks | GPS, badges, Live Activity |
| **4: Wearables** | 8 weeks | WHOOP, Terra, health metrics |
| **5: Coach Platform** | 6 weeks | Dashboard, clients, CSV |
| **6: Advanced** | 10 weeks | Calendar, multi-sport |
| **7: Health AI** | 16 weeks | Correlations, predictions |

**Total:** ~60 weeks (15 months) for full feature parity + planned roadmap

### Key Decisions Made
1. **TypeScript backend** - Full-stack type safety
2. **Grok 4 only** - Consolidate AI providers
3. **tRPC** - Type-safe API without codegen
4. **SecureStore** - Fix critical auth bug
5. **Expo Router** - Modern navigation
6. **Unified web app** - Single deployment

### Next Steps
1. Create new repository: `voicefit-v2`
2. Set up Turborepo monorepo structure
3. Begin Phase 0: Foundation
4. Keep current project as `voicefit-legacy` backup

---

**Document Owner:** Engineering Team
**Last Updated:** 2025-01-25
**Next Review:** After Phase 0 completion
