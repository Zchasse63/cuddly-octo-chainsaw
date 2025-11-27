# VoiceFit Future Plans

This document outlines features planned for future releases but not yet in active development.

---

## Apple Watch App

### Overview

A companion Apple Watch app for VoiceFit will enable:
- Quick workout logging from the wrist
- Voice commands via Siri integration
- Workout mirroring from iPhone
- Standalone run tracking with GPS
- Complications for streak tracking

### Priority: High
### Target: v3.0
### Estimated Effort: 6-8 weeks

---

### Planned Features

#### 1. Watch Complications

| Complication | Size | Content |
|--------------|------|---------|
| Circular | Small | Current streak number |
| Corner | Small | Streak with ring progress |
| Rectangular | Medium | Week summary + streak |
| Graphic | Large | Weekly bar chart |

**Design Spec:**
```
┌─────────────────┐
│   🔥 7 days     │  ← Circular (streak count)
└─────────────────┘

┌─────────────────┐
│ ████░░░ 5/7     │  ← Rectangular (weekly progress)
│ This week       │
└─────────────────┘
```

#### 2. Quick Log (Watch App)

Primary screen for logging sets without voice:

```
┌─────────────────────┐
│   Bench Press    ▼  │  ← Exercise picker (Digital Crown)
├─────────────────────┤
│                     │
│      185 lbs        │  ← Weight (tap to edit)
│                     │
│        × 8          │  ← Reps (tap to edit)
│                     │
├─────────────────────┤
│      [ LOG ]        │  ← Confirm button
└─────────────────────┘
```

**Interaction Model:**
- Digital Crown scrolls through exercises (recently used first)
- Tap weight/reps to edit with +/- buttons
- "LOG" button confirms and shows brief success animation
- Haptic feedback on all interactions

#### 3. Voice Logging (Siri)

Siri Shortcuts integration for hands-free logging:

**Supported Commands:**
```
"Hey Siri, log bench press 185 for 8"
"Hey Siri, log my workout"
"Hey Siri, what's my streak?"
"Hey Siri, start a run with VoiceFit"
```

**Implementation:**
- SiriKit Intents for workout logging
- App Intents framework (iOS 16+)
- Shortcuts app integration

#### 4. Workout Mirror

When workout is active on iPhone, Watch shows:

```
┌─────────────────────┐
│ ● PUSH DAY         │  ← Synced workout name
├─────────────────────┤
│   Bench Press       │
│   Set 2 of 4        │
│                     │
│   185 lbs × 8       │  ← Current set
│                     │
│     0:45 rest       │  ← Rest timer
├─────────────────────┤
│  [DONE] [SKIP]     │
└─────────────────────┘
```

**Sync Method:**
- WatchConnectivity framework
- Real-time bidirectional sync
- Works when iPhone is nearby

#### 5. Standalone Run Tracking

GPS run tracking without iPhone:

```
┌─────────────────────┐
│      2.34 mi        │  ← Distance
│                     │
│     18:42           │  ← Elapsed time
│                     │
│   8:02 /mi          │  ← Current pace
├─────────────────────┤
│ ❤️ 156 bpm          │  ← Heart rate
├─────────────────────┤
│  [PAUSE]  [END]     │
└─────────────────────┘
```

**Features:**
- Onboard GPS tracking
- Heart rate monitoring
- Audio cues for pace/distance (AirPods)
- Auto-pause detection
- Route mapping (synced to iPhone)

---

### Technical Architecture

#### Project Structure

```
apps/
├── mobile/           # Existing iPhone app
└── watch/            # New Watch app
    ├── VoiceFitWatch/
    │   ├── VoiceFitWatchApp.swift
    │   ├── ContentView.swift
    │   ├── Views/
    │   │   ├── QuickLogView.swift
    │   │   ├── WorkoutMirrorView.swift
    │   │   ├── RunTrackingView.swift
    │   │   └── SettingsView.swift
    │   ├── Complications/
    │   │   └── ComplicationViews.swift
    │   └── Services/
    │       ├── WatchConnectivityService.swift
    │       ├── HealthKitService.swift
    │       └── WorkoutService.swift
    └── VoiceFitWatch.xcodeproj
```

#### Data Sync Strategy

```
                    ┌─────────────┐
                    │   iCloud    │
                    │  CloudKit   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────┴──────┐          ┌──────┴──────┐
       │   iPhone    │◄────────►│   Watch     │
       │ VoiceFit    │  Watch   │ VoiceFit    │
       │             │  Connect │             │
       └─────────────┘          └─────────────┘
              │                         │
              │                         │
       ┌──────┴──────┐          ┌──────┴──────┐
       │  HealthKit  │          │  HealthKit  │
       │   (Phone)   │          │   (Watch)   │
       └─────────────┘          └─────────────┘
```

**Sync Priorities:**
1. **WatchConnectivity** - Real-time when devices are connected
2. **CloudKit** - Background sync for offline changes
3. **HealthKit** - Workout data shared via Apple ecosystem

#### Key Dependencies

```swift
// watchOS Frameworks
import WatchKit
import WatchConnectivity
import HealthKit
import CoreLocation
import SiriKit
import WidgetKit
```

---

### Development Phases

#### Phase 1: Foundation (Week 1-2)
- [ ] Create watchOS target in Xcode
- [ ] Set up WatchConnectivity between iPhone and Watch
- [ ] Basic UI shell with navigation
- [ ] Shared data models

#### Phase 2: Quick Log (Week 2-3)
- [ ] Exercise picker with Digital Crown
- [ ] Weight/reps input controls
- [ ] Confirm and sync to iPhone
- [ ] Success/error feedback

#### Phase 3: Workout Mirror (Week 3-4)
- [ ] Real-time workout state sync
- [ ] Rest timer display
- [ ] Set completion from Watch
- [ ] Haptic notifications

#### Phase 4: Complications (Week 4-5)
- [ ] Streak complication (all sizes)
- [ ] Weekly progress complication
- [ ] Timeline entries for updates
- [ ] Tap-to-open actions

#### Phase 5: Run Tracking (Week 5-7)
- [ ] GPS location tracking
- [ ] HealthKit workout sessions
- [ ] Heart rate monitoring
- [ ] Audio feedback (WorkoutKit)
- [ ] Post-run summary

#### Phase 6: Siri Integration (Week 7-8)
- [ ] Define App Intents
- [ ] Voice command parsing
- [ ] Shortcuts integration
- [ ] Response confirmation

---

### Design Guidelines

Follow Apple Watch Human Interface Guidelines:

1. **Glanceable** - Information visible at a glance
2. **Actionable** - Clear, tappable targets (44pt minimum)
3. **Responsive** - Immediate haptic/visual feedback
4. **Lightweight** - Quick interactions, no typing

**Color Palette (Watch):**
```swift
extension Color {
    static let voiceFitBlue = Color(hex: "007AFF")
    static let voiceFitGreen = Color(hex: "34C759")
    static let voiceFitOrange = Color(hex: "FF9500")
    static let voiceFitRed = Color(hex: "FF3B30")
}
```

**Typography:**
- Large Title: SF Rounded Bold, 34pt
- Headline: SF Pro Bold, 17pt
- Body: SF Pro Regular, 15pt
- Caption: SF Pro Regular, 12pt

---

### Success Metrics

| Metric | Target |
|--------|--------|
| Watch app daily active users | 30% of iPhone DAU |
| Sets logged from Watch | 15% of total |
| Complication adoption | 40% of Watch users |
| Standalone run completion rate | >90% |
| Siri command success rate | >85% |

---

### Prerequisites

Before starting Apple Watch development:

1. **Apple Developer Account** with watchOS capabilities
2. **Physical Apple Watch** for testing (Simulator limited)
3. **Xcode 15+** with watchOS 10 SDK
4. **iPhone app stable** with core features complete

---

### Open Questions

1. Should Watch app work standalone (without iPhone nearby)?
   - **Recommendation:** Yes, for run tracking; No, for strength workouts

2. How to handle conflicts when both devices edit same workout?
   - **Recommendation:** Last-write-wins with conflict UI on iPhone

3. Should we support older watchOS versions?
   - **Recommendation:** watchOS 9+ only (for modern SwiftUI features)

---

## Other Future Features

### Home Screen Widgets (iOS)

| Widget | Size | Content |
|--------|------|---------|
| Streak | Small | Current streak with flame icon |
| Weekly | Medium | Bar chart of workouts this week |
| Next Workout | Medium | Suggested workout based on schedule |
| Quick Log | Large | Recent exercises with log buttons |

**Priority:** Medium
**Target:** v2.5

---

### Social Features

- **Workout sharing** - Share completed workouts to social media
- **Challenges** - Compete with friends on volume/frequency
- **Leaderboards** - Weekly/monthly rankings
- **Gym buddies** - See when friends are working out

**Priority:** Low
**Target:** v3.5

---

### AI Coaching Enhancements

- **Form analysis** - Video recording with AI feedback
- **Program generation** - Personalized workout plans
- **Recovery predictions** - Based on sleep/HRV data
- **Plateau detection** - Automatic deload suggestions

**Priority:** Medium
**Target:** v3.0

---

*Last Updated: November 2025*
*Document Owner: Product Team*
