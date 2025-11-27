# VoiceFit Mobile Screen Inventory

**Total Screens:** 32
**Tab Structure:** 3 Tabs (Home - Chat - Run) + Profile Avatar

---

## Navigation Structure

```
Root (_layout.tsx)
├── (auth)/                    # Unauthenticated
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── forgot-password.tsx
├── (onboarding)/              # New user flow
│   ├── welcome.tsx
│   ├── experience.tsx
│   ├── goals.tsx
│   ├── frequency.tsx
│   ├── equipment.tsx
│   ├── injuries.tsx
│   ├── voice-tutorial.tsx
│   └── complete.tsx
├── (tabs)/                    # Main app (3 tabs)
│   ├── index.tsx              # Home tab
│   ├── chat.tsx               # Chat tab
│   └── run.tsx                # Run tab
├── profile/                   # Profile (from avatar)
│   ├── index.tsx
│   ├── personal-info.tsx
│   ├── preferences.tsx
│   ├── notifications.tsx
│   ├── wearables.tsx
│   └── support.tsx
├── workout/                   # Workout screens
│   ├── active.tsx
│   ├── history.tsx
│   ├── [id].tsx               # Workout detail
│   └── exercises.tsx
├── calendar/                  # Calendar screens
│   ├── index.tsx
│   └── day/[date].tsx
├── program/                   # Program screens
│   ├── index.tsx
│   ├── [id].tsx               # Program detail
│   └── questionnaire.tsx
├── analytics/                 # Analytics screens
│   ├── index.tsx
│   ├── volume.tsx
│   └── fatigue.tsx
├── health/                    # Health screens
│   ├── index.tsx
│   └── recovery.tsx
├── running/                   # Running screens
│   ├── history.tsx
│   ├── [id].tsx               # Run detail
│   ├── shoes.tsx
│   └── workout-builder.tsx
├── badges/                    # Badge screens
│   └── index.tsx
└── prs/                       # PR screens
    └── index.tsx
```

---

## Screen Details

### Authentication Screens (3)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Sign In | `(auth)/sign-in.tsx` | Email + Apple/Google login | Critical |
| Sign Up | `(auth)/sign-up.tsx` | Create new account | Critical |
| Forgot Password | `(auth)/forgot-password.tsx` | Password reset flow | Critical |

### Onboarding Screens (8)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Welcome | `(onboarding)/welcome.tsx` | App intro, value props | Critical |
| Experience | `(onboarding)/experience.tsx` | Training experience level | Critical |
| Goals | `(onboarding)/goals.tsx` | Primary/secondary goals | Critical |
| Frequency | `(onboarding)/frequency.tsx` | Days per week, duration | Critical |
| Equipment | `(onboarding)/equipment.tsx` | Available equipment | Critical |
| Injuries | `(onboarding)/injuries.tsx` | Current/past injuries | Critical |
| Voice Tutorial | `(onboarding)/voice-tutorial.tsx` | How to use voice logging | High |
| Complete | `(onboarding)/complete.tsx` | Success, start app | Critical |

### Main Tab Screens (3)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Home | `(tabs)/index.tsx` | Dashboard, stats, today's workout | Critical |
| Chat | `(tabs)/chat.tsx` | AI Coach interface, voice input | Critical |
| Run | `(tabs)/run.tsx` | GPS tracking, pre-run setup | Critical |

### Profile Screens (6)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Profile Index | `profile/index.tsx` | Profile overview, settings list | High |
| Personal Info | `profile/personal-info.tsx` | Edit name, avatar, etc. | High |
| Preferences | `profile/preferences.tsx` | Units, theme, training prefs | High |
| Notifications | `profile/notifications.tsx` | Push notification settings | Medium |
| Wearables | `profile/wearables.tsx` | Apple Health, Terra connections | High |
| Support | `profile/support.tsx` | Help, privacy, logout | Medium |

### Workout Screens (4)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Active Workout | `workout/active.tsx` | Log sets, voice input, rest timer | Critical |
| Workout History | `workout/history.tsx` | Past workouts list (Journal) | High |
| Workout Detail | `workout/[id].tsx` | Single workout breakdown | High |
| Exercise Library | `workout/exercises.tsx` | Browse 452 exercises | Medium |

### Calendar & Program Screens (4)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Training Calendar | `calendar/index.tsx` | Week view, drag-and-drop | High |
| Day Detail | `calendar/day/[date].tsx` | Single day workouts | High |
| Program Overview | `program/index.tsx` | Active program view | High |
| Program Questionnaire | `program/questionnaire.tsx` | AI program generation flow | High |

### Analytics & Health Screens (5)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Analytics Index | `analytics/index.tsx` | Volume, trends overview | Medium |
| Volume Detail | `analytics/volume.tsx` | Detailed volume breakdown | Medium |
| Fatigue | `analytics/fatigue.tsx` | Fatigue score, training load | Medium |
| Health Index | `health/index.tsx` | Health Intelligence correlations | Medium |
| Recovery Detail | `health/recovery.tsx` | Recovery insights | Medium |

### Running Screens (4)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Run History | `running/history.tsx` | Past runs list | High |
| Run Detail | `running/[id].tsx` | Single run with map, splits | High |
| Shoes | `running/shoes.tsx` | Shoe management | Medium |
| Workout Builder | `running/workout-builder.tsx` | Create interval workouts | Medium |

### Badge & PR Screens (2)

| Screen | File | Description | Priority |
|--------|------|-------------|----------|
| Badges | `badges/index.tsx` | All 90 badges, progress | Medium |
| PRs | `prs/index.tsx` | Personal records list | High |

---

## Component Mapping

### Home Tab Components
- `StatsOverview` - Weekly stats cards
- `TodayWorkoutCard` - Today's scheduled workout
- `WeeklySummary` - Week at a glance
- `RecentActivity` - Last 5 activities
- `ReadinessPrompt` - Daily check-in
- `QuickActions` - Start workout, log run buttons

### Chat Tab Components
- `ChatMessageList` - Scrollable message history
- `ChatBubble` - User/AI message bubble
- `TextInput` - Message composition
- `VoiceButton` - Hold to record
- `TypingIndicator` - AI is responding
- `WorkoutConfirmation` - Confirm logged set
- `SubstitutionCard` - Exercise alternatives
- `QuestionnaireFlow` - Program generation Q&A

### Run Tab Components
- `PreRunScreen` - Shoe, workout type selection
- `ActiveRunMap` - MapView with route
- `RunStatsOverlay` - Pace, distance, time
- `RunControls` - Pause, resume, stop
- `RunSummary` - Post-run stats
- `SplitsTable` - Mile-by-mile splits

### Shared Components
- `Header` - Screen header with avatar
- `TabBar` - Bottom 3-tab navigation
- `Card` - Content card
- `Button` - Primary/secondary buttons
- `Input` - Text input fields
- `Modal` - Bottom sheet modals
- `Skeleton` - Loading placeholders
- `Badge` - Badge display
- `Chart` - Volume/progress charts

---

## Screen Priority Matrix

| Priority | Count | Screens |
|----------|-------|---------|
| Critical | 15 | Auth (3), Onboarding (7), Tabs (3), Active Workout (1), Run (1) |
| High | 12 | Profile (4), Workout (3), Calendar (2), Running (2), PRs (1) |
| Medium | 5 | Analytics (3), Badges (1), Exercises (1) |

---

## UI Specification Reference

All screens follow the design system in `UI_SPECIFICATION.md`:

- **Colors:** Light/dark theme with semantic colors
- **Typography:** SF Pro (iOS), system font weights
- **Spacing:** 8pt grid system
- **Shadows:** iOS-style shadows
- **Animations:** react-native-reanimated spring physics
- **Haptics:** Selection, impact, notification feedback
