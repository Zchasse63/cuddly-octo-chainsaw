// VoiceFit Design Tokens
// Based on UI_SPECIFICATION.md

export const lightColors = {
  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    tertiary: '#E9ECEF',
  },

  // Text
  text: {
    primary: '#000000',
    secondary: '#495057',
    tertiary: '#6C757D',
    disabled: '#ADB5BD',
    inverse: '#FFFFFF',
    onAccent: '#FFFFFF',
  },

  // Icons
  icon: {
    primary: '#000000',
    secondary: '#495057',
    disabled: '#ADB5BD',
    onAccent: '#FFFFFF',
  },

  // Accent Colors
  accent: {
    blue: '#007AFF',
    coral: '#FF6B6B',
    orange: '#FF9500',
    green: '#34C759',
    purple: '#AF52DE',
    teal: '#5AC8FA',
    yellow: '#FFCC00',
    red: '#FF3B30',
  },

  // Semantic
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

  // Tints
  tint: {
    info: '#DBEAFE',
    success: '#DCFCE7',
    warning: '#FEF3C7',
    danger: '#FEE2E2',
    accent: 'rgba(96, 165, 250, 0.15)',
  },

  // Chat
  chat: {
    userBubble: '#007AFF',
    aiBubble: '#F8F9FA',
    userText: '#FFFFFF',
    aiText: '#000000',
  },

  // Overlay
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.5)',
    scrimStrong: 'rgba(0, 0, 0, 0.8)',
  },
};

export const darkColors = {
  // Backgrounds
  background: {
    primary: '#000000',
    secondary: '#1C1C1E',
    tertiary: '#2C2C2E',
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

  // Accent Colors (brighter for dark mode)
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

  // Semantic
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

  // Tints
  tint: {
    info: 'rgba(59, 130, 246, 0.18)',
    success: 'rgba(34, 197, 94, 0.18)',
    warning: 'rgba(250, 204, 21, 0.18)',
    danger: 'rgba(248, 113, 113, 0.18)',
    accent: 'rgba(96, 165, 250, 0.15)',
  },

  // Chat
  chat: {
    userBubble: '#0A84FF',
    aiBubble: '#1C1C1E',
    userText: '#FFFFFF',
    aiText: '#FFFFFF',
  },

  // Overlay
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.7)',
    scrimStrong: 'rgba(0, 0, 0, 0.9)',
  },
};

// Typography
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Spacing (8pt grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 22,
  '3xl': 24,
  full: 9999,
};

// Shadows
export const shadows = {
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

// Animation springs
export const springs = {
  gentle: { damping: 20, stiffness: 90, mass: 1 },
  default: { damping: 15, stiffness: 150, mass: 1 },
  bouncy: { damping: 10, stiffness: 100, mass: 1 },
  snappy: { damping: 18, stiffness: 250, mass: 0.8 },
  stiff: { damping: 25, stiffness: 300, mass: 0.8 },
};

// Component heights
export const heights = {
  button: { sm: 36, md: 44, lg: 52 },
  input: 52,
  tabBar: 83,
  avatar: { sm: 32, md: 48, lg: 80 },
};

export type ThemeColors = typeof lightColors;
