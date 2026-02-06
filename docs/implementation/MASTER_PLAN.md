# VoiceFit 2.0 Master Implementation Plan

**Created:** November 26, 2025
**Last Updated:** February 6, 2026
**Status:** Active Development

---

## Executive Summary

This document consolidates all implementation decisions, task lists, and progress tracking for the VoiceFit 2.0 rebuild. It serves as the single source of truth for development.

> For the full issue inventory and prioritized action plan, see [PROJECT_COMPLETION_ROADMAP.md](../audits/PROJECT_COMPLETION_ROADMAP.md).

---

## Technology Decisions (Final)

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Mobile Framework** | React Native + Expo | Original stack, proven |
| **Offline Support** | PowerSync | Critical requirement, schema ready |
| **State Management** | Zustand | Original stack, lightweight |
| **Animation** | react-native-reanimated 3.x + gesture-handler | Required for drag-and-drop calendar |
| **Navigation** | Expo Router (file-based) | Modern, better DX than React Navigation |
| **Voice AI** | Grok (xAI) | Single provider for all AI |
| **Backend** | tRPC + Drizzle + PostgreSQL | Already implemented |
| **Web** | Next.js 15 + Tailwind + Supabase SSR | Coach dashboard |
| **Search/RAG** | Upstash Search | Already implemented |
| **Database** | Supabase (PostgreSQL) | Already implemented |

---

## UI/UX Decisions (Final)

| Decision | Value |
|----------|-------|
| **Tab Structure** | 3 Tabs: Home - Chat - Run |
| **Profile Location** | Top-right avatar button |
| **Training Calendar** | Drag-and-drop enabled |
| **Design System** | Follow UI_SPECIFICATION.md |
| **CrossFit UI** | Excluded (backend only for now) |
| **Theme** | Dark mode first, light mode supported |

---

## Feature Tiers

### Free Tier
- Voice workout logging
- Manual workout logging
- Basic running with GPS
- Basic analytics
- Workout history
- Exercise database
- Basic badge system

### Premium Tier (Paid)
- AI Program Generation (12-week programs)
- AI Coach (cloud-based)
- Health Intelligence correlations
- Wearable integrations
- Advanced analytics
- Full badge system (90 badges)
- Exercise substitution (AI-powered)
- Injury risk assessment

### Coach Tier
- All Premium features
- Client management
- CSV program import
- Bulk client assignment
- Client analytics
- Web dashboard

---

## Current Implementation Status

### Backend (85% Complete)

25 routers, 284 procedures, 14 services, 60 AI tools, 67 test files.

| Router | Status | Notes |
|--------|--------|-------|
| auth.ts | ✅ Complete | Supabase Auth |
| exercise.ts | ✅ Complete | 452 exercises |
| workout.ts | ✅ Complete | CRUD + PRs |
| voice.ts | ✅ Complete | Grok parsing |
| coach.ts | ✅ Complete | Unified AI interface |
| readiness.ts | ✅ Complete | Daily check-ins |
| program.ts | ✅ Complete | Basic programs |
| calendar.ts | ✅ Complete | Training calendar |
| injury.ts | ✅ Complete | Injury tracking |
| onboarding.ts | ✅ Complete | User setup |
| gamification.ts | ⚠️ Partial | Need 90 badge definitions |
| search.ts | ✅ Complete | Upstash integration |
| conversations.ts | ✅ Complete | Chat history |
| knowledge.ts | ✅ Complete | RAG knowledge base |
| substitutions.ts | ✅ Complete | Exercise alternatives |
| nutrition.ts | ✅ Complete | Via health data |
| running.ts | ✅ Complete | GPS + programs |
| social.ts | ✅ Complete | Friends, challenges |
| analytics.ts | ✅ Complete | Volume, trends |
| wearables.ts | ✅ Complete | Apple Health, Terra |
| devices.ts | ✅ Complete | Device registration |
| wods.ts | ✅ Complete | CrossFit (backend only) |
| shoes.ts | ✅ Complete | Running shoe tracking |
| coachDashboard.ts | ✅ Complete | Coach web dashboard API |

### Mobile App (60-70% Complete)

54 screens, 29 components, 5 Zustand stores, 5 custom hooks, ~58,500 LOC.

| Area | Status | Notes |
|------|--------|-------|
| Theme Provider | ✅ Complete | Light/dark mode, design tokens |
| UI Components (29) | ✅ Complete | Button, Card, Input, Toast, Skeleton, Charts, etc. |
| Navigation | ✅ Complete | 3-tab structure, auth flow, onboarding |
| tRPC Client | ✅ Complete | Wired up with React Query |
| Home Screen | ✅ Complete | Dashboard, readiness, weekly summary |
| Chat / AI Coach | ✅ Complete | Voice + text, tool-based coaching |
| GPS Running | ⚠️ Partial | Map, tracking, but incomplete cleanup |
| Workout Logging | ✅ Complete | Voice + manual, rest timer, PR celebration |
| Training Programs | ✅ Complete | AI generation, browsing, questionnaire |
| Calendar | ⚠️ Partial | Week view, drag support incomplete |
| Analytics | ⚠️ Stub | Screen exists, no content |
| Badges | ✅ Complete | Grid, celebration animation, detail modal |
| PowerSync Offline | ✅ Complete | 11 tables, conflict resolution |
| Auth Guards | ❌ Missing | No redirect based on auth state |
| Push Notifications | ❌ Missing | Configured but not implemented |
| Deep Linking | ❌ Missing | Scheme defined, handlers missing |

### Web Dashboard (85-90% Complete)

14 pages, 10 components, 22 test files, all using live tRPC.

| Page | Status | Notes |
|------|--------|-------|
| Landing Page | ✅ Complete | Marketing, CTAs |
| Login / Signup | ✅ Complete | Supabase auth |
| Onboarding | ✅ Complete | 6-step coach onboarding |
| Dashboard Home | ✅ Complete | Stats, activity, quick actions |
| Clients List | ✅ Complete | Search, filter, status badges |
| Client Detail | ✅ Complete | Workouts, programs, AI health insights |
| New Client | ✅ Complete | Multi-step onboarding wizard |
| Programs List | ✅ Complete | Templates, filtering |
| New Program | ✅ Complete | Manual + AI generation modal |
| Analytics | ✅ Complete | Metrics, charts, AI insights |
| Messages | ✅ Complete | Chat, AI-assisted replies |
| Settings | ⚠️ Partial | Profile/notifications/security done, billing stubbed |
| CSV Import | ✅ Complete | Drag-drop, validation, mapping |

---

## Remaining Work

> See [PROJECT_COMPLETION_ROADMAP.md](../audits/PROJECT_COMPLETION_ROADMAP.md) for the full prioritized action plan.

### High Priority (Pre-Launch)
1. Fix backend build error (trpc/index.ts Headers type cast)
2. Mobile auth guards and deep linking
3. CORS configuration for production
4. Migrate in-memory state to Redis
5. Push notification integration

### Medium Priority
1. Complete mobile analytics screen
2. Complete calendar drag-and-drop
3. Align dependency versions across workspaces
4. Generate missing Supabase migrations (69 tables, only 6 migrations)
5. Web billing tab

### Low Priority (Post-MVP)
1. Multi-sport support
2. Social features UI polish
3. Calendar sync (Apple/Google)
4. Export functionality

---

## File Structure

```
apps/
├── mobile/
│   ├── app/                    # Expo Router screens (54)
│   │   ├── (tabs)/             # Tab navigation
│   │   │   ├── index.tsx       # Home tab
│   │   │   ├── chat.tsx        # Chat tab
│   │   │   └── run.tsx         # Run tab
│   │   ├── (auth)/             # Auth screens
│   │   ├── (onboarding)/       # Onboarding flow
│   │   ├── profile/            # Profile screens
│   │   ├── workout/            # Workout screens
│   │   ├── program/            # Program screens
│   │   ├── calendar/           # Calendar screens
│   │   └── _layout.tsx         # Root layout
│   ├── src/
│   │   ├── components/         # 29 UI components
│   │   ├── hooks/              # 5 custom hooks
│   │   ├── lib/                # tRPC, PowerSync
│   │   ├── stores/             # 5 Zustand stores
│   │   └── theme/              # Theme system
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routers/            # 25 tRPC routers
│   │   ├── services/           # 14 AI/business services
│   │   ├── tools/              # 60 AI tools
│   │   ├── db/schema/          # 24 Drizzle schema files
│   │   └── trpc/               # tRPC setup + middleware
│   └── package.json
└── web/
    ├── src/
    │   ├── app/                # 14 Next.js pages
    │   ├── components/         # 10 UI + feature components
    │   └── lib/                # tRPC, Supabase
    └── package.json
```

---

## Next Steps

See `TASK_LIST.md` for detailed task breakdown with parent/child tasks.

---

## Related Documents

- [PROJECT_COMPLETION_ROADMAP.md](../audits/PROJECT_COMPLETION_ROADMAP.md) - Full audit + action plan (Feb 2026)
- [TASK_LIST.md](./TASK_LIST.md) - Full task breakdown
- [BADGE_DEFINITIONS.md](./BADGE_DEFINITIONS.md) - All 90 badges
- [SCREEN_INVENTORY.md](./SCREEN_INVENTORY.md) - Mobile screens
- [API_REFERENCE.md](./API_REFERENCE.md) - tRPC router reference
- [../TOOL_CATALOG.md](../TOOL_CATALOG.md) - 60 AI tools with full specs
- [../UI_SPECIFICATION.md](../UI_SPECIFICATION.md) - Design system
