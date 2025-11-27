# VoiceFit 2.0 Master Implementation Plan

**Created:** November 26, 2025
**Last Updated:** November 26, 2025
**Status:** Active Development

---

## Executive Summary

This document consolidates all implementation decisions, task lists, and progress tracking for the VoiceFit 2.0 rebuild. It serves as the single source of truth for development.

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

---

## Current Implementation Status

### Backend (85% Complete)

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

### Frontend (15% Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| Theme Provider | ✅ Complete | Light/dark mode |
| UI Components | ⚠️ Basic | Button, Card, Input, Toast |
| Screens | ❌ Not Started | 0 of 32 screens |
| Navigation | ❌ Not Started | Need 3-tab structure |
| tRPC Client | ❌ Not Started | Need to wire up |

### Web Dashboard (0% Complete)

| Page | Status |
|------|--------|
| Landing Page | ❌ Not Started |
| Coach Dashboard | ❌ Not Started |
| Client Management | ❌ Not Started |
| Program Builder | ❌ Not Started |

---

## Missing Features

### High Priority (MVP Blockers)
1. Mobile screens (32 screens)
2. Navigation structure (3 tabs)
3. tRPC client setup
4. PowerSync integration
5. Shoe tracking (backend + frontend)

### Medium Priority
1. Full badge system (90 badges)
2. Health Intelligence AI correlations
3. Drag-and-drop calendar UI
4. Coach web dashboard

### Low Priority (Post-MVP)
1. Multi-sport support
2. Social features UI
3. Calendar sync (Apple/Google)
4. Export functionality

---

## File Structure (Target)

```
apps/
├── mobile/
│   ├── app/                    # Expo Router screens
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
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilities
│   │   ├── stores/             # Zustand stores
│   │   ├── theme/              # Theme system
│   │   └── types/              # TypeScript types
│   └── package.json
├── backend/                    # ✅ Complete
└── web/                        # Coach dashboard (future)
```

---

## Next Steps

See `TASK_LIST.md` for detailed task breakdown with parent/child tasks.

---

## Related Documents

- [TASK_LIST.md](./TASK_LIST.md) - Full task breakdown
- [BADGE_DEFINITIONS.md](./BADGE_DEFINITIONS.md) - All 90 badges
- [SCREEN_INVENTORY.md](./SCREEN_INVENTORY.md) - All 32 mobile screens
- [API_REFERENCE.md](./API_REFERENCE.md) - tRPC router reference
- [../UI_SPECIFICATION.md](../UI_SPECIFICATION.md) - Design system
- [../FEATURE_EXTRACTION_SPECIFICATION.md](../FEATURE_EXTRACTION_SPECIFICATION.md) - Original features
