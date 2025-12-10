/**
 * Feature Flags for Tool-Based AI Migration
 *
 * Controls gradual rollout of the new Vercel AI SDK tool-calling architecture.
 * Allows percentage-based rollout and force-enable for specific users.
 */

// Environment configuration
const ROLLOUT_PERCENT = parseInt(process.env.TOOL_CALLING_ROLLOUT_PERCENT || '0', 10);
const FORCE_ENABLE_USERS = (process.env.TOOL_CALLING_FORCE_ENABLE_USERS || '')
  .split(',')
  .filter(Boolean);

/**
 * Feature flag configuration
 */
export const FEATURE_FLAGS = {
  /** Current rollout percentage (0-100) */
  toolCallingRolloutPercent: Math.min(100, Math.max(0, ROLLOUT_PERCENT)),

  /** Users who always get the new system regardless of percentage */
  forceEnableUsers: new Set(FORCE_ENABLE_USERS),
} as const;

/**
 * Determines if a user should use the new tool-based AI system.
 *
 * Decision logic:
 * 1. If user is in force-enable list → always use new system
 * 2. If rollout is 100% → always use new system
 * 3. If rollout is 0% → always use legacy system
 * 4. Otherwise → hash userId to get consistent bucket assignment
 *
 * @param userId - The user's unique identifier
 * @returns true if user should use tool-based AI, false for legacy
 */
export function shouldUseToolCalling(userId: string): boolean {
  // Force-enabled users always get new system
  if (FEATURE_FLAGS.forceEnableUsers.has(userId)) {
    return true;
  }

  // 100% rollout = everyone gets new system
  if (FEATURE_FLAGS.toolCallingRolloutPercent >= 100) {
    return true;
  }

  // 0% rollout = everyone gets legacy system
  if (FEATURE_FLAGS.toolCallingRolloutPercent <= 0) {
    return false;
  }

  // Hash-based bucket assignment for consistent user experience
  const bucket = hashUserToBucket(userId);
  return bucket < FEATURE_FLAGS.toolCallingRolloutPercent;
}

/**
 * Hashes a userId to a bucket (0-99) for consistent rollout assignment.
 * Uses a simple but effective hash that ensures the same user always
 * gets the same bucket, providing a consistent experience.
 *
 * @param userId - The user's unique identifier
 * @returns A number between 0 and 99
 */
function hashUserToBucket(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Gets the current feature flag status for logging/debugging.
 */
export function getFeatureFlagStatus(): {
  rolloutPercent: number;
  forceEnableCount: number;
  isFullRollout: boolean;
  isDisabled: boolean;
} {
  return {
    rolloutPercent: FEATURE_FLAGS.toolCallingRolloutPercent,
    forceEnableCount: FEATURE_FLAGS.forceEnableUsers.size,
    isFullRollout: FEATURE_FLAGS.toolCallingRolloutPercent >= 100,
    isDisabled: FEATURE_FLAGS.toolCallingRolloutPercent <= 0,
  };
}

