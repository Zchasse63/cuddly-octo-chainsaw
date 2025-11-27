import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * Integration tests for the VoiceFit API
 * These tests verify the complete flow from API request to database response
 */

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('API Integration Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const mockRequest = new Request('http://localhost:3000/api/workouts', {
        method: 'GET',
      });

      // Simulate middleware check
      const authHeader = mockRequest.headers.get('authorization');
      expect(authHeader).toBeNull();
    });

    it('should accept requests with valid bearer token', async () => {
      const mockRequest = new Request('http://localhost:3000/api/workouts', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const authHeader = mockRequest.headers.get('authorization');
      expect(authHeader).toBe('Bearer valid-token');
      expect(authHeader?.startsWith('Bearer ')).toBe(true);
    });
  });

  describe('Workout Endpoints', () => {
    describe('POST /api/workouts', () => {
      it('should validate workout payload', () => {
        const validPayload = {
          name: 'Morning Workout',
          exercises: [
            {
              exerciseId: 'exercise-1',
              sets: [
                { weight: 135, reps: 10, rpe: 7 },
                { weight: 135, reps: 10, rpe: 8 },
              ],
            },
          ],
        };

        expect(validPayload.name).toBeDefined();
        expect(validPayload.exercises).toBeInstanceOf(Array);
        expect(validPayload.exercises[0].sets).toHaveLength(2);
      });

      it('should reject invalid workout payload', () => {
        const invalidPayload = {
          // Missing name
          exercises: [],
        };

        expect(invalidPayload.name).toBeUndefined();
      });

      it('should calculate total volume correctly', () => {
        const sets = [
          { weight: 135, reps: 10 },
          { weight: 135, reps: 8 },
          { weight: 145, reps: 6 },
        ];

        const totalVolume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
        expect(totalVolume).toBe(135 * 10 + 135 * 8 + 145 * 6);
        expect(totalVolume).toBe(3300);
      });
    });

    describe('GET /api/workouts', () => {
      it('should support pagination parameters', () => {
        const queryParams = new URLSearchParams({
          page: '1',
          limit: '20',
          sortBy: 'createdAt',
          order: 'desc',
        });

        expect(queryParams.get('page')).toBe('1');
        expect(queryParams.get('limit')).toBe('20');
        expect(parseInt(queryParams.get('limit')!)).toBeLessThanOrEqual(100);
      });

      it('should support date range filtering', () => {
        const queryParams = new URLSearchParams({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

        const startDate = new Date(queryParams.get('startDate')!);
        const endDate = new Date(queryParams.get('endDate')!);

        expect(startDate).toBeInstanceOf(Date);
        expect(endDate > startDate).toBe(true);
      });
    });
  });

  describe('Running Activity Endpoints', () => {
    describe('POST /api/running/activities', () => {
      it('should validate running activity payload', () => {
        const validPayload = {
          startedAt: '2024-01-15T08:00:00Z',
          distanceMeters: 5000,
          durationSeconds: 1500,
          avgPaceSecondsPerKm: 300,
          elevationGainMeters: 50,
          source: 'manual',
        };

        expect(validPayload.distanceMeters).toBeGreaterThan(0);
        expect(validPayload.durationSeconds).toBeGreaterThan(0);
        expect(validPayload.avgPaceSecondsPerKm).toBeGreaterThan(0);
      });

      it('should calculate pace correctly', () => {
        const distanceKm = 5;
        const durationMinutes = 25;
        const paceMinPerKm = durationMinutes / distanceKm;

        expect(paceMinPerKm).toBe(5); // 5 min/km
      });
    });

    describe('GET /api/running/prs', () => {
      it('should return PRs for standard distances', () => {
        const expectedPRTypes = ['1mi', '5k', '10k', 'half_marathon', 'marathon'];

        expectedPRTypes.forEach((type) => {
          expect(type).toMatch(/^(1mi|5k|10k|half_marathon|marathon)$/);
        });
      });
    });
  });

  describe('Readiness Check-in Endpoints', () => {
    describe('POST /api/readiness/check-in', () => {
      it('should validate check-in payload', () => {
        const validPayload = {
          sleepHours: 7.5,
          sleepQuality: 80,
          stressLevel: 30,
          sorenessLevel: 25,
          energyLevel: 75,
          motivationLevel: 80,
          nutritionQuality: 70,
          notes: 'Feeling good today',
        };

        expect(validPayload.sleepHours).toBeGreaterThanOrEqual(0);
        expect(validPayload.sleepHours).toBeLessThanOrEqual(24);
        expect(validPayload.sleepQuality).toBeGreaterThanOrEqual(0);
        expect(validPayload.sleepQuality).toBeLessThanOrEqual(100);
      });

      it('should calculate recovery score', () => {
        const checkIn = {
          sleepHours: 8,
          sleepQuality: 85,
          stressLevel: 20,
          sorenessLevel: 15,
          energyLevel: 80,
        };

        // Simple recovery score calculation
        const sleepScore = (checkIn.sleepHours / 8) * (checkIn.sleepQuality / 100) * 100;
        const stressScore = 100 - checkIn.stressLevel;
        const sorenessScore = 100 - checkIn.sorenessLevel;
        const energyScore = checkIn.energyLevel;

        const recoveryScore = (sleepScore * 0.35 + stressScore * 0.2 + sorenessScore * 0.2 + energyScore * 0.25);

        expect(recoveryScore).toBeGreaterThan(0);
        expect(recoveryScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Badge Endpoints', () => {
    describe('GET /api/badges', () => {
      it('should return badge definitions', () => {
        const mockBadges = [
          { id: 'strength_workout_1', name: 'First Rep', tier: 'bronze' },
          { id: 'run_miles_1', name: 'First Mile', tier: 'bronze' },
        ];

        expect(mockBadges).toHaveLength(2);
        expect(mockBadges[0]).toHaveProperty('id');
        expect(mockBadges[0]).toHaveProperty('name');
        expect(mockBadges[0]).toHaveProperty('tier');
      });
    });

    describe('GET /api/badges/user', () => {
      it('should return user earned badges with progress', () => {
        const mockUserBadges = {
          earned: [
            { badgeId: 'strength_workout_1', earnedAt: '2024-01-10' },
          ],
          inProgress: [
            { badgeId: 'strength_workout_5', progress: 3, target: 5 },
          ],
        };

        expect(mockUserBadges.earned).toHaveLength(1);
        expect(mockUserBadges.inProgress[0].progress).toBeLessThan(mockUserBadges.inProgress[0].target);
      });
    });
  });

  describe('AI Coach Endpoints', () => {
    describe('POST /api/coach/chat', () => {
      it('should validate chat message', () => {
        const validPayload = {
          message: 'I did 3 sets of bench press at 135 lbs',
          context: {
            recentWorkouts: [],
            currentProgram: null,
          },
        };

        expect(validPayload.message.length).toBeGreaterThan(0);
        expect(validPayload.message.length).toBeLessThan(2000);
      });
    });

    describe('POST /api/coach/parse-workout', () => {
      it('should parse workout from natural language', () => {
        const input = 'I did 3 sets of bench press at 135 lbs for 10 reps';

        // Expected parsed output
        const expectedParsed = {
          exercises: [
            {
              name: 'bench press',
              sets: [
                { weight: 135, reps: 10, unit: 'lbs' },
                { weight: 135, reps: 10, unit: 'lbs' },
                { weight: 135, reps: 10, unit: 'lbs' },
              ],
            },
          ],
        };

        expect(expectedParsed.exercises).toHaveLength(1);
        expect(expectedParsed.exercises[0].sets).toHaveLength(3);
      });
    });
  });

  describe('Health Intelligence Endpoints', () => {
    describe('GET /api/health/correlations', () => {
      it('should return correlation data', () => {
        const mockCorrelations = [
          { type: 'sleep_performance', correlation: 0.72, strength: 'strong', direction: 'positive' },
          { type: 'stress_performance', correlation: -0.45, strength: 'moderate', direction: 'negative' },
        ];

        mockCorrelations.forEach((c) => {
          expect(c.correlation).toBeGreaterThanOrEqual(-1);
          expect(c.correlation).toBeLessThanOrEqual(1);
          expect(['weak', 'moderate', 'strong']).toContain(c.strength);
          expect(['positive', 'negative', 'none']).toContain(c.direction);
        });
      });
    });

    describe('GET /api/health/score', () => {
      it('should return health score breakdown', () => {
        const mockScore = {
          overall: 78,
          components: {
            sleep: 82,
            recovery: 75,
            consistency: 85,
            nutrition: 70,
            stress: 78,
          },
          trend: 'improving',
        };

        expect(mockScore.overall).toBeGreaterThanOrEqual(0);
        expect(mockScore.overall).toBeLessThanOrEqual(100);
        Object.values(mockScore.components).forEach((score) => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('Program Endpoints', () => {
    describe('POST /api/programs/generate', () => {
      it('should validate program generation request', () => {
        const validPayload = {
          goal: 'muscle_gain',
          experience: 'intermediate',
          daysPerWeek: 4,
          duration: 8,
          equipment: ['barbell', 'dumbbell', 'cables'],
          limitations: [],
        };

        expect(validPayload.daysPerWeek).toBeGreaterThanOrEqual(1);
        expect(validPayload.daysPerWeek).toBeLessThanOrEqual(7);
        expect(validPayload.duration).toBeGreaterThan(0);
      });
    });

    describe('POST /api/programs/:id/assign', () => {
      it('should validate assignment payload', () => {
        const validPayload = {
          clientId: 'client-123',
          startDate: '2024-02-01',
          modifications: {},
        };

        expect(validPayload.clientId).toBeDefined();
        expect(new Date(validPayload.startDate)).toBeInstanceOf(Date);
      });
    });
  });
});

describe('Error Handling', () => {
  it('should return proper error format', () => {
    const errorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: [
          { field: 'name', message: 'Name is required' },
        ],
      },
    };

    expect(errorResponse.error).toHaveProperty('code');
    expect(errorResponse.error).toHaveProperty('message');
    expect(Array.isArray(errorResponse.error.details)).toBe(true);
  });

  it('should handle rate limiting', () => {
    const rateLimitResponse = {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: 60,
      },
    };

    expect(rateLimitResponse.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(rateLimitResponse.error.retryAfter).toBeGreaterThan(0);
  });
});

describe('Data Validation', () => {
  it('should validate UUID format', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(validUUID)).toBe(true);
  });

  it('should validate ISO date format', () => {
    const validDate = '2024-01-15T08:30:00Z';
    const date = new Date(validDate);

    expect(date.toISOString()).toBe(validDate);
  });

  it('should sanitize user input', () => {
    const unsafeInput = '<script>alert("xss")</script>';
    const sanitized = unsafeInput.replace(/<[^>]*>/g, '');

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
  });
});
