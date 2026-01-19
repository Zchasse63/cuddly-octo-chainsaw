# VoiceFit 2.0 Full Implementation Prompt

**Purpose:** Zeroshot prompt to complete 100% of VoiceFit 2.0 implementation
**Excludes:** Social features (friends, challenges, leaderboards) - reserved for future phase
**Reference Documents:**
- `docs/audits/FULL_PROJECT_AUDIT.md` - Comprehensive audit findings
- `docs/UI_SPECIFICATION.md` - Design system and component specs

---

## Prompt for Zeroshot

```
Implement the complete VoiceFit 2.0 application based on the comprehensive audit at docs/audits/FULL_PROJECT_AUDIT.md. Follow the UI specification at docs/UI_SPECIFICATION.md for all UI/UX work. This is a MULTI-PHASE IMPLEMENTATION task - you must complete ALL phases below.

IMPORTANT EXCLUSION: Do NOT implement social features (friends list, challenges, leaderboards). These are in apps/mobile/app/friends.tsx, apps/mobile/app/challenges.tsx, apps/mobile/app/leaderboard.tsx and social router social.ts - skip these entirely.

CRITICAL: Follow the UI_SPECIFICATION.md exactly for all colors, typography, spacing, animations, and component styling. Use the design tokens defined there.

## PHASE 1: CRITICAL FOUNDATION (Priority: Highest)

### 1.1 Database Migration - Injuries Table
Create supabase/migrations/20260114_injuries_table.sql with:
- injuries table (id UUID PRIMARY KEY, user_id UUID REFERENCES users, body_part TEXT NOT NULL, severity TEXT CHECK (severity IN ('minor', 'moderate', 'severe')), status TEXT CHECK (status IN ('active', 'recovering', 'resolved')), notes TEXT, started_at TIMESTAMP, resolved_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())
- Indexes on user_id, body_part, status
- RLS policies: users can only access their own injuries
- Verify Drizzle schema at apps/backend/src/db/schema/injuries.ts matches

### 1.2 Fix 11 Failing AI Tests
Fix these failing tests in apps/backend:
1. tools-e2e.integration.test.ts:502 - getUserProfile: Grok returning 0 tool calls
2. tools-e2e.integration.test.ts:516 - getTodaysWorkout: Grok calling wrong tool
3. tools-e2e.integration.test.ts:530 - getRecentWorkouts: Grok returning 0 tool calls
4. tools-e2e.integration.test.ts:533 - searchExercises: Test timeout (60s)
5. tools-e2e.integration.test.ts:558 - getActiveInjuries: Grok returning 0 tool calls
6. tools-e2e.integration.test.ts:561 - getExerciseFormTips: Test timeout (60s)
7. tools-e2e.integration.test.ts:585 - multiple tools: Grok returning 0 tool calls
8. tools-real-workflows.integration.test.ts:468 - AI gathers profile+program: hasRelevantTool = false
9. tools-real-workflows.integration.test.ts:497 - AI retrieves workout history: 0 tool calls
10. ai.test.ts:91 - streamText returning 0 chunks
11. voiceParser.test.ts:79 - parseVoiceCommand timeout (30s)

Root cause: Grok AI model (grok-4-fast) inconsistent tool selection. Solutions:
- Improve tool descriptions with explicit use-case examples
- Add retry logic with exponential backoff for Grok API timeouts
- Add fallback handling when AI returns 0 tool calls
- Consider adding model selection fallback (Claude/GPT-4 as backup)

### 1.3 Create CI/CD Pipeline
Create .github/workflows/test.yml:
- Trigger on push to main, pull_request to main
- Run backend tests: npm test --workspace=backend
- Upload coverage to Codecov
- Block merge if tests fail
- Add status checks required for PR merge

Create .github/workflows/lint.yml:
- Run ESLint across all workspaces
- Run TypeScript type check (npm run build)
- Block merge if linting fails

### 1.4 Add Missing Service Tests
Create test files for untested services:
- apps/backend/src/services/__tests__/fastClassifier.test.ts (10 tests)
- apps/backend/src/services/__tests__/unifiedCoachV2.test.ts (10 tests)
- Verify injuryDetection.ts is deprecated or add tests

## PHASE 2: MOBILE APP FOUNDATION

### 2.1 Configure PowerSync Offline Sync
In apps/mobile/src/lib/powersync.ts:
- Install @powersync/react-native
- Define sync rules for 12 tables: workouts, workout_sets, exercises, runs, run_splits, readiness_logs, injuries, nutrition_logs, shoes, programs, program_workouts, badges
- Implement last-write-wins conflict resolution
- Add connection status UI indicator component
- Add offline mode detection with @react-native-community/netinfo

### 2.2 Fix Theme Tokens
In apps/mobile/src/theme/tokens.ts, add missing tokens per UI_SPECIFICATION.md:
- colors.status.success = '#34C759' (light) / '#30D158' (dark)
- colors.status.error = '#FF3B30' (light) / '#FF453A' (dark)
- colors.status.warning = '#FF9500' (light) / '#FF9F0A' (dark)
- colors.border.default = colors.border.primary
- fontSize['4xl'] = 34
- fontWeight.normal = '400' (alias for regular)

### 2.3 Fix UI Component Types
In apps/mobile/src/components/ui/Button.tsx:
- Add style?: StyleProp<ViewStyle> prop
- Change children type from string to ReactNode

In apps/mobile/src/components/ui/Input.tsx:
- Add autoFocus?: boolean prop

### 2.4 Install Missing Dependencies
Run: pnpm add expo-notifications @react-native-community/netinfo @powersync/react-native --filter mobile
Run: pnpm add -D @types/uuid @types/detox --filter mobile

### 2.5 Complete Authentication Screens
apps/mobile/app/(auth)/login.tsx:
- Integrate Supabase Auth (supabase.auth.signInWithPassword)
- Add form validation (email format, password min 6 chars)
- Add loading state during login
- Add error message display
- Store token with expo-secure-store
- Navigate to home on success

apps/mobile/app/(auth)/signup.tsx:
- Integrate Supabase Auth (supabase.auth.signUp)
- Add Apple/Google OAuth buttons
- Add form validation (email, password min 8 chars with complexity)
- Add terms of service checkbox
- Navigate to onboarding on success

apps/mobile/app/(auth)/forgot-password.tsx:
- Integrate Supabase Auth (supabase.auth.resetPasswordForEmail)
- Add email input with validation
- Add success message and navigation to login

### 2.6 Complete Onboarding Flow
Implement all 10 screens in apps/mobile/app/(onboarding)/:
1. index.tsx - Welcome screen with app intro, "Get Started" button
2. activities.tsx - Activity selection (strength, running, crossfit, hybrid) - multi-select
3. equipment.tsx - Equipment selection (barbell, dumbbells, machines, bands, bodyweight, etc.) - multi-select
4. experience.tsx - Experience level (beginner, intermediate, advanced) - single select
5. frequency.tsx - Training days per week (2-7 days) - slider or buttons
6. goals.tsx - Goals (strength, muscle, endurance, weight loss, performance) - multi-select
7. limitations.tsx - Injury/limitation text input (optional)
8. notifications.tsx - Request notification permissions using expo-notifications
9. voice-tutorial.tsx - Voice logging tutorial with demo recording
10. complete.tsx - Completion celebration with confetti animation

Each screen must:
- Use UI_SPECIFICATION.md colors and typography
- Connect to onboarding tRPC router (api.onboarding.updateProgress)
- Save to Zustand onboarding store
- Show progress indicator (step X of 10)
- Have back/next navigation

## PHASE 3: CORE TAB IMPLEMENTATIONS

### 3.1 Home Tab (60% → 100%)
In apps/mobile/app/(tabs)/index.tsx:
- Build TodaysWorkoutCard component:
  - Show workout name, type, estimated duration
  - Exercise list preview (first 3 exercises)
  - "Start Workout" button
  - Use api.calendar.getTodaysWorkout query
- Build WeeklySummary component:
  - Total workouts this week
  - Total volume (sum of sets × reps × weight)
  - PRs achieved this week
  - Use api.analytics.getWeeklySummary query
- Build RecentActivityList component:
  - FlatList with last 10 workouts/runs
  - Show date, name, volume or distance
  - Use api.workout.getRecent query with infinite scroll
- Build ReadinessPromptModal component:
  - Trigger if no readiness log today
  - Sleep, stress, soreness, motivation sliders (1-10)
  - Submit button → api.readiness.submit mutation
- Style all components per UI_SPECIFICATION.md

### 3.2 Chat Tab (70% → 100%)
In apps/mobile/app/(tabs)/chat.tsx:
- Wire useVoiceRecorder hook to voice router:
  - On recording complete → api.voice.transcribe mutation
  - Parse response and show parsed workout confirmation
- Build WorkoutConfirmationCard component:
  - Show parsed exercise, sets, reps, weight
  - Edit button to modify values
  - Confirm button → api.workout.logSet mutation
- Build ExerciseSubstitutionCard component:
  - Show when AI suggests substitution
  - Original exercise → Substitute exercise
  - Accept/Decline buttons
- Add error handling:
  - Network timeout toast
  - API error toast with retry button
  - Fallback message when AI fails
- Add retry logic for failed messages

### 3.3 Running Tab (40% → 100%)
In apps/mobile/app/(tabs)/run.tsx:
- Implement GPS tracking:
  - Request location permissions (foreground + background)
  - Use Location.watchPositionAsync for live tracking (high accuracy, 5m distance filter)
  - Calculate pace (min/mile), distance (miles), splits (per mile) in real-time
  - Store coordinates array for route polyline
- Build ActiveRunMap component:
  - Install react-native-maps if not present
  - Display user location with animated marker
  - Draw route polyline as user runs
  - Auto-center on user location
- Build RunStatsOverlay component:
  - Current pace (animated update)
  - Total distance (animated update)
  - Elapsed time (formatted MM:SS)
  - Current mile/km split
- Build pause/resume functionality:
  - Pause button stops watching position
  - Resume button restarts watching
  - Track pause duration separately
- Build RunSummaryScreen component:
  - Route map with complete polyline
  - Stats: distance, time, avg pace, elevation gain
  - Splits table (per mile)
  - PR badges if achieved (distance PR, pace PR, longest run)
  - Save button → api.running.saveRun mutation
- Build PreRunSetup component:
  - Shoe selector dropdown (api.shoes.getAll query)
  - Run type picker (easy, tempo, interval, long, recovery, fartlek, hill, race)
  - "Start Run" button

### 3.4 Workout Tab (30% → 100%)
In apps/mobile/app/(tabs)/workout.tsx:
- Build ExerciseSelector component:
  - Search input with debounce (300ms)
  - Query api.exercise.search with search term
  - Autocomplete dropdown with exercise cards
  - Show exercise name, muscle group, equipment
- Build SetLoggingForm component:
  - Weight input with unit toggle (lbs/kg) - persist preference
  - Reps input (numeric keyboard)
  - RPE slider (1-10) with labels
  - Notes text input (optional)
  - Log Set button → api.workout.logSet mutation
- Build VoiceLoggingButton component:
  - Microphone FAB that starts voice recording
  - Visual feedback during recording (pulsing animation)
  - On complete → parse and pre-fill SetLoggingForm
- Build RestTimer component:
  - Countdown timer UI (circular progress)
  - Auto-start after set logged (configurable: 60s, 90s, 120s, 180s)
  - Audio cue at 10s remaining (expo-av)
  - Audio cue at 0s (rest complete)
  - Skip button to end early
- Build PRCelebration component:
  - Detect PR after set logged (compare weight × reps to history)
  - Trigger confetti animation (react-native-reanimated)
  - Haptic feedback (Haptics.notificationAsync('success'))
  - Show PR badge on set card
- Build WorkoutSummary component:
  - Total volume (sets × reps × weight)
  - Total sets, total reps
  - Duration of workout
  - PRs achieved
  - Save Workout button → api.workout.complete mutation

## PHASE 4: WORKOUT & TRAINING FEATURES

### 4.1 Training Calendar
In apps/mobile/app/calendar.tsx:
- Build CalendarWeekView component:
  - 7 days horizontally scrollable
  - Today highlighted (accent color border)
  - Workout icons on scheduled days (dumbbell, running shoe)
  - Completion status colors (green=completed, gray=scheduled, red=missed)
- Build DayDetailSheet component:
  - Bottom sheet on day tap (use @gorhom/bottom-sheet)
  - List all workouts for that day
  - Workout name, type, exercises preview
  - Buttons: Start, View Details, Reschedule, Skip
- Implement drag-and-drop rescheduling:
  - Long press workout card to enable drag
  - Drag to new date
  - Animate movement with react-native-reanimated
  - On drop → api.calendar.reschedule mutation
  - Show confirmation toast

### 4.2 Program Management
In apps/mobile/app/programs.tsx:
- Build ProgramList component:
  - Tabs: Active, Completed, Discover
  - Active: current program card with progress
  - Completed: past programs with completion date
  - Discover: available program templates

In apps/mobile/app/program-detail.tsx:
- Build ProgramDetail component:
  - Program name, type, duration
  - Week-by-week breakdown (accordion)
  - Progress indicator (weeks completed / total)
  - Adherence score (% workouts completed)

In apps/mobile/app/program-questionnaire.tsx:
- Build ProgramQuestionnaire component:
  - Multi-step form (8-10 questions)
  - Questions: goals, experience, days/week, equipment, limitations
  - Submit → api.program.generate mutation
  - Show loading (AI generating)
  - Navigate to program preview

### 4.3 Analytics & Progress
In apps/mobile/app/analytics.tsx:
- Build VolumeChart component:
  - Weekly volume bar chart (last 12 weeks)
  - Use existing GradientBarChart or build with victory-native
- Build MuscleGroupBreakdown component:
  - Pie chart with % volume per muscle group
  - Legend with colors per UI_SPECIFICATION.md
- Build WeeklyComparison component:
  - This week vs last week stats
  - Color-coded (green if up, red if down)

In apps/mobile/app/personal-records.tsx:
- Build PRList component:
  - Group by exercise (SectionList)
  - Show exercise name, current PR, date achieved
  - Filters: all, this month, this year

In apps/mobile/app/health.tsx:
- Build HealthIntelligence component:
  - Correlation cards (Sleep ↔ Performance)
  - Strength indicator (weak, moderate, strong)
  - Time period selector (7, 14, 30, 60 days)
- Build InjuryRiskIndicator component:
  - Risk level badge (low, moderate, high, critical)
  - Risk factors list
  - Recommendations

### 4.4 Workout History
In apps/mobile/app/workout-history.tsx:
- Build WorkoutHistoryList component:
  - FlatList with infinite scroll
  - Date filters (all, this week, this month, 3 months)
  - Show workout name, date, duration, volume, PRs

In apps/mobile/app/workout/[id].tsx:
- Build WorkoutDetail component:
  - Workout metadata (name, date, duration, notes)
  - Exercise breakdown with sets
  - Volume per exercise
  - PR badges

### 4.5 Exercise Library
In apps/mobile/app/exercises.tsx:
- Build ExerciseLibrary component:
  - Search bar with debounce
  - Filters: muscle group, equipment, difficulty
  - Exercise cards with image, name, muscle
  - Sort: name, popularity, recently used

In apps/mobile/app/exercise/[id].tsx:
- Build ExerciseDetail component:
  - Exercise name, image/gif, description
  - Muscles targeted (primary, secondary)
  - Equipment required
  - Form tips
  - Recent history for this exercise
  - PR display
  - Substitute button

## PHASE 5: RUNNING & WEARABLES

### 5.1 Run History
In apps/mobile/app/run-history.tsx:
- Build RunHistoryList component:
  - FlatList with infinite scroll
  - Filters: all, this week, this month, by run type
  - Show date, distance, pace, duration, run type
  - PR badges

In apps/mobile/app/run/[id].tsx:
- Build RunDetail component:
  - Route map with polyline
  - Stats: distance, time, pace, elevation
  - Splits table
  - PR badges
  - Shoe used
  - Notes (editable)

### 5.2 Shoe Tracking
In apps/mobile/app/shoes.tsx:
- Build ShoeList component:
  - Cards with brand, model, mileage
  - Primary shoe indicator (star)
  - Mileage progress bar (0-400 miles)
  - Replacement warning (>400 miles)

In apps/mobile/app/add-shoe.tsx:
- Build AddShoeForm component:
  - Brand input
  - Model input
  - Purchase date picker
  - Initial mileage
  - Primary shoe toggle
  - Submit → api.shoes.create mutation

### 5.3 Workout Builder (Intervals)
In apps/mobile/app/workout-builder.tsx:
- Build IntervalBuilder component:
  - Add segments (warm-up, work, recovery, cool-down)
  - Each segment: distance/duration, target pace
  - Drag to reorder
  - Duplicate/delete buttons
- Build SegmentDisplay component (for active run):
  - Current segment name and number
  - Segment progress
  - Target vs actual pace (color-coded)
  - Next segment preview
- Implement audio cues with expo-av:
  - Text-to-speech for segment transitions
  - Audio at 10s before segment end
  - Pace alerts

### 5.4 Wearables Integration
In apps/mobile/app/integrations.tsx:
- Build AppleHealthCard component:
  - Connect button (request HealthKit permissions)
  - Connected status indicator
  - Last sync timestamp
  - Sync now button
  - Disconnect button
- Build TerraWearablesCard component:
  - List supported devices (Garmin, Fitbit, Oura, Whoop)
  - Connect buttons (OAuth flow)
  - Connected status per device
  - Sync controls

### 5.5 Nutrition Tracking
In apps/mobile/app/nutrition.tsx:
- Build NutritionLogForm component:
  - Meal type selector
  - Food search
  - Quick add macros (calories, protein, carbs, fat)
  - Serving size
- Build DailyNutritionSummary component:
  - Cards: calories, protein, carbs, fat
  - Progress bars vs goals
  - Color-coded status

## PHASE 6: BADGE SYSTEM (No Social)

### 6.1 Define 90 Badge Specifications
Create apps/backend/src/db/seeds/badges.ts with:
- Strength Badges (30): workout count milestones, volume milestones, PR badges, plate milestones
- Running Badges (40): distance milestones, single run achievements, speed badges, elevation, weather warrior
- Streak Badges (12): workout streaks, weekly consistency
- Hybrid Badges (8): cross-training, program completion, adherence, early bird, night owl

Create docs/implementation/BADGE_DEFINITIONS.md with full badge catalog.

### 6.2 Enhance Badge Unlock Service
In apps/backend/src/services/badgeUnlocker.ts:
- Add check triggers after workout/run completion
- Add daily cron job check for streak badges
- Add program completion check
- Fix "hybrid week badge detection" test

### 6.3 Mobile Badge UI
In apps/mobile/app/badges.tsx:
- Build BadgeGrid component:
  - Tabs: All, Strength, Running, Streaks, Hybrid
  - 3-column grid
  - Earned badges in color, locked in grayscale
  - Progress indicator for partial badges
- Build BadgeDetailModal component:
  - Large badge icon
  - Name, description, unlock criteria
  - Earn date or progress
  - Share button
- Build BadgeCelebration component:
  - Trigger after workout when badge unlocked
  - Confetti + scale animation
  - Haptic feedback
  - Toast notification

## PHASE 7: COACH WEB DASHBOARD

### 7.1 Web Foundation
In apps/web/src/lib/trpc.ts:
- Install @trpc/client, @trpc/react-query, @tanstack/react-query
- Create tRPC client with proper API URL
- Add auth token to headers (from localStorage)
- Export typed hooks (api.coach.getClientList.useQuery, etc.)

In apps/web/src/app/providers.tsx:
- Create QueryClientProvider wrapper
- Configure default options
- Wrap app in provider

In apps/web/src/lib/supabase.ts:
- Create Supabase client
- Implement login/signup/logout functions

### 7.2 Authentication Pages
In apps/web/src/app/(auth)/login/page.tsx:
- Integrate Supabase Auth
- Email/password inputs with validation
- Login button with loading state
- Error display
- Remember me checkbox
- Forgot password link
- Redirect to dashboard on success

In apps/web/src/app/(auth)/signup/page.tsx:
- Integrate Supabase Auth
- Form with validation
- Terms checkbox
- Redirect to onboarding on success

### 7.3 Dashboard Pages - Replace ALL Mock Data

apps/web/src/app/dashboard/page.tsx:
- Replace mock with api.coach.getDashboardSummary.useQuery()
- Display real metrics: clients, programs, workouts, messages

apps/web/src/app/dashboard/clients/page.tsx:
- Replace mockClients with api.coach.getClientList.useQuery()
- Real search and filters
- Pagination if >50 clients

apps/web/src/app/dashboard/clients/[id]/page.tsx:
- Fetch client: api.coach.getClientDetail.useQuery()
- Fetch workouts: api.coach.getClientWorkouts.useQuery()
- Fetch program: api.coach.getClientProgram.useQuery()
- Real analytics charts

apps/web/src/app/dashboard/clients/new/page.tsx:
- Build invitation form
- Submit: api.coach.inviteClient.useMutation()

apps/web/src/app/dashboard/analytics/page.tsx:
- Fetch: api.coach.getAnalyticsSummary.useQuery()
- Fetch: api.coach.getAtRiskClients.useQuery()
- Real charts

apps/web/src/app/dashboard/import/page.tsx:
- Build file upload with drag-drop
- CSV parsing and preview
- Column mapping UI
- Submit: api.coach.bulkImportClients.useMutation()

apps/web/src/app/dashboard/programs/page.tsx:
- Fetch: api.coach.getProgramTemplates.useQuery()
- Real template cards

apps/web/src/app/dashboard/programs/new/page.tsx:
- Build program builder UI
- Week/day/workout structure
- Save: api.coach.createProgramTemplate.useMutation()

apps/web/src/app/dashboard/messages/page.tsx:
- Fetch: api.coach.getConversations.useQuery()
- Real message thread display
- Send: api.coach.sendMessage.useMutation()

apps/web/src/app/dashboard/settings/page.tsx:
- Coach profile form
- Save: api.coach.updateProfile.useMutation()

apps/web/src/app/onboarding/page.tsx:
- Multi-step coach onboarding
- Save: api.coach.completeOnboarding.useMutation()

apps/web/src/app/page.tsx:
- Build marketing landing page
- Hero, features, pricing, CTA

### 7.4 Align Web Styling with UI_SPECIFICATION.md
In apps/web/tailwind.config.js:
- Add all colors from UI_SPECIFICATION.md
- Primary, secondary, accent, semantic colors
- Light and dark theme variants

## PHASE 8: TESTING INFRASTRUCTURE

### 8.1 Mobile Test Setup
Create apps/mobile/vitest.config.ts:
- Configure react-native preset
- Add test scripts to package.json

Install testing libraries:
- @testing-library/react-native
- @testing-library/jest-native

Create component tests (10+ files):
- Button.test.tsx, Input.test.tsx, Card.test.tsx, Toast.test.tsx
- QuickSetEditor.test.tsx, CalendarWeekView.test.tsx
- GradientBarChart.test.tsx, ProgressRing.test.tsx
- StatCard.test.tsx, BadgeCard.test.tsx

Create hook tests (4 files):
- useVoiceRecorder.test.ts, useOfflineAware.test.ts
- useAudioCues.test.ts, useLiveActivity.test.ts

Create store tests (4 files):
- auth.test.ts, onboarding.test.ts, profile.test.ts, workout.test.ts

### 8.2 Mobile E2E Testing
Set up Detox:
- Install detox, @types/detox
- Create .detoxrc.js
- Configure iOS simulator and Android emulator

Create E2E tests (5 files):
- auth.e2e.ts - signup, login, logout
- voiceLogging.e2e.ts - record, parse, save
- running.e2e.ts - start, track, save
- readiness.e2e.ts - submit check-in
- aiCoach.e2e.ts - send message, receive response

### 8.3 Web Test Setup
Create apps/web/vitest.config.ts:
- Configure jsdom environment
- Add test scripts

Install testing libraries:
- @testing-library/react
- @testing-library/jest-dom

Create page integration tests (10+ files):
- Login, signup, client list, client detail
- Programs, messaging, dashboard, settings

## PHASE 9: PERFORMANCE & PRODUCTION

### 9.1 Mobile Performance
- Implement React.memo for expensive components
- Install @shopify/flash-list and replace FlatList in long lists
- Add react-native-fast-image for cached images
- Implement code splitting with Expo Router lazy loading
- Install @sentry/react-native for monitoring

### 9.2 Backend Performance
- Add pagination to all list endpoints (default limit: 20)
- Add indexes on frequently queried columns
- Add Redis caching for search results (5 min TTL)
- Implement rate limiting (60/hr free, 300/hr premium, 500/hr coach)

### 9.3 Security Hardening
- Audit all tRPC procedures for authorization checks
- Add rate limiting on auth endpoints (5/15min login, 3/hr signup)
- Add input sanitization (strip HTML, validate formats)
- Verify RLS enabled on all 23 Supabase tables
- Add CSRF protection for web app

### 9.4 Monitoring Setup
- Set up Sentry for backend, mobile, web with source maps
- Set up Winston logging for backend
- Set up Betterstack uptime monitoring
- Add AI cost tracking for xAI API calls

### 9.5 Documentation
- Update README.md with full project overview
- Complete API_REFERENCE.md with all 24 routers and 60 tools
- Create DEPLOYMENT.md with backend/web/mobile deployment guides
- Create TESTING.md with test running and writing guides
- Create MOBILE_DEV_GUIDE.md and WEB_DEV_GUIDE.md

### 9.6 Deployment Setup
- Set up Vercel deployment for web (connect repo, configure build, env vars, custom domain)
- Set up EAS Build for mobile (eas.json, iOS/Android builds, app store submission)
- Create automated database migration script
- Set up staging environment (Supabase, backend, web, mobile builds)
- Create production deployment checklist

## VALIDATION CRITERIA

The implementation is complete when:
1. All 11 failing backend tests pass
2. CI/CD pipeline runs successfully on push/PR
3. Database injuries migration applied successfully
4. All 10 onboarding screens functional
5. GPS running tracking works end-to-end
6. Voice workout logging works end-to-end
7. All 15 web dashboard pages use real tRPC data (no mock data)
8. PowerSync offline sync configured and working
9. 90 badges defined and unlock logic working
10. Mobile has 50+ component/hook/store tests
11. E2E tests pass (auth, voice, running, readiness, AI coach)
12. Web has 20+ page/component tests
13. Bundle sizes within targets (mobile <30MB, web <200KB first load)
14. Sentry and logging configured
15. Staging deployment successful
16. All documentation complete

Run all tests: npm test
Run build: npm run build
Start backend: npm run dev --workspace=backend
Start mobile: npm run start --workspace=mobile
Start web: npm run dev --workspace=web
```

---

## Execution Command

```bash
zeroshot run "Implement the complete VoiceFit 2.0 application based on the comprehensive audit at docs/audits/FULL_PROJECT_AUDIT.md. Follow the UI specification at docs/UI_SPECIFICATION.md for all UI/UX work. This is a MULTI-PHASE IMPLEMENTATION task - you must complete ALL phases below.

IMPORTANT EXCLUSION: Do NOT implement social features (friends list, challenges, leaderboards). These are in apps/mobile/app/friends.tsx, apps/mobile/app/challenges.tsx, apps/mobile/app/leaderboard.tsx and social router social.ts - skip these entirely.

CRITICAL: Follow the UI_SPECIFICATION.md exactly for all colors, typography, spacing, animations, and component styling. Use the design tokens defined there.

[... Full prompt content from above ...]"
```

Note: Due to prompt length, you may need to pass the prompt via file reference or stdin. See Zeroshot Guide for large prompt handling.
