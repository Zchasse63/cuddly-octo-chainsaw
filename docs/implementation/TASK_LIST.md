# VoiceFit 2.0 Task List

**Last Updated:** November 26, 2025
**Legend:** ✅ Complete | 🔄 In Progress | ⏳ Pending | ❌ Blocked

---

## Phase 1: Backend Completion (Priority: Critical)

### 1.1 Shoe Tracking Feature
- ⏳ **1.1.1** Create `running_shoes` schema in `apps/backend/src/db/schema/running.ts`
  - Fields: id, user_id, brand, model, purchase_date, total_mileage, replacement_threshold, is_active, notes, created_at
- ⏳ **1.1.2** Add shoe tracking router `apps/backend/src/routers/shoes.ts`
  - CRUD operations for shoes
  - Endpoint to link shoe to run
  - Endpoint to get shoe mileage stats
  - Replacement warning logic (default 400 miles)
- ⏳ **1.1.3** Update running router to accept shoe_id on run creation
- ⏳ **1.1.4** Update schema.sql with running_shoes table

### 1.2 Full Badge System (90 Badges)
- ⏳ **1.2.1** Create `BADGE_DEFINITIONS.md` with all 90 badge specs
- ⏳ **1.2.2** Create badge seed data file `apps/backend/src/db/seeds/badges.ts`
- ⏳ **1.2.3** Update gamification router with badge checking logic
  - Strength badges (30): workout count, volume, PRs, plate milestones
  - Running badges (40): distance, single run, speed, elevation, weather
  - Streak badges (12): workout streaks, weekly consistency
  - Hybrid badges (8): cross-training, program completion
- ⏳ **1.2.4** Create badge unlock service `apps/backend/src/services/badgeUnlocker.ts`
- ⏳ **1.2.5** Add badge check triggers after workout/run completion

### 1.3 Health Intelligence Service
- ⏳ **1.3.1** Create `apps/backend/src/services/healthIntelligence.ts`
  - Correlation analysis: Nutrition ↔ Recovery
  - Correlation analysis: Sleep ↔ Performance
  - Correlation analysis: Training volume ↔ Recovery
  - Time period support: 7, 14, 30, 60 days
- ⏳ **1.3.2** Add health intelligence endpoints to analytics router
- ⏳ **1.3.3** Create AI insight generation for correlations

### 1.4 Injury Risk Assessment
- ⏳ **1.4.1** Create `apps/backend/src/services/injuryRisk.ts`
  - Training load spike detection (>30% increase)
  - Low recovery detection (<50%)
  - Poor sleep detection (<6.5 hours)
  - Compound risk scoring
- ⏳ **1.4.2** Add injury risk endpoints to injury router
- ⏳ **1.4.3** Create proactive warning system

---

## Phase 2: Mobile App Foundation (Priority: Critical)

### 2.1 Project Setup
- ⏳ **2.1.1** Set up Expo Router file-based navigation
- ⏳ **2.1.2** Configure PowerSync for offline support
- ⏳ **2.1.3** Set up tRPC client with React Query
- ⏳ **2.1.4** Configure react-native-reanimated and gesture-handler
- ⏳ **2.1.5** Set up Zustand stores from existing code
- ⏳ **2.1.6** Configure theme provider with full UI_SPECIFICATION colors

### 2.2 Navigation Structure (3 Tabs + Avatar)
- ⏳ **2.2.1** Create root layout `apps/mobile/app/_layout.tsx`
- ⏳ **2.2.2** Create tab layout `apps/mobile/app/(tabs)/_layout.tsx`
  - Home tab (index)
  - Chat tab
  - Run tab
- ⏳ **2.2.3** Create top header with profile avatar button
- ⏳ **2.2.4** Create profile drawer/modal navigation

### 2.3 Authentication Screens
- ⏳ **2.3.1** Create `apps/mobile/app/(auth)/sign-in.tsx`
- ⏳ **2.3.2** Create `apps/mobile/app/(auth)/sign-up.tsx`
- ⏳ **2.3.3** Create `apps/mobile/app/(auth)/forgot-password.tsx`
- ⏳ **2.3.4** Integrate Supabase Auth with Apple/Google OAuth
- ⏳ **2.3.5** Set up secure token storage (expo-secure-store)

### 2.4 Onboarding Flow
- ⏳ **2.4.1** Create `apps/mobile/app/(onboarding)/_layout.tsx`
- ⏳ **2.4.2** Create welcome screen
- ⏳ **2.4.3** Create experience level screen
- ⏳ **2.4.4** Create goals screen
- ⏳ **2.4.5** Create training frequency screen
- ⏳ **2.4.6** Create equipment screen
- ⏳ **2.4.7** Create injuries screen
- ⏳ **2.4.8** Create voice tutorial screen
- ⏳ **2.4.9** Create completion screen

---

## Phase 3: Core Mobile Screens (Priority: High)

### 3.1 Home Tab (Dashboard)
- ⏳ **3.1.1** Create `apps/mobile/app/(tabs)/index.tsx` (HomeScreen)
- ⏳ **3.1.2** Build stats overview component (workouts, volume, PRs)
- ⏳ **3.1.3** Build today's workout preview card
- ⏳ **3.1.4** Build weekly summary component
- ⏳ **3.1.5** Build recent activity list
- ⏳ **3.1.6** Build readiness check-in prompt
- ⏳ **3.1.7** Build quick action buttons (start workout, log run)

### 3.2 Chat Tab (AI Coach)
- ⏳ **3.2.1** Create `apps/mobile/app/(tabs)/chat.tsx` (ChatScreen)
- ⏳ **3.2.2** Build chat message list with bubbles
- ⏳ **3.2.3** Build text input with send button
- ⏳ **3.2.4** Build voice input button (hold to record)
- ⏳ **3.2.5** Build typing indicator for AI responses
- ⏳ **3.2.6** Build streaming response display
- ⏳ **3.2.7** Build workout logging confirmations
- ⏳ **3.2.8** Build exercise substitution cards
- ⏳ **3.2.9** Build program generation questionnaire flow
- ⏳ **3.2.10** Connect to unified coach tRPC endpoints

### 3.3 Run Tab (GPS Tracking)
- ⏳ **3.3.1** Create `apps/mobile/app/(tabs)/run.tsx` (RunScreen)
- ⏳ **3.3.2** Build pre-run screen (shoe selection, workout type)
- ⏳ **3.3.3** Build active run screen with map
- ⏳ **3.3.4** Build real-time stats overlay (pace, distance, time)
- ⏳ **3.3.5** Build pause/resume/stop controls
- ⏳ **3.3.6** Implement GPS tracking with expo-location
- ⏳ **3.3.7** Implement background location support
- ⏳ **3.3.8** Build run summary screen
- ⏳ **3.3.9** Build splits display
- ⏳ **3.3.10** Connect to running tRPC endpoints

### 3.4 Profile & Settings
- ⏳ **3.4.1** Create `apps/mobile/app/profile/index.tsx`
- ⏳ **3.4.2** Build profile header with avatar
- ⏳ **3.4.3** Build settings list (preferences, notifications, wearables)
- ⏳ **3.4.4** Create `apps/mobile/app/profile/personal-info.tsx`
- ⏳ **3.4.5** Create `apps/mobile/app/profile/preferences.tsx`
- ⏳ **3.4.6** Create `apps/mobile/app/profile/notifications.tsx`
- ⏳ **3.4.7** Create `apps/mobile/app/profile/wearables.tsx`
- ⏳ **3.4.8** Create `apps/mobile/app/profile/support.tsx`

---

## Phase 4: Workout Features (Priority: High)

### 4.1 Workout Logging
- ⏳ **4.1.1** Create `apps/mobile/app/workout/active.tsx` (ActiveWorkoutScreen)
- ⏳ **4.1.2** Build exercise selector with autocomplete
- ⏳ **4.1.3** Build set logging form (weight, reps, RPE)
- ⏳ **4.1.4** Build voice logging integration
- ⏳ **4.1.5** Build rest timer between sets
- ⏳ **4.1.6** Build PR celebration animation
- ⏳ **4.1.7** Build workout summary screen
- ⏳ **4.1.8** Connect to workout tRPC endpoints

### 4.2 Workout History
- ⏳ **4.2.1** Create `apps/mobile/app/workout/history.tsx` (JournalScreen)
- ⏳ **4.2.2** Build workout list with filters
- ⏳ **4.2.3** Build workout detail view
- ⏳ **4.2.4** Build exercise breakdown component

### 4.3 Exercise Library
- ⏳ **4.3.1** Create `apps/mobile/app/workout/exercises.tsx`
- ⏳ **4.3.2** Build exercise search with filters
- ⏳ **4.3.3** Build exercise detail modal
- ⏳ **4.3.4** Build exercise video/gif display

---

## Phase 5: Training Calendar (Priority: High)

### 5.1 Calendar Screen
- ⏳ **5.1.1** Create `apps/mobile/app/calendar/index.tsx`
- ⏳ **5.1.2** Build week view calendar
- ⏳ **5.1.3** Build day detail sheet
- ⏳ **5.1.4** Build workout status indicators (scheduled, completed, missed)
- ⏳ **5.1.5** Implement drag-and-drop rescheduling
  - Install react-native-draggable-flatlist
  - Build draggable workout card component
  - Connect to calendar.rescheduleEntry endpoint
- ⏳ **5.1.6** Build multiple workouts per day support (strength + running)

### 5.2 Program Management
- ⏳ **5.2.1** Create `apps/mobile/app/program/index.tsx` (ProgramLogScreen)
- ⏳ **5.2.2** Build active program overview
- ⏳ **5.2.3** Build week-by-week view
- ⏳ **5.2.4** Build program questionnaire UI
- ⏳ **5.2.5** Build program preview before activation
- ⏳ **5.2.6** Connect to calendar tRPC endpoints

---

## Phase 6: Analytics & Health (Priority: Medium)

### 6.1 Analytics Screen
- ⏳ **6.1.1** Create `apps/mobile/app/analytics/index.tsx`
- ⏳ **6.1.2** Build volume chart component
- ⏳ **6.1.3** Build muscle group breakdown chart
- ⏳ **6.1.4** Build weekly comparison component
- ⏳ **6.1.5** Build PR history chart

### 6.2 Health Intelligence
- ⏳ **6.2.1** Create `apps/mobile/app/health/index.tsx`
- ⏳ **6.2.2** Build correlation cards
- ⏳ **6.2.3** Build health score display
- ⏳ **6.2.4** Build injury risk indicator
- ⏳ **6.2.5** Build recovery recommendations

### 6.3 PRs Screen
- ⏳ **6.3.1** Create `apps/mobile/app/prs/index.tsx`
- ⏳ **6.3.2** Build PR list by exercise
- ⏳ **6.3.3** Build PR detail with history
- ⏳ **6.3.4** Build estimated 1RM calculator

---

## Phase 7: Running Features (Priority: High)

### 7.1 Running History
- ⏳ **7.1.1** Create `apps/mobile/app/running/history.tsx`
- ⏳ **7.1.2** Build run list with filters
- ⏳ **7.1.3** Build run detail with map
- ⏳ **7.1.4** Build PR badges display

### 7.2 Shoe Management
- ⏳ **7.2.1** Create `apps/mobile/app/running/shoes.tsx`
- ⏳ **7.2.2** Build shoe list with mileage
- ⏳ **7.2.3** Build add/edit shoe form
- ⏳ **7.2.4** Build replacement warning display

### 7.3 Structured Workouts
- ⏳ **7.3.1** Create `apps/mobile/app/running/workout-builder.tsx`
- ⏳ **7.3.2** Build interval workout builder
- ⏳ **7.3.3** Build segment display during run
- ⏳ **7.3.4** Build audio cues for intervals

---

## Phase 8: Badge System UI (Priority: Medium)

### 8.1 Badge Display
- ⏳ **8.1.1** Create `apps/mobile/app/badges/index.tsx`
- ⏳ **8.1.2** Build badge grid by category
- ⏳ **8.1.3** Build badge detail modal
- ⏳ **8.1.4** Build unlock progress indicators
- ⏳ **8.1.5** Build badge celebration animation

---

## Phase 9: Coach Web Dashboard (Priority: High)

### 9.1 Web Project Setup
- ⏳ **9.1.1** Create Next.js 14 app in `apps/web`
- ⏳ **9.1.2** Configure Tailwind CSS with UI_SPECIFICATION colors
- ⏳ **9.1.3** Set up tRPC client
- ⏳ **9.1.4** Set up Supabase Auth for web

### 9.2 Landing Page
- ⏳ **9.2.1** Create marketing landing page
- ⏳ **9.2.2** Build feature showcase
- ⏳ **9.2.3** Build pricing section
- ⏳ **9.2.4** Build sign-up CTA

### 9.3 Coach Authentication
- ⏳ **9.3.1** Create coach sign-in page
- ⏳ **9.3.2** Create coach sign-up page
- ⏳ **9.3.3** Create coach onboarding flow

### 9.4 Client Management
- ⏳ **9.4.1** Create dashboard layout
- ⏳ **9.4.2** Build client list page
- ⏳ **9.4.3** Build client detail page
- ⏳ **9.4.4** Build client invitation flow
- ⏳ **9.4.5** Build client analytics view

### 9.5 Program Management
- ⏳ **9.5.1** Build program list page
- ⏳ **9.5.2** Build program detail page
- ⏳ **9.5.3** Build program builder
- ⏳ **9.5.4** Build program assignment flow

### 9.6 CSV Import
- ⏳ **9.6.1** Create CSV import backend endpoints
- ⏳ **9.6.2** Build file upload component
- ⏳ **9.6.3** Build schema mapping UI
- ⏳ **9.6.4** Build preview and confirmation
- ⏳ **9.6.5** Build bulk assignment UI

---

## Phase 10: PowerSync Integration (Priority: Critical)

### 10.1 PowerSync Setup
- ⏳ **10.1.1** Configure PowerSync service
- ⏳ **10.1.2** Define sync rules (12 tables)
- ⏳ **10.1.3** Set up conflict resolution (last-write-wins)
- ⏳ **10.1.4** Create sync status indicator component
- ⏳ **10.1.5** Test offline → online sync flow

### 10.2 Offline-Enabled Components
- ⏳ **10.2.1** Update workout logging for offline
- ⏳ **10.2.2** Update run tracking for offline
- ⏳ **10.2.3** Update readiness check-in for offline
- ⏳ **10.2.4** Add offline queue indicator

---

## Phase 11: Polish & Testing (Priority: Medium)

### 11.1 Animations
- ⏳ **11.1.1** Add screen transitions
- ⏳ **11.1.2** Add PR celebration animation
- ⏳ **11.1.3** Add badge unlock animation
- ⏳ **11.1.4** Add loading skeletons

### 11.2 Performance
- ⏳ **11.2.1** Implement list virtualization
- ⏳ **11.2.2** Lazy load heavy screens
- ⏳ **11.2.3** Optimize image loading
- ⏳ **11.2.4** Profile and fix render issues

### 11.3 Testing
- ⏳ **11.3.1** Write unit tests for services
- ⏳ **11.3.2** Write integration tests for routers
- ⏳ **11.3.3** Write E2E tests for critical flows
- ⏳ **11.3.4** Test offline scenarios

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1: Backend Completion | 16 | ⏳ Pending |
| Phase 2: Mobile Foundation | 18 | ⏳ Pending |
| Phase 3: Core Screens | 30 | ⏳ Pending |
| Phase 4: Workout Features | 13 | ⏳ Pending |
| Phase 5: Training Calendar | 11 | ⏳ Pending |
| Phase 6: Analytics & Health | 14 | ⏳ Pending |
| Phase 7: Running Features | 10 | ⏳ Pending |
| Phase 8: Badge UI | 5 | ⏳ Pending |
| Phase 9: Coach Dashboard | 19 | ⏳ Pending |
| Phase 10: PowerSync | 9 | ⏳ Pending |
| Phase 11: Polish | 11 | ⏳ Pending |
| **TOTAL** | **156** | ⏳ |

---

## Quick Reference: File Locations

### Backend (Existing)
```
apps/backend/src/
├── routers/         # tRPC routers (23 files)
├── services/        # Business logic
├── db/schema/       # Drizzle schemas
└── lib/             # Utilities (Grok, Upstash)
```

### Mobile (To Create)
```
apps/mobile/
├── app/             # Expo Router screens
│   ├── (tabs)/      # Tab navigation
│   ├── (auth)/      # Auth screens
│   ├── (onboarding)/ # Onboarding flow
│   ├── profile/     # Profile screens
│   ├── workout/     # Workout screens
│   ├── calendar/    # Calendar screens
│   ├── program/     # Program screens
│   ├── analytics/   # Analytics screens
│   ├── health/      # Health screens
│   ├── running/     # Running screens
│   ├── badges/      # Badge screens
│   ├── prs/         # PR screens
│   └── _layout.tsx  # Root layout
└── src/
    ├── components/  # UI components
    ├── hooks/       # Custom hooks
    ├── stores/      # Zustand stores
    ├── lib/         # tRPC, PowerSync
    └── theme/       # Theme system
```

### Web (To Create)
```
apps/web/
├── app/             # Next.js App Router
│   ├── (marketing)/ # Landing pages
│   ├── (auth)/      # Auth pages
│   ├── (dashboard)/ # Coach dashboard
│   └── layout.tsx   # Root layout
└── src/
    ├── components/  # UI components
    └── lib/         # tRPC client
```
