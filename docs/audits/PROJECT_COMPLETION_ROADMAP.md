# VoiceFit 2.0 - Project Completion Roadmap

> **Generated**: February 6, 2026
> **Previous Audit**: January 13, 2026
> **Scope**: Full-spectrum audit across backend, mobile, web, database, documentation, AI, and infrastructure

---

## 1. Current State Summary

### Overall Health Dashboard

| Area | Completion | Quality | Trend (vs Jan 13) |
|------|-----------|---------|-------------------|
| **Backend** | 85% | 7.2/10 | Stable |
| **Mobile** | 60-70% | 7.5/10 | Up from 30% |
| **Web Dashboard** | 85-90% | 8.5/10 | Up from 5% |
| **Database** | 80% | 6.5/10 | Stable (gaps remain) |
| **AI System** | 90% | 8/10 | Stable |
| **Documentation** | 70% | 7.2/10 | Improved |
| **Infrastructure** | 55% | 5/10 | New concerns |

### What Works

- **25 backend routers** with 284 tRPC procedures, Zod validation, rate limiting, and feature flagging
- **60 AI tools** (35 athlete + 25 coach) with typed schemas and RBAC via xAI Grok models
- **14 web dashboard pages** fully implemented with live tRPC integration (no mock data)
- **54 mobile screens** with 29 components, 5 Zustand stores, theme system, and NativeWind styling
- **69 database tables** across 24 Drizzle schema files with comprehensive domain coverage
- **Supabase auth** working on web (middleware-protected) and mobile (SecureStore persistence)
- **67 backend test files**, 22 web test files, Vitest configured across all workspaces
- **PowerSync** offline support with 11 sync tables and conflict resolution
- **Voice recording** pipeline end-to-end: speech recognition -> parsing -> confirmation

### What Doesn't Work

- **Backend build is broken** - TypeScript error in `trpc/index.ts:26` (Headers type cast)
- **React 19 incompatibility** - `lucide-react-native@0.400.0` rejects React 19
- **11 backend tests failing** - Grok AI model tool selection inconsistency
- **No auth guards** in mobile root layout (both auth/main screens accessible)
- **Missing coach tab screen** - route defined but no `coach.tsx` file exists
- **In-memory session state** in voice router (lost on restart, won't scale)
- **CORS hardcoded to localhost** - blocks any deployed environment
- **Migration gap** - 69 tables in schema, only 6 Supabase migrations

---

## 2. Issue Inventory

### CRITICAL (Build Breakers & Data Loss Risks)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| C1 | **Backend TypeScript build error** - Headers type cast fails TS2352 | `apps/backend/src/trpc/index.ts:26` | Build fails entirely, blocks deployment |
| C2 | **React 19 peer dependency conflict** - lucide-react-native rejects React 19 | `apps/mobile/package.json` | Mobile may crash at runtime |
| C3 | **Voice session state in memory** - Map() instead of Redis | `apps/backend/src/routers/voice.ts:8-17` | Data loss on restart, no horizontal scaling |
| C4 | **voiceParser silent failure** - catch block has no return statement | `apps/backend/src/services/voiceParser.ts:99-115` | Function returns undefined, runtime errors |
| C5 | **aiCoach silent failure** - same catch-no-return pattern | `apps/backend/src/services/aiCoach.ts:78-85` | Classification breaks silently |
| C6 | **Migration/schema desync** - 69 tables in Drizzle, only 6 migrations | `supabase/migrations/` | Fresh DB deploy missing most tables |

### HIGH (Pre-Launch Blockers)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| H1 | **CORS origins hardcoded to localhost** | `apps/backend/src/index.ts:14-16` | Cannot deploy to any environment |
| H2 | **No .env validation on startup** | Backend entry point | Server starts with missing keys, fails later |
| H3 | **API URL defaults to localhost** in mobile tRPC client | `apps/mobile/src/lib/trpc.ts:11` | Production builds fail silently |
| H4 | **No auth guard redirects** in mobile root layout | `apps/mobile/app/_layout.tsx:25-81` | Users see both auth & main screens |
| H5 | **Missing coach tab screen** - route defined, no file | `apps/mobile/app/(tabs)/_layout.tsx:120-124` | Navigation 404 |
| H6 | **Type-unsafe header handling** | `apps/backend/src/trpc/index.ts:24-26` | Runtime type errors possible |
| H7 | **SQL injection risk** - raw string interpolation in exercise search | `apps/backend/src/routers/exercise.ts:94` | Security vulnerability |
| H8 | **API key not validated** - XAI_API_KEY uses non-null assertion | `apps/backend/src/lib/ai.ts:28` | Delayed failure detection |
| H9 | **Missing deep link configuration** in mobile root layout | `apps/mobile/app/_layout.tsx` | OAuth callbacks and external links break |
| H10 | **Silent PowerSync errors** - logged but not surfaced to UI | `apps/mobile/src/lib/powersync.ts:318-341` | Users unaware sync is failing |
| H11 | **Program generation timeout mismatch** - defined at 5min, SDK uses 2min default | `apps/backend/src/services/programGenerator.ts` | Long generations timeout |
| H12 | **Supabase SDK version mismatch** - web@2.90.1, backend/mobile@2.45.0 | Cross-workspace | Type incompatibilities |
| H13 | **Vitest version mismatch** - web@2.0.0, backend/mobile@4.0.14 | Cross-workspace | Inconsistent test behavior |

### MEDIUM (Quality & Maintenance)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| M1 | In-memory cache in coachDashboard (unbounded Map) | `apps/backend/src/routers/coachDashboard.ts:26` | Memory leak |
| M2 | Rate limit anon users by path, not IP | `apps/backend/src/trpc/index.ts:92-94` | Distributed abuse |
| M3 | 4 different coach implementations (legacy cruft) | `apps/backend/src/services/` | Maintenance burden |
| M4 | `as any` type escapes (10+ in mobile, 3+ in backend) | Various | Type safety regression |
| M5 | 19 console.log statements in mobile production code | Various mobile files | Console spam in prod |
| M6 | Missing CHECK constraints on score fields (1-10 ranges) | Database schema | Invalid data possible |
| M7 | Missing FK constraint on `workouts.programId` | `apps/backend/src/db/schema/workouts.ts:24` | Orphaned records |
| M8 | `weightUnit` is text instead of enum | `apps/backend/src/db/schema/workouts.ts:42` | Bad data quality |
| M9 | tRPC 11.0.0-rc.446 (release candidate, not stable) | All workspaces | Breaking changes risk |
| M10 | AI SDK outdated (@ai-sdk/xai@2.0.39, latest 3.0.47) | `apps/backend/package.json` | Missing features/fixes |
| M11 | Documentation/schema gap (41 documented vs 69 actual tables) | `docs/SUPABASE_DATABASE_SCHEMA_REPORT.md` | Confusing reference |
| M12 | Two README files at root (README.md + README-2.md) | Project root | Confusing onboarding |
| M13 | Supabase migration timestamp format inconsistency | `supabase/migrations/` | Migration ordering issues |
| M14 | Orphaned test files in project root | Root: `test-*.mjs` | Poor organization |
| M15 | `@typescript-eslint` version split (7.x vs 8.x) | Backend vs mobile/web | Inconsistent linting |
| M16 | Connection pool max=10 may be insufficient | `apps/backend/src/db/index.ts` | Perf under load |
| M17 | Push notifications configured but not implemented | `apps/mobile/app.json:47` | Feature gap |
| M18 | 4 future coach tools are stubs returning dummy data | `apps/backend/src/tools/coach/future.ts` | Misleading AI capabilities |
| M19 | Magic number (Epley formula constant `30`) hardcoded in 2 places | `voice.ts:109`, `workout.ts:9` | Maintainability |
| M20 | Billing tab stubbed with placeholder content | `apps/web/src/app/dashboard/settings/page.tsx:466` | Feature gap |

---

## 3. Documentation Status

### Inventory (33 markdown files audited)

| Classification | Count | Action |
|---------------|-------|--------|
| **Keep & Update** | 15 | Actively maintained, need periodic refresh |
| **Keep As-Is** | 3 | Accurate and complete |
| **Consolidate** | 2 | Merge into related docs |
| **Archive** | 6 | Move to /archive/ |
| **Delete** | 0 | None truly useless |

**Overall Score: 7.2/10**

### Key Documents

| Document | Status | Notes |
|----------|--------|-------|
| `MASTER_PLAN.md` | Keep & Update | Completion percentages outdated (says Web 0%, actually 85%) |
| `TASK_LIST.md` | Keep & Update | 156 tasks, ALL marked pending (not updated since Nov 2025) |
| `TOOL_CATALOG.md` | Keep As-Is | 60 AI tools fully documented, matches implementation |
| `UI_SPECIFICATION.md` | Keep As-Is | Complete design system, actively used |
| `SUPABASE_DATABASE_SCHEMA_REPORT.md` | Keep & Update | Documents 41 tables, schema has 69 |
| `API_REFERENCE.md` | Keep & Update | High-level, needs endpoint detail and verification |
| `TYPE_CHECK_ERRORS.md` | Keep & Update | Says 0 errors, but build currently broken |

### Consolidation Required

1. **README.md + README-2.md** -> Single authoritative README
2. **OpenAI SDK Migration.md + TOOL_CALLING_MIGRATION_PLAN.md** -> Single migration doc

### Archive Required

- `ARCHITECTURE_DEEP_DIVE.md` (superseded by implementation)
- `BUILD_INSTRUCTIONS.md` (may be stale)
- `COMPLETE_REBUILD_PLAN.md` (superseded by MASTER_PLAN)
- `TECH_STACK_RECOMMENDATIONS.md` (decisions finalized)
- `VOICEFIT_2.0_IMPLEMENTATION_PLAN.md` (superseded by TASK_LIST)
- `CHUNKED_IMPLEMENTATION_PLAN.md` (superseded by TASK_LIST)

### Missing Documentation

1. **Setup & Onboarding Guide** - New developer setup, .env config, local dev workflow
2. **Mobile Development Guide** - Adding screens, component patterns, state management
3. **Deployment & Operations** - Staging/prod config, database migration procedures
4. **Testing Guide** - Test patterns, fixtures, E2E setup

---

## 4. Structural Changes Recommended

### File Organization

| Change | From | To | Reason |
|--------|------|-----|--------|
| Move orphaned test scripts | Root `test-*.mjs` | `scripts/debug/` or delete | Wrong location |
| Consolidate READMEs | `README.md` + `README-2.md` | Single `README.md` | Duplication |
| Archive outdated docs | 6 files in `/docs/` | `/docs/archive/` | Stale content |
| Remove duplicate migration doc | OpenAI SDK migration | Merge into Tool Calling Plan | Redundancy |

### Dependency Alignment

| Package | Current State | Target | Priority |
|---------|--------------|--------|----------|
| `@supabase/supabase-js` | 2.45.0 (backend/mobile), 2.90.1 (web) | Latest across all | HIGH |
| `vitest` | 2.0.0 (web), 4.0.14 (backend/mobile) | 4.x across all | HIGH |
| `typescript` | 5.3.0-5.5.0 mixed | 5.5.x across all | MEDIUM |
| `@typescript-eslint` | 7.x (backend), 8.x (mobile/web) | 8.x across all | MEDIUM |
| `@ai-sdk/xai` | 2.0.39 | 3.x (latest) | MEDIUM |
| `ai` | 5.0.108 | 6.x (latest) | MEDIUM |
| `lucide-react-native` | 0.400.0 (rejects React 19) | Latest React 19-compatible | CRITICAL |
| `drizzle-orm` / `drizzle-kit` | 0.33.0 / 0.24.0 | 0.45.x / 0.31.x | LOW |

### Configuration Fixes

- Web `tsconfig.json` target ES2017 -> ES2020+ (too old for Next.js 15)
- Add root `.eslintrc` for cross-workspace consistency
- Fix Supabase migration timestamp formats (some missing time component)
- Remove root-level `@react-native-segmented-control` and `react-native-worklets-core` dependencies (misplaced)

---

## 5. Prioritized Action Plan

### Phase 0: Unblock Build (Immediate - Day 1)

| Task | Effort | Files |
|------|--------|-------|
| Fix TS2352 in `trpc/index.ts:26` - cast through `unknown` or refactor | 15 min | 1 file |
| Fix voiceParser.ts catch block - add return statement | 10 min | 1 file |
| Fix aiCoach.ts catch block - add return statement | 10 min | 1 file |
| Resolve lucide-react-native React 19 conflict | 30 min | 1 file |

**Definition of done**: `npm run build` succeeds, `npm run test` passes (minus known AI flakes)

### Phase 1: Critical Security & Production Readiness (Week 1)

| Task | Effort | Files |
|------|--------|-------|
| CORS origins from `process.env.ALLOWED_ORIGINS` | 30 min | 1 file |
| Add .env validation schema on backend startup | 1 hr | 1-2 files |
| Remove localhost fallback in mobile tRPC client | 15 min | 1 file |
| Migrate voice sessionState to Redis with TTL | 2 hr | 1 file |
| Migrate coachDashboard insightsCache to Redis | 1 hr | 1 file |
| Fix SQL injection risk in exercise router | 30 min | 1 file |
| Add IP-based rate limiting for anon users | 1 hr | 1 file |
| Add deep link configuration to mobile root layout | 1 hr | 1 file |

### Phase 2: Mobile Navigation & Auth (Week 2)

| Task | Effort | Files |
|------|--------|-------|
| Implement auth guard redirects in `_layout.tsx` | 2 hr | 1 file |
| Create or remove coach tab route | 1 hr | 1-2 files |
| Surface PowerSync errors to UI (toast/badge) | 1 hr | 2 files |
| Implement push notification integration | 4 hr | 3-4 files |
| Fix 10+ `as any` type annotations in mobile | 2 hr | 6-8 files |
| Replace 19 console.log with proper error tracking | 2 hr | 10+ files |
| Complete dynamic route stubs ([id] screens) | 4 hr | 4 files |

### Phase 3: Dependency & Config Alignment (Week 2-3)

| Task | Effort | Files |
|------|--------|-------|
| Align Supabase SDK versions across workspaces | 1 hr | 3 files |
| Align vitest versions (web 2.x -> 4.x) | 1 hr | 1 file |
| Align TypeScript versions | 30 min | 3 files |
| Align @typescript-eslint versions | 30 min | 3 files |
| Update AI SDK to latest stable (@ai-sdk/xai 3.x, ai 6.x) | 2 hr | 1 file + test fixes |
| Pin tRPC to stable v11 release (when available) | 30 min | 3 files |

### Phase 4: Database & Data Integrity (Week 3-4)

| Task | Effort | Files |
|------|--------|-------|
| Generate migrations for all 69 tables using Drizzle Kit | 4 hr | Multiple migration files |
| Add missing FK constraints (exercises, prHistory, workouts) | 2 hr | Schema files |
| Add CHECK constraints for score/percentage fields | 2 hr | Schema files |
| Add unique constraints (exercises.normalizedName, phoneticKey) | 1 hr | Schema files |
| Remove duplicate `templateId` column in trainingPrograms | 30 min | 1 file |
| Fix migration timestamp formats | 30 min | 2 files |
| Add timestamps to tables missing created_at/updated_at | 1 hr | 3-4 schema files |

### Phase 5: Backend Quality (Week 4)

| Task | Effort | Files |
|------|--------|-------|
| Standardize error handling to TRPCError everywhere | 3 hr | 10+ routers |
| Remove `as any` type assertions in routers | 2 hr | 5+ files |
| Consolidate 4 coach implementations after V2 rollout | 4 hr | 4 files |
| Add structured logging (JSON format) | 2 hr | 2-3 files |
| Implement program timeout properly (use 5min value) | 30 min | 1 file |
| Remove/implement 4 stub future tools | 1 hr | 1 file |
| Extract Epley formula to shared constant | 15 min | 2 files |

### Phase 6: Documentation & Cleanup (Week 4-5)

| Task | Effort | Files |
|------|--------|-------|
| Consolidate README files | 1 hr | 2 files |
| Archive 6 outdated docs | 30 min | 6 files |
| Merge duplicate migration docs | 30 min | 2 files |
| Update MASTER_PLAN.md completion percentages | 1 hr | 1 file |
| Update TASK_LIST.md with actual completion states | 2 hr | 1 file |
| Regenerate DB schema report (41 -> 69 tables) | 2 hr | 1 file |
| Create Setup Guide (new) | 2 hr | 1 new file |
| Create Mobile Development Guide (new) | 2 hr | 1 new file |
| Update CLAUDE.md to match current state | 1 hr | 1 file |
| Clean up orphaned test-*.mjs files from root | 15 min | 3 files |
| Clean up stale remote branches | 15 min | Git |

### Phase 7: Web Dashboard Polish (Week 5-6)

| Task | Effort | Files |
|------|--------|-------|
| Implement billing tab or finalize "coming soon" UX | 4 hr | 1 file |
| Wire up non-functional UI buttons (filters, actions) | 3 hr | 5+ files |
| Implement 2FA setup flow | 4 hr | 2 files |
| Add language/timezone onChange handlers | 1 hr | 1 file |
| Improve modal close behavior (click outside) | 30 min | 1 file |
| Revenue metric from API (currently hardcoded $0) | 1 hr | 1 file |

### Phase 8: Testing & CI (Week 6-7)

| Task | Effort | Files |
|------|--------|-------|
| Fix 11 failing backend AI tests (Grok tool selection) | 4 hr | 4 test files |
| Add mobile unit tests (target 60%+ coverage) | 8 hr | 20+ new files |
| Add E2E tests via Detox (setup present) | 8 hr | 5+ new files |
| Add mobile/web tests to CI pipeline | 2 hr | 2 workflow files |
| Fix or mock tRPC router mismatch in mobile tests | 3 hr | Multiple files |

---

## 6. Completion Criteria

### Definition of "Production Ready" (v2.0 Launch)

**Build & Deploy**
- [ ] `npm run build` succeeds with zero errors across all workspaces
- [ ] All environment variables validated on startup
- [ ] CORS configured for production origins
- [ ] CI/CD pipeline green for all workspaces (lint, type-check, test, build)

**Backend**
- [ ] Zero CRITICAL or HIGH security findings
- [ ] All tRPC endpoints return proper TRPCError codes
- [ ] Session/cache state in Redis (not in-memory)
- [ ] Rate limiting functional for all tiers (auth, general, AI, search)
- [ ] AI tool calling works reliably (>95% tool selection success)

**Mobile**
- [ ] Auth guard redirects working (unauthenticated -> login)
- [ ] All 3 visible tabs functional with real data
- [ ] Voice logging end-to-end: record -> parse -> confirm -> save
- [ ] Deep linking for OAuth callbacks working
- [ ] Push notifications configured and sending
- [ ] PowerSync offline mode functional with error surfacing
- [ ] No React 19 peer dependency warnings at startup
- [ ] Zero `as any` in navigation/routing code

**Web Dashboard**
- [ ] All 14 pages rendering with live tRPC data
- [ ] Auth flow complete (login, signup, onboarding, session refresh)
- [ ] Coach can manage clients, programs, messages, analytics
- [ ] AI features (program generation, health insights) functional

**Database**
- [ ] All tables have corresponding migrations
- [ ] FK constraints enforced on critical relationships
- [ ] Schema documentation matches actual table count
- [ ] Demo data seeded and accessible

**Testing**
- [ ] Backend: >80% coverage, zero failing tests (AI flakes excluded from required)
- [ ] Web: All pages have smoke tests
- [ ] Mobile: Core flows covered (auth, workout log, voice parse)

**Documentation**
- [ ] CLAUDE.md reflects current architecture
- [ ] README has correct setup instructions
- [ ] No outdated docs in active directories
- [ ] API reference matches implementation

---

## Appendix: Metrics Summary

### Code Volume

| Workspace | Lines of Code | Files | Test Files |
|-----------|--------------|-------|------------|
| Backend | ~30,000 | 100+ | 67 |
| Mobile | ~58,544 | 110+ | 0 (gap) |
| Web | ~8,000 | 45+ | 22 |
| **Total** | **~96,500** | **255+** | **89** |

### Backend Router Coverage

- **25 routers** exporting **284 procedures**
- Rate limiting: 4 tiers (general 100/min, AI 20/hr, auth 10/15min, search 60/min)
- Auth: protectedProcedure middleware on all sensitive endpoints
- Validation: Zod schemas on all inputs

### AI System

- **60 tools**: 35 athlete + 25 coach (4 future stubs)
- **4 Grok models**: grok-4-1-fast-reasoning, grok-4-fast, grok-3-fast, grok-3-mini-fast
- **Feature flagged**: V2 tool-based coaching with gradual rollout
- **Known issue**: Grok model occasionally fails to select tools in complex scenarios

### Database

- **69 tables** across 24 schema files
- **6 Supabase migrations** (gap: ~30+ needed)
- **200+ indexes** defined in migration script
- **334+ NOT NULL constraints**, **126+ FK references**
- **3 demo users** with seeded data, **40+ orphaned test users**

### Changes Since January 13 Audit

| Area | Jan 13 | Feb 6 | Delta |
|------|--------|-------|-------|
| Web completion | 5% | 85-90% | +80-85% |
| Mobile completion | 30% | 60-70% | +30-40% |
| Backend completion | 85% | 85% | Stable |
| Supabase migrations | 3 | 6 | +3 |
| Documented tables | 41 | 41 (69 actual) | Gap widened |
| Backend test files | ~60 | 67 | +7 |
| Web test files | ~0 | 22 | +22 |
| Coach dashboard router | Missing | Complete | New |
| Injuries table migration | Missing | Present | Fixed |

---

*This roadmap supersedes the January 13, 2026 FULL_PROJECT_AUDIT.md. Next audit recommended after Phase 4 completion.*
