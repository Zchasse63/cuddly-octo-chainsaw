/**
 * Shared fitness formulas used across the backend.
 *
 * The canonical Epley formula for estimated 1RM:
 *   1RM = weight × (1 + reps / 30)
 */

/**
 * Calculate estimated 1-rep max using the Epley formula.
 * @param weight - Weight lifted
 * @param reps - Number of reps performed
 * @returns Estimated 1RM
 */
export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}
