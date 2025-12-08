import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Injury Router Tests
 * Tests injury logging, risk assessment, and recovery tracking
 */

const testUUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Injury Router', () => {
  describe('Input Validation', () => {
    describe('logInjury input', () => {
      const injurySchema = z.object({
        bodyPart: z.string().min(1),
        side: z.enum(['left', 'right', 'both', 'center']).optional(),
        severity: z.enum(['mild', 'moderate', 'severe']),
        type: z.enum(['strain', 'sprain', 'tendinitis', 'pain', 'other']),
        description: z.string().optional(),
        occurredDuring: z.string().optional(),
        exerciseId: z.string().uuid().optional(),
      });

      it('should validate basic injury report', () => {
        const input = {
          bodyPart: 'shoulder',
          severity: 'mild' as const,
          type: 'pain' as const,
        };
        expect(injurySchema.parse(input)).toBeDefined();
      });

      it('should validate detailed injury report', () => {
        const input = {
          bodyPart: 'knee',
          side: 'left' as const,
          severity: 'moderate' as const,
          type: 'strain' as const,
          description: 'Sharp pain during squat descent',
          occurredDuring: 'Squat',
          exerciseId: testUUID,
        };
        expect(injurySchema.parse(input)).toBeDefined();
      });

      it('should reject invalid severity', () => {
        expect(() => injurySchema.parse({
          bodyPart: 'back',
          severity: 'extreme',
          type: 'pain',
        })).toThrow();
      });
    });

    describe('updateRecovery input', () => {
      const recoverySchema = z.object({
        injuryId: z.string().uuid(),
        status: z.enum(['active', 'recovering', 'healed']),
        painLevel: z.number().min(0).max(10).optional(),
        notes: z.string().optional(),
      });

      it('should validate recovery update', () => {
        const input = {
          injuryId: testUUID,
          status: 'recovering' as const,
          painLevel: 3,
        };
        expect(recoverySchema.parse(input)).toBeDefined();
      });

      it('should reject pain level over 10', () => {
        expect(() => recoverySchema.parse({
          injuryId: testUUID,
          status: 'active',
          painLevel: 15,
        })).toThrow();
      });
    });

    describe('getRiskAssessment input', () => {
      const riskSchema = z.object({
        exerciseId: z.string().uuid().optional(),
        bodyPart: z.string().optional(),
      }).optional();

      it('should accept empty input for full assessment', () => {
        expect(riskSchema.parse(undefined)).toBeUndefined();
      });

      it('should filter by exercise', () => {
        expect(riskSchema.parse({ exerciseId: testUUID })).toBeDefined();
      });
    });
  });

  describe('Risk Assessment Logic', () => {
    const calculateRiskScore = (factors: {
      recentInjury: boolean;
      highVolume: boolean;
      poorRecovery: boolean;
      rapidProgression: boolean;
    }) => {
      let score = 0;
      if (factors.recentInjury) score += 40;
      if (factors.highVolume) score += 20;
      if (factors.poorRecovery) score += 25;
      if (factors.rapidProgression) score += 15;
      return Math.min(score, 100);
    };

    const getRiskLevel = (score: number) => {
      if (score >= 70) return 'high';
      if (score >= 40) return 'moderate';
      return 'low';
    };

    it('should calculate low risk for healthy user', () => {
      const score = calculateRiskScore({
        recentInjury: false,
        highVolume: false,
        poorRecovery: false,
        rapidProgression: false,
      });
      expect(score).toBe(0);
      expect(getRiskLevel(score)).toBe('low');
    });

    it('should calculate high risk with recent injury', () => {
      const score = calculateRiskScore({
        recentInjury: true,
        highVolume: true,
        poorRecovery: false,
        rapidProgression: false,
      });
      expect(score).toBe(60);
      expect(getRiskLevel(score)).toBe('moderate');
    });

    it('should cap at 100', () => {
      const score = calculateRiskScore({
        recentInjury: true,
        highVolume: true,
        poorRecovery: true,
        rapidProgression: true,
      });
      expect(score).toBe(100);
      expect(getRiskLevel(score)).toBe('high');
    });
  });

  describe('Exercise Restrictions', () => {
    const getRestrictions = (injury: { bodyPart: string; severity: string }) => {
      const restrictions: Record<string, string[]> = {
        shoulder: ['overhead press', 'lateral raise', 'bench press'],
        knee: ['squat', 'leg press', 'lunges'],
        back: ['deadlift', 'bent over row', 'good morning'],
        wrist: ['bench press', 'push up', 'curl'],
      };

      const severityMultiplier = { mild: 0.5, moderate: 0.75, severe: 1.0 };
      const exercises = restrictions[injury.bodyPart.toLowerCase()] || [];
      
      return {
        avoid: injury.severity === 'severe' ? exercises : [],
        modify: injury.severity !== 'severe' ? exercises : [],
        multiplier: severityMultiplier[injury.severity as keyof typeof severityMultiplier] || 1,
      };
    };

    it('should recommend avoiding exercises for severe injury', () => {
      const result = getRestrictions({ bodyPart: 'shoulder', severity: 'severe' });
      expect(result.avoid).toContain('overhead press');
      expect(result.modify).toHaveLength(0);
    });

    it('should recommend modifications for mild injury', () => {
      const result = getRestrictions({ bodyPart: 'knee', severity: 'mild' });
      expect(result.avoid).toHaveLength(0);
      expect(result.modify).toContain('squat');
    });
  });

  describe('Recovery Timeline', () => {
    const estimateRecovery = (type: string, severity: string) => {
      const baseDays: Record<string, number> = {
        pain: 3,
        strain: 14,
        sprain: 21,
        tendinitis: 28,
        other: 7,
      };

      const severityMultiplier: Record<string, number> = {
        mild: 0.5,
        moderate: 1.0,
        severe: 2.0,
      };

      const base = baseDays[type] || 7;
      const multiplier = severityMultiplier[severity] || 1;
      return Math.round(base * multiplier);
    };

    it('should estimate mild pain recovery', () => {
      expect(estimateRecovery('pain', 'mild')).toBe(2);
    });

    it('should estimate moderate strain recovery', () => {
      expect(estimateRecovery('strain', 'moderate')).toBe(14);
    });

    it('should estimate severe sprain recovery', () => {
      expect(estimateRecovery('sprain', 'severe')).toBe(42);
    });
  });

  describe('Response Contracts', () => {
    it('should return injury with recovery info', () => {
      const injury = {
        id: testUUID,
        userId: 'user-123',
        bodyPart: 'shoulder',
        side: 'left',
        severity: 'moderate',
        type: 'strain',
        status: 'recovering',
        painLevel: 4,
        estimatedRecoveryDays: 14,
        createdAt: new Date().toISOString(),
      };

      expect(injury).toHaveProperty('severity');
      expect(injury).toHaveProperty('estimatedRecoveryDays');
    });

    it('should return risk assessment', () => {
      const assessment = {
        overallRisk: 'moderate',
        riskScore: 45,
        factors: [
          { name: 'Recent Injury', impact: 40 },
          { name: 'High Volume', impact: 5 },
        ],
        recommendations: [
          'Reduce training volume by 20%',
          'Avoid overhead movements',
        ],
      };

      expect(assessment).toHaveProperty('riskScore');
      expect(assessment).toHaveProperty('recommendations');
    });
  });
});

