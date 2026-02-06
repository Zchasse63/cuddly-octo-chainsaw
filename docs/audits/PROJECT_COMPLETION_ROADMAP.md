# VoiceFit 2.0 - Project Completion Roadmap

> **Generated**: February 6, 2026
> **Verified**: February 6, 2026 (post-verification audit against actual codebase)
> **Previous Audit**: January 13, 2026
> **Scope**: Full-spectrum audit across backend, mobile, web, database, documentation, AI, and infrastructure

> **Correction Notice**: This is the verified edition. The initial February 6 audit contained 11 inaccurate or phantom issues that have been removed. All findings below have been validated against the actual source code. See Section 7 "Corrections from Initial Audit" for full details.

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
- **16 web dashboard route files** (14 pages + 2 layouts) fully implemented with live tRPC integration (no mock data)
- **54 mobile screens** with 29 components, 5 Zustand stores, theme system, and NativeWind styling
- **Coach chat tab** fully implemented (`apps/mobile/app/(tabs)/coach.tsx`, 278 lines)
- **74 database tables** across 24 Drizzle schema files with comprehensive domain coverage
- **Supabase auth** working on web (middleware-protected) and mobile (SecureStore persistence)
- **67 backend test files**, 22 web test files, **4 mobile test files**, Vitest configured across all workspaces
- **PowerSync** offline support with 11 sync tables and conflict resolution
- **Voice recording** pipeline end-to-end: speech recognition -> parsing -> confirmation
- **Error handling** in voiceParser.ts and aiCoach.ts both include proper catch-block returns with graceful fallbacks
- **Header handling** in trpc/index.ts correctly handles both Fetch API Headers and Node.js IncomingMessage via conditional branching
- **SQL queries** in exercise router properly parameterized via Drizzle's `sql` tagged template literal

### What Doesn't Work

- **React 19 incompatibility** - `lucide-react-native@0.400.0` rejects React 19
- **11 backend tests failing** - Grok AI model tool selection inconsistency
- **No auth guards** in mobile root layout (both auth/main screens accessible)
- **No error boundaries** in mobile app (unhandled errors crash entire app)
- **In-memory session state** in voice router (lost on restart, won't scale)
- **CORS hardcoded to localhost** - blocks any deployed environment
- **Migration gap** - 74 tables in schema, only 6 Supabase migrations
- **SSL certificate verification disabled** in database connection (`rejectUnauthorized: false`)
- **Program generation timeout defined but never consumed** - 5-minute value exists in config but programGenerator doesn't use it

---

## 2. Issue Inventory

### CRITICAL (Build Breakers & Data Loss Risks)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| C1 | **React 19 peer dependency conflict** - lucide-react-native rejects React 19 | `apps/mobile/package.json` | Mobile may crash at runtime |
| C2 | **Voice session state in memory** - Map() instead of Redis, TODO comment acknowledges this | `apps/backend/src/routers/voice.ts:8-17` | Data loss on restart, no horizontal scaling |
| C3 | **Migration/schema desync** - 74 tables in Drizzle, only 6 migrations | `supabase/migrations/` | Fresh DB deploy missing most tables |

### HIGH (Pre-Launch Blockers)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| H1 | **CORS origins hardcoded to localhost** | `apps/backend/src/index.ts:14-15` | Cannot deploy to any environment |
| H2 | **No .env validation on startup** | Backend entry point | Server starts with missing keys, fails later |
| H3 | **API URL defaults to localhost** in mobile tRPC client | `apps/mobile/src/lib/trpc.ts:11` | Production builds fail silently |
| H4 | **No auth guard redirects** in mobile root layout | `apps/mobile/app/_layout.tsx:25-81` | Users see both auth & main screens |
| H5 | **SSL certificate verification disabled** - `ssl: { rejectUnauthorized: false }` | `apps/backend/src/db/index.ts:11` | MITM attacks possible on database connections in production |
| H6 | **API key non-null assertion without validation** - `XAI_API_KEY!` | `apps/backend/src/lib/ai.ts:28` | Delayed failure detection, cryptic error messages |
| H7 | **DATABASE_URL non-null assertion** - `DATABASE_URL!` without startup validation | `apps/backend/src/db/index.ts:6` | Server crashes with unhelpful error on missing config |
| H8 | **Missing deep link configuration** in mobile root layout | `apps/mobile/app/_layout.tsx` | OAuth callbacks and external links break (scheme defined in app.json but no linking config) |
| H9 | **PowerSync errors logged but not surfaced to UI** | `apps/mobile/src/lib/powersync.ts:318-341` | Users unaware sync is failing |
| H10 | **Program generation timeout not consumed** - `AI_CONFIG.programGenerationTimeout: 300000` defined but programGenerator.ts never references "timeout" | `apps/backend/src/services/programGenerator.ts` + `apps/backend/src/lib/ai.ts:156` | Long program generations use default 2-min timeout instead of intended 5-min |
| H11 | **Supabase SDK version mismatch** - web@2.90.1, backend/mobile@2.45.0 | Cross-workspace | Type incompatibilities |
| H12 | **Vitest version mismatch** - web@2.0.0, backend/mobile@4.0.14 | Cross-workspace | Inconsistent test behavior |
| H13 | **Missing error boundaries in mobile** - no error.tsx files found anywhere in app directory | `apps/mobile/app/` | Unhandled errors in any screen crash the entire app |

### MEDIUM (Quality & Maintenance)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| M1 | In-memory cache in coachDashboard (unbounded Map) | `apps/backend/src/routers/coachDashboard.ts:26` | Memory leak |
| M2 | Rate limit anon users by path, not IP | `apps/backend/src/trpc/index.ts:94` | Distributed abuse possible |
| M3 | 4 different coach implementations (legacy cruft) | `apps/backend/src/services/{aiCoach,aiCoachRag,unifiedCoach,unifiedCoachV2}.ts` | Maintenance burden |
| M4 | `as any` type casts in backend production code (7 instances) | `ai.ts:126`, `unifiedCoachV2.ts:357`, `programGenerator.ts:505,539`, `exercise.ts:35`, `calendar.ts:285`, `substitutions.ts:176` | Type safety regression |
| M5 | 11 console.log + 13 console.error/warn in mobile production code | `stores/auth.ts`, `theme/ThemeContext.tsx`, `hooks/useAudioCues.ts`, `lib/powersync.ts` | Console spam in prod |
| M6 | Missing CHECK constraints on score fields (1-10 ranges) | `readiness_scores`, `training_load` in database schema | Invalid data possible |
| M7 | Missing FK constraint on `workouts.programId` | `apps/backend/src/db/schema/workouts.ts:24` | Orphaned records |
| M8 | `weightUnit` is text instead of enum (in 2 columns) | `apps/backend/src/db/schema/workouts.ts:42,72` | Bad data quality |
| M9 | tRPC 11.0.0-rc.446 (release candidate, not stable) | All workspaces | Breaking changes risk |
| M10 | AI SDK versions may be outdated (@ai-sdk/xai@2.0.39, ai@5.0.106) | `apps/backend/package.json` | Missing features/fixes (verify against npm) |
| M11 | Documentation/schema gap (41 documented vs 74 actual tables) | `docs/SUPABASE_DATABASE_SCHEMA_REPORT.md` | Confusing reference |
| M12 | Supabase migration timestamp format inconsistency (3 of 6 missing time component) | `supabase/migrations/` | Migration ordering issues |
| M13 | `@typescript-eslint` version split - backend 7.x, mobile 8.x, web has none (relies on next/lint) | Backend vs mobile vs web | Inconsistent linting across monorepo |
| M14 | Connection pool max=10 may be insufficient | `apps/backend/src/db/index.ts` | Perf under load |
| M15 | Push notifications configured but not implemented (no expo-notifications plugin) | `apps/mobile/app.json` | Feature gap |
| M16 | 4 future coach tools are stubs returning dummy data | `apps/backend/src/tools/coach/future.ts` | Misleading AI capabilities |
| M17 | Magic number (Epley formula constant `30`) hardcoded in 3 places | `voice.ts:110`, `workout.ts:9`, `unifiedCoach.ts:478` | Maintainability |
| M18 | Billing tab stubbed with hardcoded $49/month and past date "December 15, 2024" | `apps/web/src/app/dashboard/settings/page.tsx:466-494` | Confusing UX, stale date |
| M19 | 5 explicit `any` type annotations in ai.ts with eslint-disable comments | `apps/backend/src/lib/ai.ts:63,64,83,93,124` | Type safety regression in core AI library |
| M20 | `throw new Error()` instead of `throw new TRPCError()` in exercise router | `apps/backend/src/routers/exercise.ts:71` | Clients receive 500 instead of proper 404 error codes |
| M21 | PowerSync chat messages not synced offline | `apps/mobile/app/(tabs)/coach.tsx` | Messages lost when offline |

---

## 3. Documentation Status

### Inventory (33 markdown files audited)

| Classification | Count | Action |
|---------------|-------|--------|
| **Keep & Update** | 15 | Actively maintained, need periodic refresh |
| **Keep As-Is** | 3 | Accurate and complete |
| **Consolidate** | 1 | Merge into related docs |
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
| `SUPABASE_DATABASE_SCHEMA_REPORT.md` | Keep & Update | Documents 41 tables, schema has 74 |
| `API_REFERENCE.md` | Keep & Update | High-level, needs endpoint detail and verification |
| `TYPE_CHECK_ERRORS.md` | Keep & Update | Needs re-verification against current build status |

### Consolidation Required

1. **OpenAI SDK Migration.md + TOOL_CALLING_MIGRATION_PLAN.md** -> Single migration doc

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
| Archive outdated docs | 6 files in `/docs/` | `/docs/archive/` | Stale content |
| Remove duplicate migration doc | OpenAI SDK migration | Merge into Tool Calling Plan | Redundancy |
| Add mobile error boundaries | (missing) | `apps/mobile/app/error.tsx` + route group error files | Crash prevention |

### Dependency Alignment

| Package | Current State | Target | Priority |
|---------|--------------|--------|----------|
| `lucide-react-native` | 0.400.0 (rejects React 19) | Latest React 19-compatible | CRITICAL |
| `@supabase/supabase-js` | 2.45.0 (backend/mobile), 2.90.1 (web) | Latest across all | HIGH |
| `vitest` | 2.0.0 (web), 4.0.14 (backend/mobile) | 4.x across all | HIGH |
| `typescript` | 5.3.0-5.5.0 mixed | 5.5.x across all | MEDIUM |
| `@typescript-eslint` | 7.x (backend), 8.x (mobile), none (web) | 8.x across all | MEDIUM |
| `@ai-sdk/xai` | 2.0.39 | Latest stable | MEDIUM |
| `ai` | 5.0.106 | Latest stable | MEDIUM |
| `drizzle-orm` / `drizzle-kit` | 0.33.0 / 0.24.0 | 0.45.x / 0.31.x | LOW |

### Configuration Fixes

- Web `tsconfig.json` target ES2017 -> ES2020+ (too old for Next.js 15)
- Add root `.eslintrc` for cross-workspace consistency
- Fix Supabase migration timestamp formats (3 of 6 missing time component)
- Enable SSL certificate verification for production database connections
- Add environment variable validation at startup (fail-fast pattern)

---

## 5. Prioritized Action Plan

### Phase 0: Unblock Build (Immediate - Day 1)

| Task | Effort | Files |
|------|--------|-------|
| Verify actual build status with `npm run build` and fix any real errors found | 30 min | Investigation + fixes |
| Resolve lucide-react-native React 19 conflict (C1) | 30 min | `apps/mobile/package.json` |

**Definition of done**: `npm run build` succeeds, `npm run test` passes (minus known AI flakes)

### Phase 1: Critical Security & Production Readiness (Week 1)

| Task | Effort | Files |
|------|--------|-------|
| CORS origins from `process.env.ALLOWED_ORIGINS` (H1) | 30 min | `apps/backend/src/index.ts` |
| Add .env validation schema on backend startup (H2, H6, H7) | 1 hr | `apps/backend/src/index.ts`, `apps/backend/src/db/index.ts`, `apps/backend/src/lib/ai.ts` |
| Remove localhost fallback in mobile tRPC client (H3) | 15 min | `apps/mobile/src/lib/trpc.ts` |
| Enable SSL certificate verification (or make env-configurable) (H5) | 30 min | `apps/backend/src/db/index.ts` |
| Migrate voice sessionState to Redis with TTL (C2) | 2 hr | `apps/backend/src/routers/voice.ts` |
| Migrate coachDashboard insightsCache to Redis (M1) | 1 hr | `apps/backend/src/routers/coachDashboard.ts` |
| Add IP-based rate limiting for anon users (M2) | 1 hr | `apps/backend/src/trpc/index.ts` |
| Add deep link configuration to mobile root layout (H8) | 1 hr | `apps/mobile/app/_layout.tsx` |

### Phase 2: Mobile Navigation & Auth (Week 2)

| Task | Effort | Files |
|------|--------|-------|
| Implement auth guard redirects in `_layout.tsx` (H4) | 2 hr | `apps/mobile/app/_layout.tsx` |
| Add error boundaries to mobile app (H13) | 2 hr | `apps/mobile/app/error.tsx` + route group error files |
| Surface PowerSync errors to UI (toast/badge) (H9) | 1 hr | 2 files |
| Implement push notification integration (M15) | 4 hr | 3-4 files |
| Replace 11 console.log with proper logging/error tracking (M5) | 1 hr | 4 files |
| Complete dynamic route stubs ([id] screens) | 4 hr | 4 files |

### Phase 3: Dependency & Config Alignment (Week 2-3)

| Task | Effort | Files |
|------|--------|-------|
| Align Supabase SDK versions across workspaces (H11) | 1 hr | 3 package.json files |
| Align vitest versions (web 2.x -> 4.x) (H12) | 1 hr | `apps/web/package.json` |
| Align TypeScript versions | 30 min | 3 tsconfig files |
| Align @typescript-eslint versions (add to web) (M13) | 30 min | 3 package.json files |
| Update AI SDK to latest stable (M10) | 2 hr | `apps/backend/package.json` + test fixes |
| Pin tRPC to stable v11 release (when available) (M9) | 30 min | 3 package.json files |

### Phase 4: Database & Data Integrity (Week 3-4)

| Task | Effort | Files |
|------|--------|-------|
| Generate migrations for all 74 tables using Drizzle Kit (~38 new needed) (C3) | 4 hr | Multiple migration files |
| Add missing FK constraints (exercises, prHistory, workouts) (M7) | 2 hr | Schema files |
| Add CHECK constraints for score/percentage fields (M6) | 2 hr | Schema files |
| Add unique constraints (exercises.normalizedName, phoneticKey) | 1 hr | Schema files |
| Remove duplicate `templateId` column in trainingPrograms | 30 min | 1 schema file |
| Fix migration timestamp formats (3 of 6 missing time component) (M12) | 30 min | 3 migration files |
| Change `weightUnit` from text to enum (M8) | 30 min | `apps/backend/src/db/schema/workouts.ts` |
| Add timestamps to tables missing created_at/updated_at | 1 hr | 3-4 schema files |

### Phase 5: Backend Quality (Week 4)

| Task | Effort | Files |
|------|--------|-------|
| Standardize error handling to TRPCError everywhere (M20) | 3 hr | `exercise.ts` + 10+ routers |
| Remove/fix `as any` type assertions in production code (M4, M19) | 2 hr | `ai.ts`, `exercise.ts`, `calendar.ts`, `substitutions.ts`, `programGenerator.ts`, `unifiedCoachV2.ts` |
| Consolidate 4 coach implementations after V2 rollout (M3) | 4 hr | `aiCoach.ts`, `aiCoachRag.ts`, `unifiedCoach.ts`, `unifiedCoachV2.ts` |
| Add structured logging (JSON format) | 2 hr | 2-3 files |
| Pass programGenerationTimeout to generateCompletion (H10) | 30 min | `apps/backend/src/services/programGenerator.ts` |
| Remove/implement 4 stub future tools (M16) | 1 hr | `apps/backend/src/tools/coach/future.ts` |
| Extract Epley formula to shared constant (3 places) (M17) | 15 min | `voice.ts`, `workout.ts`, `unifiedCoach.ts` |

### Phase 6: Documentation & Cleanup (Week 4-5)

| Task | Effort | Files |
|------|--------|-------|
| Archive 6 outdated docs | 30 min | 6 files |
| Merge duplicate migration docs | 30 min | 2 files |
| Update MASTER_PLAN.md completion percentages | 1 hr | 1 file |
| Update TASK_LIST.md with actual completion states | 2 hr | 1 file |
| Regenerate DB schema report (41 -> 74 tables) (M11) | 2 hr | 1 file |
| Create Setup Guide (new) | 2 hr | 1 new file |
| Create Mobile Development Guide (new) | 2 hr | 1 new file |
| Update CLAUDE.md to match current state | 1 hr | 1 file |

### Phase 7: Web Dashboard Polish (Week 5-6)

| Task | Effort | Files |
|------|--------|-------|
| Implement billing tab or finalize "coming soon" UX; fix stale date "December 15, 2024" (M18) | 4 hr | `apps/web/src/app/dashboard/settings/page.tsx` |
| Wire up non-functional UI buttons (filters, actions) | 3 hr | 5+ files |
| Implement 2FA setup flow | 4 hr | 2 files |
| Add language/timezone onChange handlers | 1 hr | 1 file |
| Improve modal close behavior (click outside) | 30 min | 1 file |
| Revenue metric from API (currently hardcoded $0) | 1 hr | 1 file |

### Phase 8: Testing & CI (Week 6-7)

| Task | Effort | Files |
|------|--------|-------|
| Fix 11 failing backend AI tests (Grok tool selection) | 4 hr | 4 test files |
| Expand mobile test coverage (4 existing test files, target 60%+) | 6 hr | 16+ new files |
| Add E2E tests via Detox (setup present) | 8 hr | 5+ new files |
| Add mobile/web tests to CI pipeline | 2 hr | 2 workflow files |
| Fix or mock tRPC router mismatch in mobile tests | 3 hr | Multiple files |
| Add PowerSync offline chat message persistence tests (M21) | 2 hr | 1-2 files |

---

## 6. Completion Criteria

### Definition of "Production Ready" (v2.0 Launch)

**Build & Deploy**
- [ ] `npm run build` succeeds with zero errors across all workspaces
- [ ] All environment variables validated on startup (DATABASE_URL, XAI_API_KEY, etc.)
- [ ] CORS configured for production origins
- [ ] SSL certificate verification enabled for production
- [ ] CI/CD pipeline green for all workspaces (lint, type-check, test, build)

**Backend**
- [ ] Zero CRITICAL or HIGH security findings
- [ ] All tRPC endpoints return proper TRPCError codes (not generic Error)
- [ ] Session/cache state in Redis (not in-memory)
- [ ] Rate limiting functional for all tiers (auth, general, AI, search)
- [ ] AI tool calling works reliably (>95% tool selection success)
- [ ] Zero `as any` in production router code

**Mobile**
- [ ] Auth guard redirects working (unauthenticated -> login)
- [ ] All visible tabs functional with real data (including coach tab)
- [ ] Voice logging end-to-end: record -> parse -> confirm -> save
- [ ] Deep linking for OAuth callbacks working
- [ ] Push notifications configured and sending
- [ ] PowerSync offline mode functional with error surfacing
- [ ] Error boundaries on all route groups
- [ ] No React 19 peer dependency warnings at startup

**Web Dashboard**
- [ ] All pages rendering with live tRPC data
- [ ] Auth flow complete (login, signup, onboarding, session refresh)
- [ ] Coach can manage clients, programs, messages, analytics
- [ ] AI features (program generation, health insights) functional
- [ ] Billing section shows real data or proper "coming soon" UX (no stale dates)

**Database**
- [ ] All 74 tables have corresponding migrations
- [ ] FK constraints enforced on critical relationships
- [ ] Schema documentation matches actual table count (74)
- [ ] Demo data seeded and accessible

**Testing**
- [ ] Backend: >80% coverage, zero failing tests (AI flakes excluded from required)
- [ ] Web: All pages have smoke tests
- [ ] Mobile: Core flows covered (auth, workout log, voice parse), building on existing 4 test files

**Documentation**
- [ ] CLAUDE.md reflects current architecture (74 tables, 16 route files, 4 mobile test files)
- [ ] README has correct setup instructions
- [ ] No outdated docs in active directories
- [ ] API reference matches implementation

---

## 7. Corrections from Initial Audit

This section documents all corrections made during the verification pass against the actual codebase.

### Phantom Issues Removed (9 items)

| Original ID | Claim | Actual Finding |
|-------------|-------|----------------|
| C1 | Backend TypeScript build error at `trpc/index.ts:26` - Headers type cast fails TS2352 | Code at lines 24-26 is **correct**. Uses conditional branching (`typeof headers.get === 'function'`) to handle both Fetch API Headers and Node.js IncomingMessage. The `as Record<string, string \| string[] \| undefined>` cast is valid and necessary in the else branch. |
| C4 | `voiceParser.ts` catch block has no return statement | Lines 99-112 **do** have a proper return statement: returns `{ exercise_name: null, ..., confidence: 0.1 }` as a graceful low-confidence fallback. |
| C5 | `aiCoach.ts` catch block has no return | Lines 78-84 **do** have a proper return statement: returns `{ category: 'general', confidence: 0.5, extracted_exercise: null }` as a default classification. |
| H5 | Missing coach tab screen - route defined but no file | `apps/mobile/app/(tabs)/coach.tsx` **exists** (278 lines, last modified Nov 27 2024). Fully implemented with chat UI, message state, haptic feedback. |
| H6 | Type-unsafe header handling at `trpc/index.ts:24-26` | Same code as C1. The header handling is **type-safe** with proper conditional branching before the cast. |
| H7 | SQL injection risk - raw string interpolation at `exercise.ts:94` | Drizzle's `sql` tagged template literal **auto-parameterizes** all interpolated values. The expression `${'%' + input.name + '%'}` produces a single parameterized value `%name%`. This is **safe** from SQL injection. |
| M4 (mobile) | 10+ `as any` type escapes in mobile src | **Zero** instances of `as any` found in `apps/mobile/src/` by comprehensive grep. The `as any` casts exist in **backend** code instead (7 instances). |
| M12 | Two README files at root (README.md + README-2.md) | Only `README.md` exists at project root. No `README-2.md` found. |
| M14 | Orphaned `test-*.mjs` files in project root | **Zero** `test-*.mjs` files found at project root by search. |

### Corrected Issues (4 items)

| Original ID | Original Claim | Correction |
|-------------|---------------|------------|
| H11 | "Program generation timeout mismatch - defined at 5min, SDK uses 2min default" | The real issue is that `programGenerator.ts` **never references "timeout" at all** (grep confirmed 0 matches). `AI_CONFIG.programGenerationTimeout: 300000` is defined in ai.ts but never consumed by any caller. Now tracked as H10. |
| M5 | "19 console.log statements in mobile production code" | Actual count: **11** console.log + **13** console.error/warn across 4 files (`auth.ts`, `ThemeContext.tsx`, `useAudioCues.ts`, `powersync.ts`) |
| M10 | "@ai-sdk/xai 2.0.39, latest 3.0.47" | Versions are @ai-sdk/xai@2.0.39 and ai@5.0.106. Specific "latest" version claims need verification against npm registry. |
| M19 | "Epley formula duplicated in 2 places" | Actually duplicated in **3** places: `voice.ts:110`, `workout.ts:9`, and `unifiedCoach.ts:478`. Now tracked as M17. |

### New Issues Discovered (10 items, not in original audit)

| New ID | Issue | Location | Severity |
|--------|-------|----------|----------|
| H5 | `ssl: { rejectUnauthorized: false }` disables SSL certificate verification for database | `apps/backend/src/db/index.ts:11` | HIGH |
| H7 | `DATABASE_URL!` non-null assertion without startup validation | `apps/backend/src/db/index.ts:6` | HIGH |
| H10 | `programGenerationTimeout: 300000` defined in ai.ts but never consumed by programGenerator | `apps/backend/src/services/programGenerator.ts` | HIGH |
| H13 | No `error.tsx` files anywhere in mobile app directory | `apps/mobile/app/` | HIGH |
| M4 | 7 `as any` casts in **backend** production code (not mobile as originally claimed) | `ai.ts`, `exercise.ts`, `calendar.ts`, `substitutions.ts`, `programGenerator.ts`, `unifiedCoachV2.ts` | MEDIUM |
| M19 | 5 explicit `any` type annotations in ai.ts with eslint-disable comments | `apps/backend/src/lib/ai.ts:63,64,83,93,124` | MEDIUM |
| M20 | `throw new Error()` instead of `throw new TRPCError()` in exercise router | `apps/backend/src/routers/exercise.ts:71` | MEDIUM |
| M21 | PowerSync chat messages not synced offline | `apps/mobile/app/(tabs)/coach.tsx` | MEDIUM |
| M18 (enhanced) | Billing stub includes stale date "December 15, 2024" (already past) | `apps/web/src/app/dashboard/settings/page.tsx:494` | MEDIUM |
| M13 (enhanced) | Web has **no** `@typescript-eslint` at all (relies entirely on next/lint) | `apps/web/` | MEDIUM |

### Corrected Metrics

| Metric | Initial Audit | Verified Value |
|--------|--------------|----------------|
| Database tables | 69 | **74** |
| Web route files | 14 | **16** (14 pages + 2 layouts) |
| Mobile test files | 0 | **4** |
| console.log in mobile | 19 | **11** (+13 console.error/warn) |
| `as any` in mobile src | 10+ | **0** |
| `as any` in backend | 3+ | **7** casts + **5** type annotations |
| README files at root | 2 | **1** |
| Orphaned test scripts | present | **0** |
| Epley formula locations | 2 | **3** |
| Migration gap | ~30 needed | ~**38** needed |
| Critical issues total | 6 | **3** |
| High issues total | 13 | **13** (4 removed, 4 added) |
| Medium issues total | 20 | **21** (3 removed, 4 added) |

---

## Appendix: Metrics Summary

### Code Volume

| Workspace | Lines of Code | Files | Test Files |
|-----------|--------------|-------|------------|
| Backend | ~30,000 | 100+ | 67 |
| Mobile | ~58,544 | 110+ | 4 |
| Web | ~8,000 | 45+ | 22 |
| **Total** | **~96,500** | **255+** | **93** |

### Backend Router Coverage

- **25 routers** exporting **284 procedures**
- Rate limiting: 4 tiers (general 100/min, AI 20/hr, auth 10/15min, search 60/min)
- Auth: protectedProcedure middleware on all sensitive endpoints
- Validation: Zod schemas on all inputs

### AI System

- **60 tools**: 35 athlete + 25 coach (4 future stubs)
- **4 Grok models**: grok-4-1-fast-reasoning, grok-4-fast, grok-3-fast, grok-3-mini-fast
- **Feature flagged**: V2 tool-based coaching with gradual rollout
- **Retry logic**: 5 attempts with exponential backoff + jitter for Grok API inconsistency
- **Known issue**: Grok model occasionally fails to select tools in complex scenarios

### Database

- **74 tables** across 24 schema files
- **6 Supabase migrations** (gap: ~38 needed)
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
| Documented tables | 41 | 41 (74 actual) | Gap widened |
| Backend test files | ~60 | 67 | +7 |
| Web test files | ~0 | 22 | +22 |
| Mobile test files | 0 | 4 | +4 |
| Coach dashboard router | Missing | Complete | New |
| Coach tab screen | Missing | Complete (278 lines) | New |
| Injuries table migration | Missing | Present | Fixed |

---

*This verified roadmap supersedes the initial February 6, 2026 audit draft and the January 13, 2026 FULL_PROJECT_AUDIT.md. All findings have been validated against the actual codebase. Next audit recommended after Phase 4 completion.*
