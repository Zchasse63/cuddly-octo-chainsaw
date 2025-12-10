/**
 * Tool Utilities Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  toolSuccess,
  toolError,
  getDateRange,
  startOfToday,
  paginationSchema,
  dateRangeSchema,
} from '../utils';

describe('toolSuccess', () => {
  it('should wrap data in success response', () => {
    const data = { foo: 'bar', count: 42 };
    const result = toolSuccess(data);

    expect(result).toEqual({
      success: true,
      data: { foo: 'bar', count: 42 },
    });
  });

  it('should handle empty data', () => {
    const result = toolSuccess({});
    expect(result).toEqual({ success: true, data: {} });
  });

  it('should handle arrays', () => {
    const result = toolSuccess({ items: [1, 2, 3] });
    expect(result).toEqual({ success: true, data: { items: [1, 2, 3] } });
  });
});

describe('toolError', () => {
  it('should create error response with message', () => {
    const result = toolError('Something went wrong');

    expect(result).toEqual({
      success: false,
      error: {
        message: 'Something went wrong',
        code: 'TOOL_ERROR',
      },
    });
  });

  it('should include error code when provided', () => {
    const result = toolError('Not found', 'NOT_FOUND');

    expect(result).toEqual({
      success: false,
      error: {
        message: 'Not found',
        code: 'NOT_FOUND',
      },
    });
  });
});

describe('getDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return correct range for 7 days', () => {
    const { start, end } = getDateRange(7);

    expect(start.toISOString().split('T')[0]).toBe('2024-06-08');
    expect(end.toISOString().split('T')[0]).toBe('2024-06-15');
  });

  it('should return correct range for 30 days', () => {
    const { start, end } = getDateRange(30);

    expect(start.toISOString().split('T')[0]).toBe('2024-05-16');
    expect(end.toISOString().split('T')[0]).toBe('2024-06-15');
  });
});

describe('startOfToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:45Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return start of today (midnight)', () => {
    const result = startOfToday();

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
});

describe('paginationSchema', () => {
  it('should have correct default values', () => {
    const result = paginationSchema.parse({});

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('should accept custom values', () => {
    const result = paginationSchema.parse({ limit: 25, offset: 50 });

    expect(result.limit).toBe(25);
    expect(result.offset).toBe(50);
  });

  it('should reject values over max limit', () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });
});

describe('dateRangeSchema', () => {
  it('should allow empty object (all optional)', () => {
    const result = dateRangeSchema.parse({});

    expect(result.days).toBeUndefined();
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it('should accept custom days', () => {
    const result = dateRangeSchema.parse({ days: 30 });

    expect(result.days).toBe(30);
  });
});

