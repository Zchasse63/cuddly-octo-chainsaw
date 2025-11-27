# VoiceFit Complete Feature Extraction Specification

**Document Version:** 1.0
**Generated:** November 26, 2025
**Purpose:** Technology-independent specification for rebuilding VoiceFit

---

## EXECUTIVE SUMMARY

### Application Overview

**VoiceFit** is a voice-first fitness tracking application that enables users to log workouts hands-free using natural language voice commands. The platform includes AI-powered coaching, personalized program generation, running tracking with GPS, wearable device integration, and a coach dashboard for managing clients.

### Core Value Proposition

- **Voice-First Logging:** Say "bench press 225 for 8" and it's logged instantly
- **AI Coaching:** Personalized advice based on training history, goals, and health metrics
- **Smart Programs:** AI-generated 12-week periodized training programs
- **Running Tracking:** GPS-based run tracking with pace coaching and badges
- **Health Intelligence:** Wearable data analysis for recovery and performance insights
- **Coach Platform:** Web dashboard for coaches to manage clients and programs

### Target Users

1. **Athletes** - Track strength training and running with voice commands
2. **Premium Users** - Access AI coaching, health analytics, and advanced features
3. **Coaches** - Manage multiple clients, assign programs, monitor progress

---

## SCOPE STATISTICS

| Metric | Count |
|--------|-------|
| **Total Mobile Screens** | 32 |
| **Total Mobile Components** | 101 |
| **Total Web Pages** | 17 |
| **Backend API Endpoints** | 124 |
| **Database Tables** | 45+ |
| **Pydantic Models** | 63 |
| **External Integrations** | 12 |
| **Badge Types** | 90 |
| **User Roles** | 4 |
| **AI Services** | 8 |
| **RAG Namespaces** | 41 |

---

## CURRENT TECHNOLOGY STACK

### Frontend - Mobile App
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.79.6 | Mobile framework |
| Expo | 53.0.0 | Development platform |
| React | 19.0.0 | UI library |
| TypeScript | 5.8.3 | Type safety |
| React Navigation | 6.x | Navigation |
| Zustand | 4.5.7 | State management |
| WatermelonDB | 0.28.0 | Offline database |
| NativeWind | 4.2.1 | Styling (Tailwind) |
| Reanimated | 3.17.4 | Animations |

### Frontend - Web Apps
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.0 | Web framework |
| React | 18.3.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.0 | Styling |
| TanStack Query | 5.x | Server state |
| Zustand | 4.5.0 | Client state |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.120.4 | API framework |
| Python | 3.11 | Runtime |
| Pydantic | 2.12.3 | Validation |
| Uvicorn | 0.38.0 | ASGI server |

### Database & Infrastructure
| Technology | Purpose |
|------------|---------|
| Supabase (PostgreSQL) | Primary database |
| Supabase Auth | Authentication |
| Supabase Storage | File storage |
| Upstash Redis | Caching & sessions |
| Upstash Vector | RAG embeddings |

### AI Services
| Provider | Model | Purpose |
|----------|-------|---------|
| xAI | Grok 4 Fast | Coaching, programs, health analysis |
| Moonshot | Kimi K2 Turbo | Voice parsing |
| OpenAI | GPT-4o-mini | CSV import, synonyms (legacy) |

---

## USER ROLES & PERMISSIONS

### Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Guest** | Unauthenticated visitor | Onboarding, sign up only |
| **Free User** | Basic account | Core features, local AI |
| **Premium User** | Paid subscription | Full features, cloud AI |
| **Coach** | Professional trainer | Client management, program assignment |
| **Admin** | System administrator | Full system access |

### Feature Access Matrix

| Feature | Guest | Free | Premium | Coach |
|---------|-------|------|---------|-------|
| Voice workout logging | ❌ | ✅ | ✅ | ✅ |
| Manual workout logging | ❌ | ✅ | ✅ | ✅ |
| Running with GPS | ❌ | ✅ | ✅ | ✅ |
| Basic analytics | ❌ | ✅ | ✅ | ✅ |
| AI Coach (local) | ❌ | ✅ | ✅ | ✅ |
| AI Coach (cloud) | ❌ | ❌ | ✅ | ✅ |
| Exercise substitution (API) | ❌ | ❌ | ✅ | ✅ |
| Health Intelligence | ❌ | ❌ | ✅ | ✅ |
| Wearable integration | ❌ | ❌ | ✅ | ✅ |
| Injury detection (RAG) | ❌ | ❌ | ✅ | ✅ |
| Client management | ❌ | ❌ | ❌ | ✅ |
| Program import (CSV) | ❌ | ❌ | ❌ | ✅ |
| Bulk client assignment | ❌ | ❌ | ❌ | ✅ |

---

## FEATURE PRIORITY MATRIX

### Phase 1 - MVP (Critical)

| Feature | Description | Complexity |
|---------|-------------|------------|
| User authentication | Email, Apple, Google sign-in | Medium |
| Voice workout logging | Parse voice → structured set data | High |
| Manual workout logging | Form-based set entry | Low |
| Workout history | View past workouts | Low |
| Exercise database | 452 exercises with metadata | Medium |
| Basic dashboard | Home screen with stats | Medium |
| Running with GPS | Track runs with route | High |
| Program scheduling | Weekly workout schedule | Medium |

### Phase 2 - Core Features (High)

| Feature | Description | Complexity |
|---------|-------------|------------|
| AI Coach chat | Q&A with RAG context | High |
| Program generation | AI-generated 12-week programs | High |
| Exercise substitution | Smart exercise alternatives | Medium |
| Volume analytics | Training volume tracking | Medium |
| Readiness check-in | Daily readiness scoring | Low |
| PR tracking | Personal record detection | Medium |
| Badge system | 90 achievement badges | Medium |
| Offline support | WatermelonDB sync | High |

### Phase 3 - Enhanced Features (Medium)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Health Intelligence | AI correlation analysis | High |
| Wearable integration | WHOOP, Terra, HealthKit | High |
| Injury detection | RAG-powered injury analysis | High |
| Fatigue monitoring | Fatigue score calculation | Medium |
| Deload recommendations | AI deload suggestions | Medium |
| Running badges | 40 running achievements | Low |
| Shoe tracking | Running shoe mileage | Low |
| Nutrition tracking | Manual nutrition logging | Medium |

### Phase 4 - Coach Platform (High for B2B)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Client invitations | Email-based coach invite | Medium |
| Client management | View/manage assigned clients | Medium |
| CSV program import | AI schema mapping | High |
| Program quality review | AI program assessment | Medium |
| Bulk assignment | Assign programs to multiple clients | Medium |
| Client analytics | View client metrics | Medium |

### Phase 5 - Nice-to-Have (Low)

| Feature | Description | Complexity |
|---------|-------------|------------|
| Voice capture (live) | Real-time voice recording | High |
| Social features | Leaderboards, sharing | Medium |
| Calendar sync | Apple/Google Calendar | Medium |
| Export functionality | PDF/CSV exports | Low |
| Multi-sport support | Cycling, swimming, etc. | High |

---

## COMPLETE FEATURE CATALOG

### A. Authentication & User Management

#### A1. Email/Password Authentication
- **Priority:** Critical
- **User Roles:** All
- **Description:** Sign up and sign in with email and password
- **Data Collected:** Email, password, full name
- **Validation Rules:**
  - Email: Valid format, unique
  - Password: Minimum 8 characters
  - Name: Required, non-empty
- **Backend Endpoints:**
  - Supabase Auth `/auth/v1/signup`
  - Supabase Auth `/auth/v1/token`

#### A2. Apple Sign-In
- **Priority:** Critical
- **User Roles:** All
- **Description:** OAuth authentication via Apple
- **Data Collected:** Apple ID token, email (optional), name
- **Implementation:** `expo-apple-authentication` → Supabase

#### A3. Google Sign-In
- **Priority:** Critical
- **User Roles:** All
- **Description:** OAuth authentication via Google
- **Data Collected:** Google OAuth token, email, name
- **Implementation:** Supabase OAuth provider flow

#### A4. Session Management
- **Priority:** Critical
- **Description:** JWT token storage and refresh
- **Storage:** SecureStore (mobile), localStorage (web)
- **Token TTL:** Access: 1 hour, Refresh: 30 days

### B. Workout Logging

#### B1. Voice Workout Logging
- **Priority:** Critical
- **User Roles:** Free, Premium, Coach
- **Description:** Parse natural language voice commands into structured workout data
- **Input Examples:**
  - "Bench press 225 for 8"
  - "Same weight for 10"
  - "Squats 315 pounds 5 reps RPE 8"
- **Output:** `{exercise_name, weight, reps, rpe, confidence}`
- **AI Model:** Grok 4 (single provider)
- **Confidence Thresholds:**
  - High (≥0.85): Auto-save enabled
  - Low (<0.70): Show confirmation dialog
- **Session Context:**
  - Tracks current exercise
  - Remembers last weight for "same weight" commands
  - Detects PRs automatically

#### B2. Manual Workout Logging
- **Priority:** Critical
- **User Roles:** Free, Premium, Coach
- **Description:** Form-based set entry with numeric inputs
- **Data Collected:**
  - Exercise name (searchable)
  - Weight (lbs/kg)
  - Reps (integer)
  - RPE (1-10, optional)
  - Notes (optional)
- **Features:**
  - Exercise autocomplete from 452-exercise database
  - Previous weight suggestion
  - Rest timer between sets

#### B3. Workout History
- **Priority:** Critical
- **User Roles:** Free, Premium, Coach
- **Description:** View completed workouts with details
- **Data Displayed:**
  - Workout date and name
  - Total sets, volume (lbs)
  - Exercise breakdown
  - PR indicators
- **Offline Support:** Full history available offline via WatermelonDB

### C. Running Features

#### C1. GPS Run Tracking
- **Priority:** Critical
- **User Roles:** Free, Premium, Coach
- **Description:** Track runs with real-time GPS, pace, and distance
- **Data Collected:**
  - GPS coordinates (every 2-5 seconds)
  - Distance (meters → miles)
  - Duration (seconds)
  - Pace (min/mile)
  - Elevation gain/loss
  - Route polyline
- **Features:**
  - Live map with route visualization
  - Real-time pace updates
  - Pause/resume functionality
  - Stop confirmation dialog

#### C2. Structured Running Workouts
- **Priority:** High
- **Description:** Interval workouts with segment tracking
- **Segment Types:** Warmup, Interval, Recovery, Steady, Cooldown
- **Data per Segment:**
  - Type, duration, distance
  - Target pace
  - Completion status

#### C3. Run Summary
- **Priority:** High
- **Description:** Post-run statistics and analysis
- **Data Displayed:**
  - Total distance, duration, pace
  - Mile-by-mile splits
  - Elevation profile
  - Calories burned
  - Weather conditions (if available)

#### C4. Shoe Tracking
- **Priority:** Medium
- **Description:** Track running shoe mileage
- **Data Collected:**
  - Shoe brand, model
  - Purchase date
  - Total mileage
  - Replacement threshold (default: 400 miles)

### D. AI Coaching

#### D1. AI Coach Chat
- **Priority:** High
- **User Roles:** Premium, Coach
- **Description:** Conversational AI for fitness advice
- **Features:**
  - Natural language Q&A
  - Context-aware responses (training history, injuries, goals)
  - RAG-enhanced answers from knowledge base
  - Message classification for intent routing
- **AI Model:** Grok 4 (temperature: 0.7)
- **RAG Namespaces:** 41 specialized knowledge areas

#### D2. Message Classification
- **Priority:** High
- **Description:** Route messages to appropriate handlers
- **Categories:**
  - `workout_log`: Voice/text workout logging
  - `exercise_swap`: Request exercise substitution
  - `question`: General fitness question
  - `off_topic`: Non-fitness topics (redirect)
  - `general`: Greetings, acknowledgments

#### D3. Exercise Substitution
- **Priority:** High
- **User Roles:** Premium, Coach
- **Description:** AI-ranked exercise alternatives
- **Ranking Criteria:**
  1. Equipment availability
  2. Injury compatibility
  3. Movement pattern similarity
  4. Experience level appropriateness
  5. Goal alignment
- **Output:** Top 5 substitutes with reasoning

### E. Program Generation

#### E1. AI Program Generation
- **Priority:** High
- **User Roles:** Premium, Coach
- **Description:** Generate complete 12-week training programs
- **Input (Questionnaire):**
  - Primary goal (strength, hypertrophy, endurance)
  - Training experience level
  - Weekly frequency (3-6 days)
  - Session duration (minutes)
  - Available equipment
  - Injury history
  - Current lifts (squat, bench, deadlift, OHP)
- **Output:**
  - 12-week periodized program
  - Week-by-week breakdown
  - Daily workouts with exercises
  - Sets, reps, RPE, rest periods
- **AI Model:** Grok 4 (max tokens: 8000)

#### E2. Program Scheduling
- **Priority:** High
- **Description:** Calendar-based workout scheduling
- **Features:**
  - Weekly view (Mon-Sun)
  - Workout status indicators (scheduled, completed, missed)
  - Reschedule functionality
  - Rest day management

### F. Analytics & Health

#### F1. Volume Analytics
- **Priority:** High
- **User Roles:** Premium, Coach
- **Description:** Training volume tracking and trends
- **Metrics:**
  - Weekly volume (sets × reps × weight)
  - Volume by muscle group
  - Week-over-week comparison
  - Trend direction (increasing/stable/decreasing)

#### F2. Fatigue Monitoring
- **Priority:** Medium
- **Description:** Fatigue score calculation
- **Factors:**
  - Training volume spike
  - Recovery score
  - Sleep quality
  - HRV trends

#### F3. Readiness Check-in
- **Priority:** Medium
- **Description:** Daily subjective readiness scoring
- **Input:** Emoji selection (😊 Great, 😐 OK, 😓 Tired)
- **Output:** Readiness score (0-100)
- **Score Mapping:**
  - 😊 → 85%
  - 😐 → 65%
  - 😓 → 45%

#### F4. Health Intelligence
- **Priority:** Medium
- **User Roles:** Premium
- **Description:** AI-discovered health correlations
- **Correlations Analyzed:**
  - Nutrition ↔ Recovery
  - Sleep ↔ Performance
  - Training volume ↔ Recovery
  - Protein ↔ Recovery
- **Time Periods:** 7, 14, 30, 60 days

#### F5. Injury Risk Assessment
- **Priority:** Medium
- **User Roles:** Premium
- **Description:** Predict injury risk from training patterns
- **Risk Factors:**
  - Training load spike (>30% increase)
  - Low recovery (<50%)
  - Poor sleep (<6.5 hours)
  - Low protein (<100g)
  - High strain + low recovery

### G. Wearable Integration

#### G1. WHOOP Integration
- **Priority:** Medium
- **User Roles:** Premium
- **Description:** OAuth connection to WHOOP
- **Data Synced:**
  - Recovery score
  - Sleep (duration, quality, stages)
  - Strain score
  - HRV, resting HR
- **Webhook Support:** Yes

#### G2. Terra Integration
- **Priority:** Medium
- **Description:** Multi-provider wearable aggregator
- **Supported Providers:**
  - Garmin, Fitbit, Oura, Apple Health, Google Fit, Withings, Polar, Suunto
- **Data Types:** Activity, sleep, body, nutrition

#### G3. Apple HealthKit
- **Priority:** Medium
- **Description:** Direct iOS health data integration
- **Data Synced:**
  - Heart rate, HRV, resting HR
  - Steps, active energy
  - Sleep analysis
  - Workouts
  - Nutrition (if tracked)

### H. Badge System

#### H1. Strength Training Badges (30)
- **Workout Count:** 1, 5, 10, 25, 50, 100, 250, 500, 1000 workouts
- **Volume Milestones:** 50K, 100K, 250K, 500K, 1M, 2.5M, 5M, 10M lbs
- **PR Count:** 1, 5, 10, 25, 50, 100, 250, 500 PRs
- **Plate Milestones:** Bench (1/2/3 plate), Squat (2/3/4 plate), Deadlift (3/4/5 plate)
- **Strength Clubs:** 1000-lb club, 1500-lb club

#### H2. Running Badges (40)
- **Distance Milestones:** 1, 10, 50, 100, 250, 500, 1000, 2500 miles
- **Single Run:** 5K, 10K, 15K, Half Marathon, 20 Miler, Marathon, Ultra
- **Speed (5K):** Sub-18, Sub-20, Sub-22, Sub-25, Sub-27, Sub-30
- **Speed (10K):** Sub-40, Sub-45, Sub-50, Sub-55, Sub-60
- **Speed (Mile):** Sub-6, Sub-7, Sub-8, Sub-9, Sub-10
- **Elevation:** 500ft, 1000ft, 2500ft, 5000ft gain
- **Weather:** Rain Runner, Cold Warrior, Heat Champion

#### H3. Streak Badges (12)
- **Workout Streaks:** 7, 14, 30, 60, 100, 365 consecutive days
- **Weekly Consistency:** 4, 12, 26, 52 weeks
- **Run Streaks:** 7, 30, 100 consecutive days

#### H4. Hybrid Badges (8)
- **Cross-Training:** Hybrid Athlete, Iron Runner, Ultimate Athlete
- **Iron Tiers:** Bronze, Gold
- **Program Completion:** 1, 3, 5, 10 programs

### I. Coach Platform

#### I1. Client Invitation
- **Priority:** High
- **User Roles:** Coach
- **Description:** Email-based client invitation system
- **Flow:**
  1. Coach enters client email
  2. System sends invitation email
  3. Client accepts/declines
  4. On accept: Coach gains data access
- **Status:** Pending → Accepted/Declined/Expired

#### I2. Client Management
- **Priority:** High
- **Description:** View and manage assigned clients
- **Features:**
  - Client list with selector
  - View client analytics
  - View client programs
  - View client calendar
  - AI chat about client

#### I3. CSV Program Import
- **Priority:** High
- **Description:** Import training programs from CSV/Excel
- **Workflow:**
  1. Upload file (CSV, XLSX, Google Sheets)
  2. AI detects schema and maps columns
  3. Coach confirms/overrides mappings
  4. AI reviews program quality
  5. Preview program structure
  6. Assign to clients with start dates
- **Quality Metrics:** Volume, progression, balance, exercise selection, rest, deloads

#### I4. Bulk Client Assignment
- **Priority:** Medium
- **Description:** Assign programs to multiple clients at once
- **Features:**
  - Multi-select client list
  - Per-client start date
  - Select All/Deselect All
  - Batch API call

---

## DATABASE SCHEMA SUMMARY

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `user_profiles` | User account data | user_id, user_type, created_at |
| `generated_programs` | AI programs | user_id, name, focus, weeks, status |
| `program_weeks` | Weekly breakdown | program_id, week_number |
| `program_exercises` | Exercises per week | week_id, exercise_name, sets, reps |
| `workout_templates` | Workout definitions | program_id, name, exercises (JSONB) |
| `scheduled_workouts` | Scheduled instances | template_id, scheduled_date, status |
| `workout_logs` | Completed workouts | user_id, exercise_id, weight, reps, rpe |
| `sets` | Individual sets | workout_log_id, weight, reps |
| `runs` | Running activities | user_id, distance, duration, route |
| `running_shoes` | Shoe inventory | user_id, brand, model, total_mileage |

### Health & Analytics Tables

| Table | Purpose |
|-------|---------|
| `readiness_scores` | Daily readiness check-ins |
| `pr_history` | Personal record tracking |
| `injury_logs` | Injury tracking |
| `health_insights` | AI health analysis |
| `health_snapshots` | Daily health summaries |
| `daily_metrics` | Normalized wearable data |
| `sleep_sessions` | Sleep tracking |
| `activity_sessions` | Activity tracking |

### Coach Tables

| Table | Purpose |
|-------|---------|
| `coach_client_invitations` | Invitation system |
| `client_assignments` | Coach-client relationships |
| `coach_profiles` | Coach account data |
| `organizations` | Gym/team accounts |
| `csv_import_jobs` | Import tracking |

### Offline Storage (WatermelonDB)

12 tables synchronized bidirectionally:
- workout_logs, sets, runs
- readiness_scores, pr_history, injury_logs
- user_badges, user_streaks, messages
- programs, workout_templates, scheduled_workouts

---

## API ENDPOINTS SUMMARY

### By Category

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Voice Processing | 6 | Yes |
| Chat & AI | 6 | Yes |
| Program Generation | 3 | Yes |
| Workout Management | 3 | Yes |
| Running | 2 | Yes |
| Analytics | 3 | Yes |
| Health Intelligence | 5 | Yes |
| Injury | 5 | Yes |
| Wearables | 14 | Yes |
| Badges | 6 | Yes |
| Calendar | 5 | Yes |
| Coach | 3 | Yes (Coach) |
| CSV Import | 5 | Yes (Coach) |
| Invitations | 7 | Yes |
| Preferences | 3 | Yes |

### Rate Limiting

| Tier | Default Limit | Expensive Endpoints |
|------|---------------|---------------------|
| Free | 60/hour | 10/minute |
| Premium | 300/hour | 50/minute |
| Admin | 10,000/hour | 10,000/minute |

**Expensive Endpoints:**
- `/api/program/generate/*`
- `/api/coach/ask`
- `/api/injury/analyze`
- `/api/running/analyze`
- `/api/workout/insights`

---

## EXTERNAL INTEGRATIONS SUMMARY

| Service | Purpose | Auth Method |
|---------|---------|-------------|
| Supabase | Database, Auth, Storage | API Key + JWT |
| xAI (Grok 4) | AI coaching, programs | API Key |
| Moonshot (Kimi K2) | Voice parsing | API Key |
| Upstash Redis | Caching, sessions | REST Token |
| Upstash Vector | RAG embeddings | REST Token |
| WHOOP | Wearable data | OAuth 2.0 |
| Terra | Wearable aggregator | OAuth 2.0 |
| Stryd | Running power metrics | OAuth 2.0 |
| Apple HealthKit | iOS health data | Native |
| Google Fit | Android health data | Via Terra |
| OpenWeatherMap | Weather for runs | API Key |
| Amplitude | Analytics | API Key |

---

## TECHNOLOGY-INDEPENDENT REQUIREMENTS

### Non-Negotiable Requirements

1. **Offline-First Architecture**
   - Workouts must be loggable without internet
   - Data syncs when connection restored
   - Conflict resolution: Last-write-wins

2. **Sub-2-Second Voice Parsing**
   - Voice command → structured data in <2s
   - Session context for "same weight" commands
   - Confidence scoring for ambiguous inputs

3. **Secure Token Storage**
   - JWT tokens in hardware-backed secure storage
   - NOT in AsyncStorage or localStorage
   - Automatic token refresh

4. **Real-Time GPS Tracking**
   - Location updates every 2-5 seconds
   - Background location support
   - Battery-efficient implementation

5. **Type Safety End-to-End**
   - TypeScript strict mode
   - Runtime validation (Pydantic/Zod)
   - API type generation

### Recommended Requirements

1. **Streaming AI Responses**
   - Stream coach responses for perceived speed
   - Show typing indicator during generation

2. **Optimistic Updates**
   - Update UI immediately, sync in background
   - Rollback on sync failure

3. **Intelligent Caching**
   - Cache AI responses (24-hour TTL for general)
   - Cache exercise matches (7-day TTL)
   - Cache user context (15-minute TTL)

4. **Progressive Loading**
   - Skeleton screens during data fetch
   - Lazy load heavy components
   - Paginate long lists

---

## DATA MIGRATION CONSIDERATIONS

### Data to Migrate

| Data Type | Volume Estimate | Complexity |
|-----------|-----------------|------------|
| User profiles | 10K+ records | Simple |
| Workout logs | 500K+ records | Simple |
| Sets | 2M+ records | Simple |
| Runs | 50K+ records | Medium (GPS) |
| Programs | 5K+ records | Medium |
| Messages | 100K+ records | Simple |
| Health metrics | 1M+ records | Simple |

### Migration Notes

1. **Exercise Database**
   - 452 exercises with synonyms, muscle groups, equipment
   - Must preserve exercise IDs for history continuity

2. **GPS Routes**
   - JSONB arrays of coordinates
   - Average 500-2000 points per run

3. **Wearable Connections**
   - OAuth tokens are encrypted
   - Users may need to re-authenticate

---

## APPENDICES

### Appendix A: Complete Screen List (Mobile)

1. HomeScreen - Dashboard with stats
2. ChatScreen - AI Coach interface
3. RunScreen - GPS tracking
4. ProfileScreen - User settings
5. ProgramLogScreen - Program view
6. TrainingCalendarScreen - Calendar view
7. OnboardingScreen - New user flow
8. SignInScreen - Login
9. SignUpScreen - Registration
10. WorkoutBuilderScreen - Create running workout
11. RunSummaryScreen - Post-run stats
12. SplitsScreen - Run split times
13. RunSettingsScreen - Run preferences
14. PreferencesScreen - Training preferences
15. NotificationSettingsScreen - Notification control
16. PersonalInfoScreen - Profile editing
17. WearablesScreen - Device connections
18. HealthIntelligenceScreen - AI correlations
19. AnalyticsScreen - Volume/fatigue
20. JournalScreen - Workout/run history
21. PRsScreen - Personal records
22. ExerciseLibraryScreen - Exercise browser
23. NutritionScreen - Nutrition tracking
24. ShoesScreen - Shoe management
25. RecoveryDetailScreen - Recovery insights
26. VolumeDetailScreen - Volume breakdown
27. SupportScreen - Help & privacy
28. ClientSelectorScreen - Coach client picker
29. InviteClientScreen - Coach invitation
30. WorkoutCelebrationScreen - PR celebration
31. StartScreen - App entry
32. Additional modal screens

### Appendix B: Badge Definitions

See Section H for complete 90-badge catalog with unlock criteria.

### Appendix C: Business Rules Reference

See comprehensive business rules extracted including:
- Validation rules for all inputs
- Scoring algorithms (readiness, injury risk, health)
- Badge unlock logic
- Rate limiting configuration
- State machine transitions

### Appendix D: AI Prompts Reference

See `docs/AI_PROMPTS_REFERENCE.md` for all 8 AI service prompts with:
- System prompts
- User prompt templates
- Temperature settings
- Output formats
- Example inputs/outputs

### Appendix E: UI Design System

See `docs/UI_SPECIFICATION.md` for complete design system with:
- Color palettes (light/dark)
- Typography scale
- Spacing system
- Component specifications
- Animation configurations

---

## REVISION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-26 | Initial comprehensive extraction |

---

*This document was generated by analyzing the VoiceFit codebase at `/home/user/voice-fit`*
*Technology choices are intentionally not prescribed to allow optimal stack selection for rebuild*
