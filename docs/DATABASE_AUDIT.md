# Supabase Database Audit

**Generated:** 2026-01-20

## Executive Summary

The database contains a mix of:
- **3 active demo accounts** (with Supabase auth)
- **48 database user records** (many are orphaned test records)
- **Significant test data** accumulated from automated testing

---

## 1. Supabase Auth Users (3 accounts)

These are the only users that can actually log in:

| Email | ID | Name | Role | Last Sign In |
|-------|-----|------|------|--------------|
| `coach@voicefit.demo` | `3d724155-471e-4098-aea7-a1243286d8e0` | Demo Coach | Coach | 2026-01-20 |
| `client1@voicefit.demo` | `821914ad-2a50-4196-a5b3-a507baedb7d6` | Alex Johnson | Client | Never |
| `client2@voicefit.demo` | `4494fa6a-6802-471e-915f-a33efc69ac81` | Sam Williams | Client | Never |

**Password for all:** `testpass123`

---

## 2. Database Users (48 records)

### Active Demo Users (3)
| Email | Tier | Has Auth |
|-------|------|----------|
| `coach@voicefit.demo` | coach | ✅ |
| `client1@voicefit.demo` | premium | ✅ |
| `client2@voicefit.demo` | premium | ✅ |

### Seeded Test Users (5) - NO AUTH
These exist in database but cannot login (no Supabase auth record):

| Email | Tier | Purpose |
|-------|------|---------|
| `test-free-athlete@voicefit.ai` | free | Integration testing |
| `test-premium-athlete@voicefit.ai` | premium | Integration testing |
| `test-coach@voicefit.ai` | coach | Integration testing |
| `test-client-1@voicefit.ai` | premium | Integration testing |
| `test-client-2@voicefit.ai` | premium | Integration testing |

### Orphaned Test Records (40+)
E2E and integration test users with timestamped emails:
- `*@test.local` - E2E test users
- `*@integration.test` - Integration test users
- `badge-unlocker-*@test.local` - Badge testing users

---

## 3. Coach-Client Relationships (5 total)

| Coach | Client | Status |
|-------|--------|--------|
| `coach@voicefit.demo` | `client1@voicefit.demo` | active |
| `coach@voicefit.demo` | `client2@voicefit.demo` | active |
| `test-coach@voicefit.ai` | `test-client-1@voicefit.ai` | active |
| `test-coach@voicefit.ai` | `test-client-2@voicefit.ai` | active |
| `test-coach@voicefit.ai` | `test-premium-athlete@voicefit.ai` | active |

---

## 4. Data Inventory by Table

### Core Tables
| Table | Record Count | Notes |
|-------|--------------|-------|
| `users` | 48 | 3 active, 45 orphaned |
| `user_profiles` | 37 | Linked to users |
| `coach_clients` | 5 | Coach-client relationships |

### Workout Data
| Table | Record Count | Notes |
|-------|--------------|-------|
| `exercises` | 43 | Mix of seeded + test |
| `workouts` | 156 | Mostly test data |
| `workout_sets` | 544 | Workout exercise sets |

### Program Data
| Table | Record Count | Notes |
|-------|--------------|-------|
| `training_programs` | 8 | Template programs |
| `program_weeks` | 48 | 6 weeks per program |
| `program_days` | 90 | Training days |

### Communication
| Table | Record Count | Notes |
|-------|--------------|-------|
| `conversations` | 727 | AI chat sessions |
| `messages` | 858 | Chat messages |
| `coach_notes` | 2 | Coach annotations |

### Activity & Gamification
| Table | Record Count | Notes |
|-------|--------------|-------|
| `running_activities` | 58 | Running workouts |
| `running_shoes` | 2 | Shoe tracking |
| `readiness_scores` | 90 | Daily readiness |
| `user_streaks` | 9 | Workout streaks |
| `user_badges` | 30 | Earned badges |
| `badge_definitions` | 17 | Available badges |

---

## 5. Data Ownership Summary

### `coach@voicefit.demo` (Demo Coach)
- **Tier:** coach
- **Clients:** 2 (client1, client2)
- **Workouts:** 0
- **Programs:** 0
- **Conversations:** 0

### `test-premium-athlete@voicefit.ai` (Integration Test User)
- **Tier:** premium
- **Coach:** test-coach@voicefit.ai
- **Workouts:** ~50+ (Voice Workout, Push Day, etc.)
- **Conversations:** 10+ (Push Day Planning, Workout Planning)
- **Running Activities:** Associated
- **Badges:** Associated

### `test-client-1@voicefit.ai` & `test-client-2@voicefit.ai`
- **Tier:** premium
- **Coach:** test-coach@voicefit.ai
- **Conversations:** Many "Coach Message" records

---

## 6. Recommendations

### For Demo Testing
Use these credentials:
```
Coach:   coach@voicefit.demo / testpass123
Client:  client1@voicefit.demo / testpass123
Client:  client2@voicefit.demo / testpass123
```

### Data Cleanup Opportunities
1. **Orphaned users:** 40+ test users with no auth record
2. **Duplicate exercises:** Some exercises appear multiple times
3. **Test conversations:** 700+ conversation records from testing
4. **Stale workout data:** 156 workouts, mostly from tests

### To Create Additional Auth Users
Run the sync script to match database users with Supabase auth:
```bash
node scripts/create-test-users.mjs
node scripts/sync-auth-users.mjs
```

---

## 7. Schema Reference

Key relationships:
```
users (1) ──── (1) user_profiles
users (1) ──── (*) workouts
users (1) ──── (*) conversations
users (1) ──── (*) running_activities
users (1) ──── (*) readiness_scores
users (1) ──── (*) user_badges
users (1) ──── (*) user_streaks

coach_clients: coach_id (users) ──── client_id (users)
conversations (1) ──── (*) messages
workouts (1) ──── (*) workout_sets
training_programs (1) ──── (*) program_weeks
program_weeks (1) ──── (*) program_days
```
