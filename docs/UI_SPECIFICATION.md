# VoiceFit UI Specification

**Purpose:** Complete reference for rebuilding VoiceFit with identical UI/UX
**Generated:** 2025-01-25
**Source:** Extracted from current mobile app codebase

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Sizing](#4-spacing--sizing)
5. [Shadows & Elevation](#5-shadows--elevation)
6. [Border Radius](#6-border-radius)
7. [Animation System](#7-animation-system)
8. [Component Library](#8-component-library)
9. [Screen Inventory](#9-screen-inventory)
10. [Haptic Feedback](#10-haptic-feedback)

---

## 1. Design Philosophy

VoiceFit follows these design principles:

1. **MacroFactor-Inspired:** Clean, data-driven aesthetic with selective color pops
2. **iOS Standard:** Uses SF Pro font and iOS-style shadows/spacing
3. **Dark Mode First:** Comprehensive dark theme with brightness-adjusted accent colors
4. **Semantic Naming:** Colors grouped by purpose (state, semantic, component-specific)
5. **8pt Grid System:** All spacing values are multiples of 8px
6. **Accessibility:** Proper contrast ratios and hierarchical text sizing
7. **Performance:** Spring-based animations with physics-based motion
8. **Voice-First:** UI optimized for minimal visual interaction during workouts

---

## 2. Color System

### 2.1 Light Theme

```typescript
const lightColors = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',      // Main background
    secondary: '#F8F9FA',    // Cards, sections
    tertiary: '#E9ECEF',     // Subtle dividers
  },

  // Text
  text: {
    primary: '#000000',      // Headlines
    secondary: '#495057',    // Body text
    tertiary: '#6C757D',     // Labels, captions
    disabled: '#ADB5BD',     // Disabled states
    inverse: '#FFFFFF',      // White text on dark backgrounds
    onAccent: '#FFFFFF',     // Text on accent backgrounds
  },

  // Icons
  icon: {
    primary: '#000000',
    secondary: '#495057',
    disabled: '#ADB5BD',
    onAccent: '#FFFFFF',
  },

  // Accent Colors (Selective Pops)
  accent: {
    blue: '#007AFF',         // Primary actions, iOS blue
    coral: '#FF6B6B',        // Data emphasis, MacroFactor style
    orange: '#FF9500',       // Warnings, streaks
    green: '#34C759',        // Success, PRs, run start
    purple: '#AF52DE',       // Data visualization
    teal: '#5AC8FA',         // Data visualization
    yellow: '#FFCC00',       // Data visualization
    red: '#FF3B30',          // Errors, destructive actions
  },

  // Semantic Aliases
  semantic: {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
  },

  // Borders
  border: {
    primary: '#DEE2E6',
    subtle: '#E9ECEF',
    light: '#E9ECEF',
    medium: '#6C757D',
  },

  // Soft Background Tints
  tint: {
    info: '#DBEAFE',
    success: '#DCFCE7',
    warning: '#FEF3C7',
    warningAlt: '#FFEFD5',
    danger: '#FEE2E2',
    accent: 'rgba(96, 165, 250, 0.15)',
    accentSubtle: 'rgba(37, 99, 235, 0.08)',
  },

  // Badge Colors
  badge: {
    background: '#E9ECEF',
    text: '#495057',
    border: '#DEE2E6',
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    platinum: '#E5E4E2',
  },

  // Chat Bubbles
  chat: {
    userBubble: '#007AFF',
    aiBubble: '#F8F9FA',
    userText: '#FFFFFF',
    aiText: '#000000',
  },

  // Overlays
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.5)',
    scrimStrong: 'rgba(0, 0, 0, 0.8)',
    shimmer: 'rgba(255, 255, 255, 0.3)',
  },

  // States
  state: {
    hover: '#F8F9FA',
    pressed: '#E9ECEF',
    danger: '#FF3B30',
  },

  // Notebook Style (for workout logging)
  notebook: {
    background: '#FFFEF5',   // Cream paper
    ruledLine: '#E0E0E0',
    redLine: '#FF6B6B',
    holePunch: '#D1D5DB',
  },
};
```

### 2.2 Dark Theme

```typescript
const darkColors = {
  // Backgrounds
  background: {
    primary: '#000000',      // True black
    secondary: '#1C1C1E',    // Dark gray cards
    tertiary: '#2C2C2E',     // Medium gray dividers
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#E5E5E7',
    tertiary: '#98989D',
    disabled: '#48484A',
    inverse: '#000000',
    onAccent: '#000000',
  },

  // Icons
  icon: {
    primary: '#FFFFFF',
    secondary: '#E5E5E7',
    disabled: '#48484A',
    onAccent: '#000000',
  },

  // Accent Colors (Brighter for Dark Mode)
  accent: {
    blue: '#0A84FF',
    coral: '#FF6B6B',
    orange: '#FF9F0A',
    green: '#30D158',
    purple: '#BF5AF2',
    teal: '#64D2FF',
    yellow: '#FFD60A',
    red: '#FF453A',
  },

  // Semantic Aliases
  semantic: {
    primary: '#0A84FF',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
  },

  // Borders
  border: {
    primary: '#3A3A3C',
    subtle: '#2C2C2E',
    light: '#2C2C2E',
    medium: '#48484A',
  },

  // Soft Background Tints
  tint: {
    info: 'rgba(59, 130, 246, 0.18)',
    success: 'rgba(34, 197, 94, 0.18)',
    warning: 'rgba(250, 204, 21, 0.18)',
    warningAlt: 'rgba(249, 172, 96, 0.18)',
    danger: 'rgba(248, 113, 113, 0.18)',
    accent: 'rgba(96, 165, 250, 0.15)',
    accentSubtle: 'rgba(37, 99, 235, 0.08)',
  },

  // Notebook Style (Dark)
  notebook: {
    background: '#1C1C1E',
    ruledLine: '#2C2C2E',
    redLine: '#FF453A',
    holePunch: '#48484A',
  },
};
```

### 2.3 Readiness Score Colors

```typescript
const readinessColors = {
  excellent: { // 8-10
    icon: 'BatteryFull',
    color: '#34C759', // green
    background: 'rgba(52, 199, 89, 0.15)',
  },
  moderate: { // 6-8
    icon: 'BatteryMedium',
    color: '#FFCC00', // yellow
    background: 'rgba(255, 204, 0, 0.15)',
  },
  low: { // 4-6
    icon: 'BatteryLow',
    color: '#FF9500', // orange
    background: 'rgba(255, 149, 0, 0.15)',
  },
  veryLow: { // 0-4
    icon: 'BatteryWarning',
    color: '#FF3B30', // red
    background: 'rgba(255, 59, 48, 0.15)',
  },
};
```

---

## 3. Typography

### 3.1 Font Families

```typescript
const fonts = {
  system: 'System',           // SF Pro (iOS), Roboto (Android)
  notebook: 'Courier New',    // Monospace for workout logging
  heading: 'Inter-Bold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemibold: 'Inter-SemiBold',
};
```

### 3.2 Font Sizes

```typescript
const fontSize = {
  xs: 11,      // Timestamps, captions
  sm: 13,      // Labels, secondary text
  base: 15,    // Body text (iOS standard)
  md: 17,      // Emphasized body
  lg: 20,      // Subheadings
  xl: 24,      // Section headers
  xxl: 26,     // Extra large
  '2xl': 28,   // Screen titles
  '3xl': 34,   // Large titles (MacroFactor "DASHBOARD")
};
```

### 3.3 Font Weights

```typescript
const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};
```

### 3.4 Line Heights

```typescript
const lineHeight = {
  tight: 1.2,    // Headlines
  normal: 1.4,   // Body text
  relaxed: 1.6,  // Long-form content
};
```

---

## 4. Spacing & Sizing

### 4.1 8pt Grid Spacing

```typescript
const spacing = {
  xs: 4,       // Tight spacing
  sm: 8,       // Small gaps
  md: 16,      // Standard padding
  lg: 24,      // Section spacing
  xl: 32,      // Screen padding
  '2xl': 48,   // Large spacing
  '3xl': 64,   // Extra large spacing
};
```

### 4.2 Component Heights

```typescript
const heights = {
  button: {
    sm: 36,
    md: 44,
    lg: 52,
  },
  input: 52,
  tabBar: 83,  // Including safe area
  avatar: {
    sm: 32,
    md: 48,
    lg: 80,
  },
};
```

---

## 5. Shadows & Elevation

### 5.1 iOS-Style Shadows

```typescript
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

## 6. Border Radius

```typescript
const borderRadius = {
  sm: 8,       // Buttons, inputs
  md: 12,      // Cards
  lg: 16,      // Large cards
  xl: 20,      // Hero elements
  '2xl': 22,
  '3xl': 24,
  full: 9999,  // Circular (avatars, pills)
};
```

---

## 7. Animation System

### 7.1 Duration Values

```typescript
const duration = {
  instant: 0,
  fastest: 100,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
};
```

### 7.2 Spring Configurations

```typescript
const springs = {
  gentle: {
    damping: 20,
    stiffness: 90,
    mass: 1,
    // Use for: Subtle UI feedback, gentle transitions
  },
  default: {
    damping: 15,
    stiffness: 150,
    mass: 1,
    // Use for: Most UI animations, button presses
  },
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
    // Use for: Success animations, celebrations, badge unlocks
  },
  snappy: {
    damping: 18,
    stiffness: 250,
    mass: 0.8,
    // Use for: Modal appearances, quick transitions
  },
  wobbly: {
    damping: 8,
    stiffness: 120,
    mass: 1.2,
    // Use for: Attention-grabbing animations, errors
  },
  stiff: {
    damping: 25,
    stiffness: 300,
    mass: 0.8,
    // Use for: Precise movements, drag-and-drop
  },
};
```

### 7.3 Preset Animations

```typescript
const animations = {
  buttonPress: {
    scaleDown: 0.95,
    spring: springs.default,
  },
  successCheckmark: {
    spring: springs.bouncy,
    holdDuration: 1500,
  },
  modal: {
    slideDistance: 500,
    duration: duration.normal,
  },
  skeletonShimmer: {
    duration: 1500,
    easing: 'linear',
  },
  badgeUnlock: {
    spring: springs.bouncy,
    rotateDuration: 1000,
  },
  listStagger: {
    itemDelay: 50,
    slideDistance: 20,
  },
  pullToRefresh: {
    spring: springs.gentle,
    threshold: 80,
  },
  swipeGesture: {
    spring: springs.snappy,
    threshold: 100,
  },
};
```

### 7.4 Scale Values

```typescript
const scale = {
  pressed: 0.96,   // Subtle scale down on press
  hover: 1.02,     // Slight scale up on hover (web)
};
```

---

## 8. Component Library

### 8.1 Core UI Components

#### Button
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress: () => void;
  children: string;
}

// Styling
// Primary: blue bg, white text
// Secondary: secondary bg, primary text
// Ghost: transparent bg, blue text
// Outline: transparent bg, blue text, blue border
// Height: sm=36, md=44, lg=52
// Border radius: 12px
// Font weight: semibold
// Disabled: opacity 0.5
// Pressed: opacity 0.8
```

#### Card
```typescript
interface CardProps {
  variant: 'default' | 'elevated' | 'outlined';
  padding: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
  children: ReactNode;
}

// Styling
// Default: secondary background
// Elevated: secondary bg + medium shadow
// Outlined: transparent bg + light border
// Border radius: 12px
// Padding: none=0, sm=8, md=16, lg=24
```

#### Input
```typescript
interface InputProps {
  type: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
}

// Styling
// Height: 52px
// Border radius: 12px
// Border: 1px light border
// Focus: blue border
// Error: red border
// Font size: base (15px)
// Label: sm (13px), medium weight
```

#### PillBadge
```typescript
interface PillBadgeProps {
  text: string;
  variant: 'primary' | 'secondary' | 'outlined';
  size: 'sm' | 'md';
}

// Styling
// Border radius: 20px (full pill)
// Font weight: semibold
// Size md: px=16, py=8, font=sm (13px)
// Size sm: px=12, py=4, font=xs (11px)
// Primary: blue bg, white text
// Secondary: secondary bg, primary text
// Outlined: transparent, primary text, medium border
```

### 8.2 Common Components

#### Toast
```typescript
interface ToastProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // default 3000
  onHide?: () => void;
}

// Icons: CheckCircle (success), AlertCircle (error), AlertTriangle (warning), Info (info)
// Position: top of screen
// Animation: slide down on show, fade+slide up on hide
// Background: semantic color for type
```

#### StatusBadge
```typescript
interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  label: string;
  showDot?: boolean;
}

// Pill shape with optional colored dot
// Background: soft tint color for status
// Text: semantic color for status
```

#### LoadingSpinner
```typescript
interface LoadingSpinnerProps {
  message?: string; // default "Loading..."
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

// ActivityIndicator with message below
// Color: accent blue
```

#### SkeletonLoader
```typescript
interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

// Pulsing opacity animation: 0.3 to 0.7, 1000ms cycle
// Color: shimmer overlay
```

#### MetricCard
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

// Trend colors: green (up), red (down), gray (neutral)
// Height: default=120px, compact=140px
// Shows chevron if pressable
```

#### Avatar
```typescript
interface AvatarProps {
  size: 'sm' | 'md' | 'lg';
  imageUrl?: string;
  name?: string;
  editable?: boolean;
  onPress?: () => void;
}

// Sizes: sm=32, md=48, lg=80
// Blue background with white initials if no image
// Camera icon overlay if editable
```

#### GlassTabBar
```typescript
// Custom bottom tab bar for React Navigation
// Glassmorphism: semi-transparent background
// Focused tab: shows label, scales to 1.05x
// Haptic feedback on tab press
// SafeAreaView integrated
```

### 8.3 Feature Components

#### ChatBubble
```typescript
// User bubble: blue bg, white text, right-aligned
// AI bubble: light gray bg, black text, left-aligned
// Max width: 75%
// Border radius: 18px (iOS Messages style)
// Padding: horizontal=16, vertical=12
```

#### WorkoutTypeBadge
```typescript
interface WorkoutTypeBadgeProps {
  workoutName: string;
  size: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

// Colored badge with workout type icon
// Types: Push (yellow), Pull (blue), Legs (green), etc.
// 15% opacity background
// Border matches icon color
```

#### ReadinessScoreBadge
```typescript
interface ReadinessScoreBadgeProps {
  score: number; // 0-10
  size: 'small' | 'medium' | 'large';
}

// Battery icon based on score tier
// Excellent (8-10): green, BatteryFull
// Moderate (6-8): yellow, BatteryMedium
// Low (4-6): orange, BatteryLow
// Very Low (<4): red, BatteryWarning
```

---

## 9. Screen Inventory

### 9.1 Authentication Screens
| Screen | Key Elements |
|--------|--------------|
| Login | VF logo, email/password inputs, SSO buttons, forgot password link |
| Sign Up | VF logo, name/email/password inputs, SSO buttons, terms checkbox |
| Forgot Password | Email input, send reset button |

### 9.2 Onboarding Screens
| Screen | Key Elements |
|--------|--------------|
| Welcome | Greeting, conversational prompt |
| Experience Level | Beginner/Intermediate/Advanced selection |
| Training Goals | Multi-select (Strength, Hypertrophy, Endurance, etc.) |
| Equipment | Multi-select (Barbell, Dumbbells, Machines, etc.) |
| Training Frequency | 3-6 days selector |
| Injury History | Text input for injury details |

### 9.3 Main App Screens
| Screen | Key Elements |
|--------|--------------|
| Dashboard | Weekly progress, recent workouts, quick actions |
| Workout Log | Voice recording button, current exercise, set list |
| Programs | Active program card, workout schedule |
| Progress | Charts (volume, PRs), trend badges |
| Profile | Avatar, stats, settings sections |

### 9.4 Workout Screens
| Screen | Key Elements |
|--------|--------------|
| Active Workout | Voice button, exercise name, set logging, timer |
| Exercise Swap | Original exercise, substitute list |
| Rest Timer | Circular progress, time remaining |
| Workout Summary | Sets completed, volume, PRs |

### 9.5 Coach Screens
| Screen | Key Elements |
|--------|--------------|
| AI Coach Chat | Message bubbles, input field, suggested prompts |
| Readiness Check | Slider inputs, submit button |

### 9.6 Running Screens
| Screen | Key Elements |
|--------|--------------|
| Run Active | Map view, pace display, distance, timer |
| Run Summary | Route map, splits, badges earned |
| Running Stats | Weekly distance, pace trends |

---

## 10. Haptic Feedback

```typescript
const haptics = {
  light: 'light',           // Subtle interactions
  medium: 'medium',         // Standard feedback
  heavy: 'heavy',           // Significant actions
  success: 'success',       // Completed actions, PRs
  error: 'error',           // Errors, failures
  warning: 'warning',       // Warnings, alerts
  selection: 'selection',   // Tab selection, toggles
};

// Usage contexts:
// - Tab navigation: selection
// - Button press: light
// - Set logged: success
// - PR achieved: heavy + success
// - Error: error
// - Toggle: selection
// - Long press: medium
```

---

## Implementation Notes

### Icons
- **Library:** Lucide React Native
- **Default size:** 24px
- **Stroke width:** 2

### State Management for Theme
```typescript
const { theme, isDark, colors, setTheme } = useTheme();
// theme: 'light' | 'dark' | 'auto'
// isDark: boolean
// colors: current theme colors
// setTheme: function to change theme
// Persisted to AsyncStorage: @voicefit_theme
```

### Framework Stack
- **Styling:** NativeWind v4.2.1 (Tailwind for React Native)
- **Animation:** React Native Reanimated
- **Navigation:** React Navigation (current) → Expo Router (proposed)
- **Icons:** Lucide React Native v0.552.0

---

## File Reference (Current Codebase)

For detailed implementation, reference these files in the current codebase:

| Purpose | File Path |
|---------|-----------|
| Design Tokens | `/apps/mobile/src/theme/tokens.ts` |
| Animation Config | `/apps/mobile/src/theme/animations.ts` |
| Theme Context | `/apps/mobile/src/theme/ThemeContext.tsx` |
| Tailwind Config | `/apps/mobile/tailwind.config.js` |
| UI Components | `/apps/mobile/src/components/ui/` |
| Common Components | `/apps/mobile/src/components/common/` |
