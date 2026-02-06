# VoiceFit Coach Web Dashboard Remediation Plan

**Source Audit:** [WEB_DASHBOARD_AUDIT.md](../audits/WEB_DASHBOARD_AUDIT.md)
**Created:** 2026-01-19
**Status:** ✅ COMPLETE (All 5 Phases Done)

---

## Execution Progress

| Phase | Status | Actual Cost | Actual Time | Notes |
|-------|--------|-------------|-------------|-------|
| Phase 1 | ✅ COMPLETE | ~$6 | ~35 min | FC-1, FC-2 fixed. 4 new tRPC endpoints created. |
| Phase 2 | ✅ COMPLETE | ~$10.50 | ~30 min | AI-1 to AI-4 fixed. 4 AI features + modal + backend service. |
| Phase 3 | ✅ COMPLETE | ~$5 | ~40 min | TR-1 to TR-3, AU-1 fixed. Toast system, optimistic updates, query refetching. |
| Phase 4 | ✅ COMPLETE | ~$4.27 | ~55 min | FC-3, FC-4 fixed. Settings wired up, scheduling system added. |
| Phase 5 | ✅ COMPLETE | ~$9.33 | ~2.5 hrs | UX-1 to UX-4, BP-1 fixed. ARIA labels, focus trapping, skip link, contrast docs. |

---

## Executive Summary

This plan extracts all issues from the Web Dashboard Audit and organizes them into actionable phases for Zero Shot execution. The audit identified **18 distinct issues** across 7 categories.

**Issue Breakdown by Severity:**
- 🔴 Critical: 0 (all previously resolved)
- 🟠 High Priority: 5 issues
- 🟡 Medium Priority: 8 issues
- 🔵 Low Priority: 5 issues

**Estimated Total Cost:** $40-60 (across all phases)
**Estimated Total Time:** 3-5 hours of Zero Shot execution

---

## All Issues Extracted from Audit

### Category 1: UI/UX Accessibility (4 Issues)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ UX-1 | 🔵 Low | ~~Missing ARIA labels on icon-only buttons~~ | `/dashboard/clients/page.tsx:137`, `/dashboard/messages/page.tsx:178-186` | FIXED: 20 aria-label attributes added across 9 files |
| ✅ UX-2 | 🔵 Low | ~~Keyboard navigation not fully tested~~ | Multiple pages | FIXED: focus-trap-react added to modals, escape closes, focus returns |
| ✅ UX-3 | 🔵 Low | ~~Color contrast not verified~~ | CSS variables in globals.css | FIXED: WCAG AA compliance documented in globals.css comments |
| ✅ UX-4 | 🔵 Low | ~~No skip-to-content link~~ | Layout component | FIXED: Skip link added to dashboard layout, targets #main-content |

### Category 2: Feature Completeness (4 Issues)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ FC-1 | 🟠 High | ~~Mock data in Messages~~ | `/dashboard/messages/page.tsx` | FIXED: Now uses `coachDashboard.getMessages` tRPC endpoint |
| ✅ FC-2 | 🟠 High | ~~Mock data in Analytics~~ | `/dashboard/analytics/page.tsx` | FIXED: Now uses 3 real tRPC endpoints |
| ✅ FC-3 | 🟡 Medium | ~~Settings features not wired up~~ | `/dashboard/settings/page.tsx` | FIXED: Notifications, password, theme wired up. Billing marked Coming Soon. |
| ✅ FC-4 | 🟡 Medium | ~~Upcoming Sessions always empty~~ | `/dashboard/page.tsx:111` | FIXED: scheduled_sessions table, 3 endpoints, ScheduleSessionModal |

### Category 3: tRPC Integration (3 Issues)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ TR-1 | 🟡 Medium | ~~No optimistic updates~~ | All mutation calls | FIXED: onMutate/onError/onSettled pattern implemented |
| ✅ TR-2 | 🟡 Medium | ~~Query refetching not configured~~ | `apps/web/src/app/layout.tsx:19` | FIXED: refetchOnWindowFocus + intervals configured |
| ✅ TR-3 | 🟡 Medium | ~~Error messages not specific~~ | Multiple pages | FIXED: TRPCClientError parsing + Toast notifications |

### Category 4: AI Tools Integration (4 Issues)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ AI-1 | 🟠 High | ~~No AI coach in messaging~~ | `/dashboard/messages/page.tsx` | FIXED: "Ask AI Coach" button, generates suggested responses |
| ✅ AI-2 | 🟠 High | ~~No AI-assisted program builder~~ | `/dashboard/programs/new/page.tsx` | FIXED: "Generate with AI" modal with 4-step wizard |
| ✅ AI-3 | 🟡 Medium | ~~No AI analytics insights~~ | `/dashboard/analytics/page.tsx` | FIXED: AI Insights card with 1-hour cache, priority badges |
| ✅ AI-4 | 🟡 Medium | ~~No AI health analysis~~ | `/dashboard/clients/[id]/page.tsx` | FIXED: AI Health Summary card with status indicators |

### Category 5: Authentication (1 Issue)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ AU-1 | 🟡 Medium | ~~No loading state during auth check~~ | Dashboard pages | FIXED: AuthProvider with full-page spinner prevents content flash |

### Category 6: Build & Performance (2 Issues)

| ID | Severity | Issue | Location | Description |
|----|----------|-------|----------|-------------|
| ✅ BP-1 | 🔵 Low | ~~ESLint plugin conflict~~ | `.eslintrc.cjs` | FIXED: No duplicate react-hooks plugin, lint runs clean |
| BP-2 | 🔵 Low | Large shared chunk | Build output | 52.9 kB for React Query + superjson could be split |

### Category 7: Security Enhancements (0 Remaining Critical)

All critical security issues were resolved in the audit. Remaining items are non-critical enhancements:

| ID | Severity | Issue | Description |
|----|----------|-------|-------------|
| SE-1 | 🔵 Low | SRI for CDN resources | Add Subresource Integrity for any CDN scripts |
| SE-2 | 🔵 Low | HSTS header | Enable HTTP Strict Transport Security |
| SE-3 | 🔵 Low | X-Frame-Options | Prevent clickjacking |

---

## Phased Remediation Plan

### Phase 1: Critical Feature Gaps (High Priority) ✅ COMPLETE
**Focus:** Wire up real data for Messages and Analytics
**Estimated Cost:** $12-18 | **Actual Cost:** ~$6
**Estimated Time:** 45-75 minutes | **Actual Time:** ~35 minutes

**Issues Addressed:**
- ✅ FC-1: Mock data in Messages → Real tRPC `getMessages` endpoint
- ✅ FC-2: Mock data in Analytics → Real tRPC endpoints (`getWeeklyActivity`, `getTopPrograms`, `getClientRetention`)

**Implementation Details:**
- 4 new tRPC endpoints created in `coachDashboard.ts`
- Frontend pages updated with loading/error states
- Auto-scroll on messages page
- Loading skeletons on analytics charts
- Build passes, audit document updated

### Phase 2: AI Integration (High Priority) ✅ COMPLETE
**Focus:** Surface AI tools in dashboard UI
**Estimated Cost:** $15-25 | **Actual Cost:** ~$10.50
**Estimated Time:** 60-90 minutes | **Actual Time:** ~30 minutes

**Issues Addressed:**
- ✅ AI-1: AI coach in messaging → "Ask AI Coach" button + AI suggested badge
- ✅ AI-2: AI-assisted program builder → 4-step modal wizard
- ✅ AI-3: AI analytics insights → AI Insights card with 1-hour cache
- ✅ AI-4: AI health analysis → AI Health Summary with green/yellow/red status

**Implementation Details:**
- Created `webDashboardAI.ts` service with 4 AI functions
- 4 new tRPC endpoints in `coachDashboard.ts`
- AIBadge component for visual indicators
- AI Modal component for program generation wizard
- All pages have loading states and error handling
- Build passes, audit document updated

### Phase 3: UX Polish & Performance (Medium Priority) ✅ COMPLETE
**Focus:** tRPC optimizations, auth UX, query improvements
**Estimated Cost:** $10-15 | **Actual Cost:** ~$5
**Estimated Time:** 40-60 minutes | **Actual Time:** ~40 minutes

**Issues Addressed:**
- ✅ TR-1: Optimistic updates → onMutate/onError/onSettled pattern for inviteClient, sendMessage, updateProfile
- ✅ TR-2: Query refetching → refetchOnWindowFocus enabled, refetchInterval for messages (30s) and dashboard (5min)
- ✅ TR-3: Error messages → parseTRPCError with code mapping + Toast notification system
- ✅ AU-1: Auth loading state → AuthProvider with full-page spinner, SSR-safe implementation

**Implementation Details:**
- Created `Toast.tsx` component with success/error/info variants
- Created `useToast.ts` hook for easy toast access
- Added `AuthProvider.tsx` with isMounted check for SSR safety
- Updated ErrorMessage component with TRPCClientError parsing
- All mutations now show toast notifications on success/error
- Build passes, audit document updated

### Phase 4: Settings & Scheduling (Medium Priority) ✅ COMPLETE
**Focus:** Complete settings functionality, scheduling feature
**Estimated Cost:** $12-18 | **Actual Cost:** ~$4.27
**Estimated Time:** 50-80 minutes | **Actual Time:** ~55 minutes

**Issues Addressed:**
- ✅ FC-3: Settings → Notifications endpoints, changePassword, ThemeProvider, Billing "Coming Soon"
- ✅ FC-4: Scheduling → scheduled_sessions table, getUpcomingSessions/scheduleSession/cancelSession endpoints

**Implementation Details:**
- Created `user_preferences` table and tRPC endpoints for notification settings
- Added `changePassword` endpoint with current password verification
- Created `ThemeProvider.tsx` with localStorage persistence and flash prevention
- Marked billing section as "Coming Soon" with disabled actions
- Created `scheduled_sessions` table with full schema (Drizzle)
- Created `ScheduleSessionModal.tsx` component
- Dashboard displays real upcoming sessions with empty state
- Build passes, audit document updated

### Phase 5: Accessibility & Polish (Low Priority) ✅ COMPLETE
**Focus:** ARIA labels, keyboard navigation, accessibility compliance
**Estimated Cost:** $8-12 | **Actual Cost:** ~$9.33
**Estimated Time:** 30-50 minutes | **Actual Time:** ~2.5 hours

**Issues Addressed:**
- ✅ UX-1: ARIA labels → 20 aria-label attributes added across 9 files for all icon-only buttons
- ✅ UX-2: Keyboard navigation → focus-trap-react added to modals with escape/tab/return focus
- ✅ UX-3: Color contrast → WCAG AA compliance documented in globals.css (all ratios verified)
- ✅ UX-4: Skip-to-content → Skip link added to dashboard layout, targets #main-content
- ✅ BP-1: ESLint config → Confirmed no duplicate react-hooks plugin, lint runs clean

**Implementation Details:**
- Installed `focus-trap-react@11.0.6` for modal focus management
- Added aria-labels to: layout.tsx, messages/page.tsx, clients/page.tsx, programs/page.tsx, analytics/page.tsx, ScheduleSessionModal.tsx, AIModal.tsx
- Added skip-link CSS in globals.css (hidden by default, visible on focus)
- Documented WCAG AA contrast ratios for light/dark modes in CSS comments
- Updated test helpers to include ToastProvider wrapper
- 4 worker iterations to handle all validator feedback
- Build passes, all tests pass

---

## Zero Shot Prompts

### Phase 1 Prompt: Critical Feature Gaps

```
You are implementing fixes for the VoiceFit Coach Web Dashboard based on an audit at docs/audits/WEB_DASHBOARD_AUDIT.md.
READ IT FIRST for full context.

EXECUTE ONLY PHASE 1: CRITICAL FEATURE GAPS

## Issue FC-1: Replace Mock Messages with Real Data

Location: apps/web/src/app/dashboard/messages/page.tsx

TASKS:
1. Create a new tRPC endpoint `getMessages` in apps/backend/src/routers/coachDashboard.ts that:
   - Takes conversationId as a parameter
   - Returns messages array with: id, content, senderId, senderRole, createdAt
   - Queries from the messages table
   - Includes pagination (limit/offset)

2. Update apps/web/src/app/dashboard/messages/page.tsx to:
   - Remove the hardcoded mockMessages array (lines 21-57)
   - Call trpc.coachDashboard.getMessages when a conversation is selected
   - Display real messages with proper loading/error states
   - Auto-scroll to latest message
   - Show timestamps for messages

## Issue FC-2: Replace Mock Analytics with Real Data

Location: apps/web/src/app/dashboard/analytics/page.tsx

TASKS:
1. Create new tRPC endpoints in apps/backend/src/routers/coachDashboard.ts:

   a) `getWeeklyActivity`:
      - Returns workout counts per day for the last 7 days
      - Aggregates from workouts table

   b) `getTopPrograms`:
      - Returns top 5 programs by active clients count
      - Includes: name, activeClients, averageAdherence

   c) `getClientRetention`:
      - Returns monthly retention data for last 6 months
      - Format: { month: string, retained: number, churned: number }

2. Update apps/web/src/app/dashboard/analytics/page.tsx to:
   - Remove hardcoded weeklyData (lines 21-29)
   - Remove hardcoded topPrograms (lines 31-37)
   - Remove hardcoded clientRetention (lines 39-46)
   - Call the three new tRPC endpoints
   - Add loading skeletons for each chart section
   - Add error handling for each section

REQUIREMENTS:
- Preserve existing UI styling and layout
- Follow existing tRPC patterns in the codebase
- Add proper TypeScript types for all new endpoints
- Run `npm run build` in apps/web after implementation
- All existing tests must continue passing

OUTPUT:
After completing fixes, update docs/audits/WEB_DASHBOARD_AUDIT.md to mark FC-1 and FC-2 as ✅ FIXED in the Feature Completeness section.
```

---

### Phase 2 Prompt: AI Integration

```
You are implementing AI features for the VoiceFit Coach Web Dashboard based on an audit at docs/audits/WEB_DASHBOARD_AUDIT.md.
READ IT FIRST for full context.

The backend already has AI tools in apps/backend/src/tools/ but they're not exposed in the dashboard UI.

EXECUTE ONLY PHASE 2: AI INTEGRATION

## Issue AI-1: Add AI Coach to Messaging

Location: apps/web/src/app/dashboard/messages/page.tsx

TASKS:
1. Add an "Ask AI Coach" button next to the send button
2. When clicked, call a new endpoint that:
   - Takes the conversation context and client profile
   - Uses the coach AI tools to generate a suggested response
   - Returns the AI-generated message as a draft
3. Display the draft in the message input (user can edit before sending)
4. Add a subtle "AI Suggested" indicator on AI-assisted messages

## Issue AI-2: AI-Assisted Program Builder

Location: apps/web/src/app/dashboard/programs/new/page.tsx

TASKS:
1. Add a "Generate with AI" button at the top of the form
2. Create a modal that asks for:
   - Client goals (or select an existing client)
   - Fitness level
   - Available equipment
   - Time constraints
3. Call the backend coach.programs AI tool
4. Populate the form with the AI-generated program
5. User can then edit and save as normal

## Issue AI-3: AI Analytics Insights

Location: apps/web/src/app/dashboard/analytics/page.tsx

TASKS:
1. Add an "AI Insights" card to the analytics page
2. Create endpoint that uses coach.analytics AI tool
3. Display 3-5 actionable insights like:
   - "3 clients are showing decreased adherence - consider reaching out"
   - "Your strength programs have 20% higher retention than cardio"
   - "Client X has hit a plateau - suggest program modification"
4. Add "Refresh Insights" button
5. Cache insights for 1 hour to avoid excessive AI calls

## Issue AI-4: AI Health Analysis on Client Detail

Location: apps/web/src/app/dashboard/clients/[id]/page.tsx

TASKS:
1. Add an "AI Health Summary" card below the readiness score
2. Use athlete.health and athlete.injury AI tools
3. Display:
   - Overall health status summary
   - Risk factors or concerns
   - Recommendations for the coach
4. Add visual indicators (green/yellow/red) for health status
5. Include "Last analyzed: X minutes ago" timestamp

REQUIREMENTS:
- Follow existing UI patterns and styling
- Add loading states for all AI operations (show "Analyzing..." or similar)
- Handle errors gracefully (AI features should fail silently with "unavailable" message)
- AI features should be clearly labeled as AI-generated
- Run `npm run build` in apps/web after implementation

OUTPUT:
After completing fixes, update docs/audits/WEB_DASHBOARD_AUDIT.md to mark AI-1 through AI-4 as ✅ FIXED in the AI Tools Integration section.
```

---

### Phase 3 Prompt: UX Polish & Performance

```
You are implementing UX and performance improvements for the VoiceFit Coach Web Dashboard based on an audit at docs/audits/WEB_DASHBOARD_AUDIT.md.
READ IT FIRST for full context.

EXECUTE ONLY PHASE 3: UX POLISH & PERFORMANCE

## Issue TR-1: Implement Optimistic Updates

Locations: All mutation calls across dashboard pages

TASKS:
1. Add optimistic updates to these mutations:

   a) inviteClient (apps/web/src/app/dashboard/clients/new/page.tsx):
      - Show the new client in the list immediately
      - Roll back on error

   b) sendMessage (apps/web/src/app/dashboard/messages/page.tsx):
      - Show message in conversation immediately
      - Add "sending..." indicator
      - Roll back on error with "failed to send" badge

   c) updateProfile (apps/web/src/app/dashboard/settings/page.tsx):
      - Update form state immediately
      - Show "Saving..." then "Saved" indicator
      - Roll back on error

2. Use React Query's onMutate, onError, onSettled pattern for all

## Issue TR-2: Configure Query Refetching

Location: apps/web/src/app/layout.tsx

TASKS:
1. Enable refetchOnWindowFocus for dashboard data queries:
   - getDashboardSummary
   - getClientList
   - getConversations
   - getAnalyticsSummary

2. Add refetchInterval for real-time data:
   - Messages: 30 seconds when conversation selected
   - Dashboard metrics: 5 minutes

3. Keep staleTime at 5 minutes to avoid excessive refetches

## Issue TR-3: Improve Error Messages

Location: apps/web/src/components/ui/ErrorMessage.tsx and all pages

TASKS:
1. Update ErrorMessage component to parse TRPCClientError:
   - Extract field-specific errors when available
   - Show more helpful messages based on error codes
   - Map common errors to user-friendly messages:
     - UNAUTHORIZED → "Please log in to continue"
     - NOT_FOUND → "The requested item was not found"
     - FORBIDDEN → "You don't have permission to do this"
     - BAD_REQUEST → Show field-specific validation errors

2. Add toast notifications for success/error on mutations:
   - Use a simple toast system (can add to existing UI components)
   - Show success toasts for: profile saved, message sent, client invited, program created
   - Show error toasts with specific messages

## Issue AU-1: Add Auth Loading State

Location: apps/web/src/app/layout.tsx or create apps/web/src/providers/AuthProvider.tsx

TASKS:
1. Create an AuthProvider that:
   - Checks auth state on mount
   - Shows a full-page loading spinner while checking
   - Prevents flash of unauthenticated content

2. Wrap the dashboard layout with AuthProvider

3. Add a subtle loading indicator in the header while auth is being verified

REQUIREMENTS:
- Do NOT break existing functionality
- Run `npm run build` in apps/web after implementation
- All existing tests must continue passing
- Follow existing code patterns

OUTPUT:
After completing fixes, update docs/audits/WEB_DASHBOARD_AUDIT.md to mark TR-1, TR-2, TR-3, and AU-1 as ✅ FIXED.
```

---

### Phase 4 Prompt: Settings & Scheduling

```
You are implementing settings and scheduling features for the VoiceFit Coach Web Dashboard based on an audit at docs/audits/WEB_DASHBOARD_AUDIT.md.
READ IT FIRST for full context.

EXECUTE ONLY PHASE 4: SETTINGS & SCHEDULING

## Issue FC-3: Wire Up Settings Features

Location: apps/web/src/app/dashboard/settings/page.tsx

TASKS:

### Part A: Notification Preferences
1. Create tRPC endpoint `updateNotificationPreferences`:
   - Params: { emailNotifications, pushNotifications, smsNotifications, weeklyDigest }
   - Store in user_preferences table or profile metadata
2. Create tRPC endpoint `getNotificationPreferences`
3. Wire up the Notifications tab to save/load real preferences

### Part B: Security Settings
1. Create tRPC endpoint `changePassword`:
   - Params: { currentPassword, newPassword }
   - Use Supabase auth.updateUser
   - Validate current password first
   - Apply password complexity rules (already exist in signup)
2. Wire up password change form to call endpoint
3. Add success/error feedback

### Part C: Appearance Settings
1. Store theme preference in localStorage (dark/light/system)
2. Add theme toggle that actually switches the theme
3. Persist preference across sessions
4. Apply theme on page load before render (avoid flash)

### Part D: Billing (Mock with Clear Labels)
1. Keep billing UI but clearly mark as "Coming Soon"
2. Add "Contact support to manage billing" message
3. Do NOT implement Stripe integration in this phase

## Issue FC-4: Implement Upcoming Sessions

Location: apps/web/src/app/dashboard/page.tsx and backend

TASKS:
1. Create database table `scheduled_sessions` if not exists:
   - id, coach_id, client_id, scheduled_at, duration_minutes, session_type, notes, status

2. Create tRPC endpoints:
   a) `getUpcomingSessions`:
      - Returns next 5 sessions for the coach
      - Includes client name, time, session type

   b) `scheduleSession`:
      - Params: clientId, scheduledAt, durationMinutes, sessionType, notes

   c) `cancelSession`:
      - Params: sessionId

3. Update dashboard home to display real upcoming sessions:
   - Show date, time, client name, session type
   - Add "Schedule Session" quick action
   - Empty state: "No upcoming sessions - schedule one now"

4. Add simple "Schedule Session" modal accessible from dashboard

REQUIREMENTS:
- Do NOT integrate with external calendar services (that's future scope)
- Keep billing as mock/placeholder with clear "Coming Soon" labels
- Run `npm run build` in apps/web after implementation
- All existing tests must continue passing

OUTPUT:
After completing fixes, update docs/audits/WEB_DASHBOARD_AUDIT.md to mark FC-3 and FC-4 as ✅ FIXED in the Feature Completeness section.
```

---

### Phase 5 Prompt: Accessibility & Polish

```
You are implementing accessibility improvements for the VoiceFit Coach Web Dashboard based on an audit at docs/audits/WEB_DASHBOARD_AUDIT.md.
READ IT FIRST for full context.

EXECUTE ONLY PHASE 5: ACCESSIBILITY & POLISH

## Issue UX-1: Add ARIA Labels to Icon-Only Buttons

TASKS:
1. Audit all pages for icon-only buttons (buttons with only an icon, no text)
2. Add aria-label to each one describing the action:

   Known locations:
   - `/dashboard/clients/page.tsx:137` - MoreVertical icon → aria-label="More actions"
   - `/dashboard/messages/page.tsx:178-186` - Phone/Video icons → aria-label="Start phone call" / "Start video call"

3. Search for other icon-only buttons across:
   - All dashboard pages
   - Navigation components
   - Card action buttons

4. Pattern to follow:
   ```tsx
   <button aria-label="Description of action">
     <Icon />
   </button>
   ```

## Issue UX-2: Implement Focus Trapping for Modals

TASKS:
1. Identify all modal/dialog components in the codebase
2. Implement focus trapping:
   - When modal opens, focus moves to first focusable element
   - Tab cycles through modal elements only
   - Escape key closes modal
   - When modal closes, focus returns to trigger element

3. If using a modal component library, ensure it has focus trap enabled
4. If custom modals, use a focus-trap library or implement manually

## Issue UX-3: Verify Color Contrast

TASKS:
1. Review CSS variables in apps/web/src/app/globals.css:
   - text-text-primary
   - text-text-secondary
   - text-text-tertiary

2. Ensure contrast ratios meet WCAG AA:
   - Normal text: 4.5:1 minimum
   - Large text (18px+ or 14px bold): 3:1 minimum

3. Adjust any colors that don't meet requirements
4. Document the contrast ratios in a comment in globals.css

## Issue UX-4: Add Skip-to-Content Link

Location: apps/web/src/app/layout.tsx or main layout component

TASKS:
1. Add a skip link as the first focusable element:
   ```tsx
   <a href="#main-content" className="skip-link">
     Skip to main content
   </a>
   ```

2. Add CSS to hide visually but show on focus:
   ```css
   .skip-link {
     position: absolute;
     left: -9999px;
     z-index: 999;
     padding: 1em;
     background: var(--background-primary);
     color: var(--text-primary);
   }
   .skip-link:focus {
     left: 0;
   }
   ```

3. Add id="main-content" to the main content area

## Issue BP-1: Fix ESLint Plugin Conflict

Location: Root .eslintrc.cjs

TASKS:
1. Review ESLint configuration
2. Remove duplicate react-hooks plugin declaration
3. Ensure eslint-config-next provides react-hooks rules
4. Run `npm run lint` to verify no config errors

REQUIREMENTS:
- Test all changes with keyboard navigation
- Run accessibility audit tool (axe-core) if available
- Do NOT change visual design significantly
- Run `npm run build` in apps/web after implementation
- All existing tests must continue passing

OUTPUT:
After completing fixes, update docs/audits/WEB_DASHBOARD_AUDIT.md to mark UX-1, UX-2, UX-3, UX-4, and BP-1 as ✅ FIXED.
```

---

## Execution Order & Dependencies

```
Phase 1 (Feature Gaps)
    ↓
Phase 2 (AI Integration) ← depends on Phase 1 (messages endpoint needed)
    ↓
Phase 3 (UX Polish) ← can run in parallel with Phase 2
    ↓
Phase 4 (Settings) ← independent, can run after Phase 1
    ↓
Phase 5 (Accessibility) ← run last, polish pass
```

**Recommended Execution:**
1. **Phase 1** first (prerequisite for Phase 2)
2. **Phase 3** and **Phase 4** can run in parallel after Phase 1
3. **Phase 2** after Phase 1 (needs messages endpoint)
4. **Phase 5** last (final polish)

---

## Success Criteria

After all phases complete:

- [ ] All 18 issues marked as ✅ FIXED in audit document
- [ ] `npm run build` passes with 0 errors
- [ ] All existing tests continue to pass
- [ ] No new TypeScript errors introduced
- [ ] No regressions in existing functionality

---

## Cost & Time Summary

| Phase | Issues | Est. Cost | Est. Time |
|-------|--------|-----------|-----------|
| Phase 1 | FC-1, FC-2 | $12-18 | 45-75 min |
| Phase 2 | AI-1 to AI-4 | $15-25 | 60-90 min |
| Phase 3 | TR-1 to TR-3, AU-1 | $10-15 | 40-60 min |
| Phase 4 | FC-3, FC-4 | $12-18 | 50-80 min |
| Phase 5 | UX-1 to UX-4, BP-1 | $8-12 | 30-50 min |
| **Total** | **18 issues** | **$57-88** | **225-355 min** |

---

*Plan generated from WEB_DASHBOARD_AUDIT.md on 2026-01-19*
