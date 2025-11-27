// Utility functions

/**
 * Calculate estimated 1RM using Epley formula
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate estimated max reps at a given weight from 1RM
 */
export function calculateMaxReps(oneRM: number, weight: number): number {
  if (weight >= oneRM) return 1;
  return Math.round(30 * (oneRM / weight - 1));
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format distance in meters to km or m
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format pace (min/km)
 */
export function formatPace(pace: number): string {
  if (pace === 0 || !isFinite(pace)) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

/**
 * Calculate pace from duration (seconds) and distance (meters)
 */
export function calculatePace(durationSeconds: number, distanceMeters: number): number {
  if (distanceMeters === 0) return 0;
  const minutes = durationSeconds / 60;
  const kilometers = distanceMeters / 1000;
  return minutes / kilometers;
}

/**
 * Calculate Haversine distance between two coordinates
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total volume (weight × reps) for a set of sets
 */
export function calculateTotalVolume(
  sets: Array<{ weight?: number | null; reps?: number | null }>
): number {
  return sets.reduce((total, set) => {
    return total + (set.weight || 0) * (set.reps || 0);
  }, 0);
}

/**
 * Get readiness tier from score
 */
export function getReadinessTier(score: number): 'excellent' | 'moderate' | 'low' | 'veryLow' {
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'moderate';
  if (score >= 4) return 'low';
  return 'veryLow';
}

/**
 * Pluralize a word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
