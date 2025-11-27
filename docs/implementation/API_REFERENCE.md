# VoiceFit tRPC API Reference

**Backend:** `apps/backend/src/routers/`
**Total Routers:** 23
**Estimated Endpoints:** ~120

---

## Router Summary

| Router | File | Status | Key Endpoints |
|--------|------|--------|---------------|
| auth | `auth.ts` | ✅ | getSession, signOut |
| exercise | `exercise.ts` | ✅ | search, getById, create, list |
| workout | `workout.ts` | ✅ | start, end, logSet, getHistory |
| voice | `voice.ts` | ✅ | parse, parseStream |
| coach | `coach.ts` | ✅ | message, streamMessage, startWorkout |
| readiness | `readiness.ts` | ✅ | create, getToday, getHistory |
| program | `program.ts` | ✅ | generate, getActive, list |
| calendar | `calendar.ts` | ✅ | getEntries, activateProgram, reschedule |
| injury | `injury.ts` | ✅ | log, getHistory, analyze |
| onboarding | `onboarding.ts` | ✅ | getStatus, updateStep, complete |
| gamification | `gamification.ts` | ✅ | getBadges, getStreaks, checkUnlocks |
| search | `search.ts` | ✅ | exercises, knowledge |
| conversations | `conversations.ts` | ✅ | create, list, getMessages |
| knowledge | `knowledge.ts` | ✅ | search, getByCategory |
| substitutions | `substitutions.ts` | ✅ | findAlternatives, getForExercise |
| nutrition | `nutrition.ts` | ✅ | getSummary, getGoals, log |
| running | `running.ts` | ✅ | start, end, getHistory, getPrograms |
| social | `social.ts` | ✅ | getFriends, sendRequest, getFeed |
| analytics | `analytics.ts` | ✅ | getVolume, getTrends, getInsights |
| wearables | `wearables.ts` | ✅ | connect, sync, getMetrics |
| devices | `devices.ts` | ✅ | register, list, updatePushToken |
| wods | `wods.ts` | ✅ | list, log, getBenchmarks |

---

## Detailed Endpoint Reference

### auth
```typescript
auth.getSession()          // Get current user session
auth.signOut()             // Sign out current user
```

### exercise
```typescript
exercise.search({ query, filters })       // Search exercises
exercise.getById({ id })                  // Get exercise details
exercise.list({ page, limit, muscle })    // List with filters
exercise.create({ name, muscles, ... })   // Create custom exercise
```

### workout
```typescript
workout.start({ name?, programDayId? })   // Start new workout
workout.end({ id, notes? })               // End workout
workout.logSet({ workoutId, exerciseId, weight, reps, rpe? })
workout.getActive()                       // Get active workout
workout.getHistory({ page, limit })       // Get past workouts
workout.getById({ id })                   // Get workout details
```

### voice
```typescript
voice.parse({ transcript, workoutId? })           // Parse voice command
voice.parseStream({ transcript })                 // Parse with streaming
```

### coach
```typescript
coach.message({ message, conversationId? })       // Send message to AI coach
coach.streamMessage({ message })                  // Stream AI response
coach.startWorkout()                              // Tell coach starting workout
coach.endWorkout()                                // Tell coach ending workout
coach.classify({ message })                       // Classify message intent
```

### readiness
```typescript
readiness.create({ score, factors })              // Log daily readiness
readiness.getToday()                              // Get today's readiness
readiness.getHistory({ days })                    // Get readiness history
```

### program
```typescript
program.generate({ questionnaire })               // Generate AI program
program.getActive()                               // Get active program
program.list()                                    // List all programs
program.getById({ id })                           // Get program details
```

### calendar
```typescript
calendar.getEntries({ startDate, endDate })       // Get calendar entries
calendar.getToday()                               // Get today's workouts
calendar.getUpcoming({ limit })                   // Get upcoming workouts
calendar.submitQuestionnaire({ data })            // Submit for program gen
calendar.activateProgram({ programId, startDate }) // Activate program
calendar.pauseProgram({ programId })              // Pause program
calendar.completeEntry({ entryId, workoutId? })   // Mark complete
calendar.skipEntry({ entryId, reason? })          // Skip workout
calendar.rescheduleEntry({ entryId, newDate })    // Move workout
calendar.getAdherenceStats({ programId?, period })
```

### injury
```typescript
injury.log({ bodyPart, severity, description })   // Log injury
injury.getHistory()                               // Get injury history
injury.analyze({ symptoms })                      // AI injury analysis
injury.getActive()                                // Get active injuries
```

### onboarding
```typescript
onboarding.getStatus()                            // Get onboarding state
onboarding.updateStep({ step, data })             // Update step data
onboarding.complete()                             // Mark complete
```

### gamification
```typescript
gamification.getBadges()                          // Get user's badges
gamification.getStreaks()                         // Get active streaks
gamification.checkUnlocks()                       // Check for new badges
gamification.getAllBadges()                       // Get badge definitions
```

### search
```typescript
search.exercises({ query, limit })                // Search exercises (Upstash)
search.knowledge({ query, category })             // Search knowledge base
```

### conversations
```typescript
conversations.create({ type })                    // Start new conversation
conversations.list({ page, limit })               // Get conversations
conversations.getMessages({ conversationId })     // Get messages
conversations.archive({ id })                     // Archive conversation
```

### knowledge
```typescript
knowledge.search({ query, category })             // Search knowledge base
knowledge.getByCategory({ category })             // Get by category
knowledge.getCategories()                         // List categories
```

### substitutions
```typescript
substitutions.findAlternatives({ exerciseId, reason, equipment? })
substitutions.getForExercise({ exerciseId })      // Get stored subs
```

### nutrition
```typescript
nutrition.getSummary({ date })                    // Get day's nutrition
nutrition.getGoals()                              // Get nutrition goals
nutrition.setGoals({ calories, protein, ... })    // Set goals
nutrition.log({ date, data })                     // Log nutrition data
```

### running
```typescript
running.start({ type?, shoeId? })                 // Start run
running.end({ id, route, splits })                // End run
running.addLocation({ runId, lat, lng, ... })     // Add GPS point
running.getHistory({ page, limit })               // Get run history
running.getById({ id })                           // Get run details
running.getPrograms()                             // Get running programs
running.getPRs()                                  // Get running PRs
```

### social
```typescript
social.getFriends()                               // Get friends list
social.sendRequest({ userId })                    // Send friend request
social.acceptRequest({ requestId })               // Accept request
social.getFeed({ page })                          // Get activity feed
social.like({ activityId })                       // Like activity
social.comment({ activityId, text })              // Comment on activity
```

### analytics
```typescript
analytics.getVolume({ period })                   // Get volume stats
analytics.getWeekly({ weeks })                    // Get weekly analytics
analytics.getExerciseStats({ exerciseId })        // Exercise analytics
analytics.getTrends({ period })                   // Get trend data
analytics.getInsights()                           // Get AI insights
analytics.getBodyPartVolume({ weeks })            // Volume by body part
```

### wearables
```typescript
wearables.connect({ provider })                   // Connect wearable
wearables.disconnect({ connectionId })            // Disconnect
wearables.sync({ connectionId })                  // Trigger sync
wearables.getConnections()                        // Get connections
wearables.getMetrics({ date })                    // Get health metrics
wearables.getSleep({ date })                      // Get sleep data
```

### devices
```typescript
devices.register({ deviceId, info })              // Register device
devices.list()                                    // List user devices
devices.updatePushToken({ deviceId, token })      // Update push token
devices.deactivate({ deviceId })                  // Deactivate device
```

### wods (CrossFit - Backend Only)
```typescript
wods.list({ type?, benchmark? })                  // List WODs
wods.log({ wodId, result })                       // Log WOD result
wods.getBenchmarks()                              // Get user benchmarks
wods.getLeaderboard({ wodId })                    // WOD leaderboard
```

---

## Authentication

All endpoints (except auth) require authentication via Supabase JWT.

```typescript
// tRPC context
ctx.user.id      // User UUID
ctx.user.email   // User email
ctx.db           // Drizzle database instance
```

---

## Error Handling

Standard tRPC errors:
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Not allowed
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error

---

## Rate Limiting

| Tier | Default | AI Endpoints |
|------|---------|--------------|
| Free | 60/hour | 10/minute |
| Premium | 300/hour | 50/minute |
| Coach | 500/hour | 100/minute |

**Rate-limited endpoints:**
- `coach.message`
- `coach.streamMessage`
- `program.generate`
- `voice.parse`
- `injury.analyze`
