/**
 * Tool Utilities
 *
 * Common schemas, response wrappers, and helper functions for tools.
 */

import { z } from 'zod';

// ============================================
// COMMON PARAMETER SCHEMAS
// ============================================

/**
 * Pagination parameters for list queries.
 */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10).describe('Maximum number of results'),
  offset: z.number().min(0).default(0).describe('Number of results to skip'),
});

/**
 * Date range parameters for time-based queries.
 */
export const dateRangeSchema = z.object({
  startDate: z.string().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().optional().describe('End date (ISO 8601)'),
  days: z.number().min(1).max(365).optional().describe('Number of days to look back'),
});

/**
 * Exercise filter parameters.
 */
export const exerciseFilterSchema = z.object({
  exerciseName: z.string().optional().describe('Exercise name to filter by'),
  muscleGroup: z.string().optional().describe('Muscle group to filter by'),
  equipment: z.array(z.string()).optional().describe('Equipment types to include'),
});

// ============================================
// RESPONSE WRAPPERS
// ============================================

/**
 * Standard success response wrapper.
 * All tools should return this format for consistency.
 */
export function toolSuccess<T>(data: T) {
  return {
    success: true as const,
    data,
  };
}

/**
 * Standard error response wrapper.
 */
export function toolError(message: string, code?: string) {
  return {
    success: false as const,
    error: {
      message,
      code: code ?? 'TOOL_ERROR',
    },
  };
}

/**
 * Type for tool responses.
 */
export type ToolResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format a date for human-readable display.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time for detailed display.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Calculate date range from days parameter.
 */
export function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Get start of today.
 */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of current week (Monday).
 */
export function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================
// NUMBER UTILITIES
// ============================================

/**
 * Format weight with appropriate unit.
 */
export function formatWeight(weight: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${weight.toFixed(1)} ${unit}`;
}

/**
 * Format distance in miles or km.
 */
export function formatDistance(meters: number, unit: 'mi' | 'km' = 'mi'): string {
  if (unit === 'mi') {
    return `${(meters / 1609.34).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format duration in human-readable format.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculate percentage change between two values.
 */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

