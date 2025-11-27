import { sql, eq, and, gte, desc } from 'drizzle-orm';
import { readinessCheckIns } from '../db/schema/readiness';
import { workouts } from '../db/schema/workouts';
import { runningActivities } from '../db/schema/running';
import { generateGrokResponse } from '../lib/grok';

// Risk level
type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// Risk factor
type RiskFactor = {
  type: string;
  severity: RiskLevel;
  value: number;
  threshold: number;
  description: string;
  recommendation: string;
};

// Assessment result
type InjuryRiskAssessment = {
  overallRisk: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  shouldReduceLoad: boolean;
  suggestedActions: string[];
};

// Training load data
type TrainingLoadData = {
  currentWeekVolume: number;
  previousWeekVolume: number;
  weeklyVolumeChange: number;
  currentWeekRuns: number;
  currentWeekMileage: number;
  previousWeekMileage: number;
  mileageChange: number;
  avgRecovery: number;
  avgSleep: number;
  avgStress: number;
  avgSoreness: number;
  consecutiveHighIntensityDays: number;
  daysWithoutRest: number;
};

export class InjuryRiskService {
  private db: any;
  private userId: string;

  // Thresholds
  private readonly VOLUME_SPIKE_THRESHOLD = 0.3; // 30% increase
  private readonly LOW_RECOVERY_THRESHOLD = 50;
  private readonly POOR_SLEEP_THRESHOLD = 6.5;
  private readonly HIGH_STRESS_THRESHOLD = 70;
  private readonly HIGH_SORENESS_THRESHOLD = 70;
  private readonly MAX_HIGH_INTENSITY_DAYS = 3;
  private readonly MAX_DAYS_WITHOUT_REST = 6;

  constructor(db: any, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  // Full injury risk assessment
  async getAssessment(): Promise<InjuryRiskAssessment> {
    const data = await this.getTrainingLoadData();
    const factors: RiskFactor[] = [];

    // Check training load spike
    if (Math.abs(data.weeklyVolumeChange) > this.VOLUME_SPIKE_THRESHOLD) {
      const isIncrease = data.weeklyVolumeChange > 0;
      factors.push({
        type: 'training_load_spike',
        severity: data.weeklyVolumeChange > 0.5 ? 'high' : 'moderate',
        value: Math.round(data.weeklyVolumeChange * 100),
        threshold: Math.round(this.VOLUME_SPIKE_THRESHOLD * 100),
        description: isIncrease
          ? `Training volume increased ${Math.round(data.weeklyVolumeChange * 100)}% from last week`
          : `Training volume decreased significantly`,
        recommendation: isIncrease
          ? 'Consider reducing volume this week to allow adaptation'
          : 'Gradual volume increases are safer for injury prevention',
      });
    }

    // Check mileage spike for runners
    if (data.currentWeekMileage > 0 && Math.abs(data.mileageChange) > this.VOLUME_SPIKE_THRESHOLD) {
      factors.push({
        type: 'mileage_spike',
        severity: data.mileageChange > 0.4 ? 'high' : 'moderate',
        value: Math.round(data.mileageChange * 100),
        threshold: Math.round(this.VOLUME_SPIKE_THRESHOLD * 100),
        description: `Running mileage ${data.mileageChange > 0 ? 'increased' : 'changed'} by ${Math.round(Math.abs(data.mileageChange) * 100)}%`,
        recommendation: 'Follow the 10% rule: increase weekly mileage by no more than 10%',
      });
    }

    // Check low recovery
    if (data.avgRecovery < this.LOW_RECOVERY_THRESHOLD) {
      factors.push({
        type: 'low_recovery',
        severity: data.avgRecovery < 40 ? 'high' : 'moderate',
        value: Math.round(data.avgRecovery),
        threshold: this.LOW_RECOVERY_THRESHOLD,
        description: `Average recovery score is ${Math.round(data.avgRecovery)}% (below ${this.LOW_RECOVERY_THRESHOLD}%)`,
        recommendation: 'Focus on sleep, nutrition, and active recovery',
      });
    }

    // Check poor sleep
    if (data.avgSleep < this.POOR_SLEEP_THRESHOLD) {
      factors.push({
        type: 'poor_sleep',
        severity: data.avgSleep < 5.5 ? 'high' : 'moderate',
        value: Math.round(data.avgSleep * 10) / 10,
        threshold: this.POOR_SLEEP_THRESHOLD,
        description: `Average sleep is ${data.avgSleep.toFixed(1)} hours (below ${this.POOR_SLEEP_THRESHOLD} hours)`,
        recommendation: 'Prioritize sleep. Aim for 7-9 hours per night for optimal recovery',
      });
    }

    // Check high stress
    if (data.avgStress > this.HIGH_STRESS_THRESHOLD) {
      factors.push({
        type: 'high_stress',
        severity: data.avgStress > 80 ? 'high' : 'moderate',
        value: Math.round(data.avgStress),
        threshold: this.HIGH_STRESS_THRESHOLD,
        description: `Stress level is elevated at ${Math.round(data.avgStress)}%`,
        recommendation: 'High stress increases injury risk. Consider stress-reduction techniques',
      });
    }

    // Check high soreness
    if (data.avgSoreness > this.HIGH_SORENESS_THRESHOLD) {
      factors.push({
        type: 'high_soreness',
        severity: data.avgSoreness > 80 ? 'high' : 'moderate',
        value: Math.round(data.avgSoreness),
        threshold: this.HIGH_SORENESS_THRESHOLD,
        description: `Muscle soreness is high at ${Math.round(data.avgSoreness)}%`,
        recommendation: 'Reduce intensity and focus on recovery. Consider foam rolling and stretching',
      });
    }

    // Check consecutive high intensity
    if (data.consecutiveHighIntensityDays > this.MAX_HIGH_INTENSITY_DAYS) {
      factors.push({
        type: 'overtraining',
        severity: 'high',
        value: data.consecutiveHighIntensityDays,
        threshold: this.MAX_HIGH_INTENSITY_DAYS,
        description: `${data.consecutiveHighIntensityDays} consecutive high-intensity days`,
        recommendation: 'Add a rest or low-intensity day to prevent overtraining',
      });
    }

    // Check days without rest
    if (data.daysWithoutRest > this.MAX_DAYS_WITHOUT_REST) {
      factors.push({
        type: 'no_rest_days',
        severity: 'moderate',
        value: data.daysWithoutRest,
        threshold: this.MAX_DAYS_WITHOUT_REST,
        description: `${data.daysWithoutRest} consecutive training days without rest`,
        recommendation: 'Schedule regular rest days (1-2 per week)',
      });
    }

    // Calculate compound risk score
    const riskScore = this.calculateRiskScore(factors);
    const overallRisk = this.getRiskLevel(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, data);
    const suggestedActions = this.getSuggestedActions(overallRisk, factors);

    return {
      overallRisk,
      riskScore,
      factors,
      recommendations,
      shouldReduceLoad: overallRisk === 'high' || overallRisk === 'critical',
      suggestedActions,
    };
  }

  // Get proactive warnings (for notifications)
  async getWarnings(): Promise<{ hasWarning: boolean; warnings: string[] }> {
    const assessment = await this.getAssessment();

    if (assessment.overallRisk === 'low') {
      return { hasWarning: false, warnings: [] };
    }

    const warnings = assessment.factors
      .filter((f) => f.severity === 'high' || f.severity === 'critical')
      .map((f) => f.description);

    return {
      hasWarning: warnings.length > 0,
      warnings,
    };
  }

  // Get AI-generated risk analysis
  async getAIAnalysis(): Promise<string> {
    const assessment = await this.getAssessment();
    const data = await this.getTrainingLoadData();

    if (assessment.factors.length === 0) {
      return 'Your training load looks balanced. Keep up the good work and maintain your recovery practices!';
    }

    const prompt = `Analyze this athlete's injury risk data and provide personalized advice:

Overall Risk: ${assessment.overallRisk} (${assessment.riskScore}/100)

Risk Factors:
${assessment.factors.map((f) => `- ${f.type}: ${f.description}`).join('\n')}

Training Data:
- Weekly volume change: ${Math.round(data.weeklyVolumeChange * 100)}%
- Average recovery: ${Math.round(data.avgRecovery)}%
- Average sleep: ${data.avgSleep.toFixed(1)} hours
- Stress level: ${Math.round(data.avgStress)}%
- Consecutive training days: ${data.daysWithoutRest}

Provide 3-4 specific, actionable recommendations to reduce injury risk. Be concise and practical.`;

    try {
      const response = await generateGrokResponse(prompt, {
        systemPrompt:
          'You are a sports medicine expert providing injury prevention advice. Be specific, evidence-based, and actionable.',
        maxTokens: 400,
      });

      return response;
    } catch (error) {
      return assessment.recommendations.join(' ');
    }
  }

  // Get training load data
  private async getTrainingLoadData(): Promise<TrainingLoadData> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentWeekWorkouts, previousWeekWorkouts, readinessData, runData, consecutiveDays] =
      await Promise.all([
        // Current week workouts
        this.db.execute(sql`
          SELECT COALESCE(SUM(ws.weight * ws.reps), 0) as volume
          FROM workouts w
          LEFT JOIN workout_sets ws ON ws.workout_id = w.id
          WHERE w.user_id = ${this.userId}
            AND w.created_at >= ${oneWeekAgo}
        `),

        // Previous week workouts
        this.db.execute(sql`
          SELECT COALESCE(SUM(ws.weight * ws.reps), 0) as volume
          FROM workouts w
          LEFT JOIN workout_sets ws ON ws.workout_id = w.id
          WHERE w.user_id = ${this.userId}
            AND w.created_at >= ${twoWeeksAgo}
            AND w.created_at < ${oneWeekAgo}
        `),

        // Recent readiness data
        this.db.execute(sql`
          SELECT
            AVG(recovery_score) as avg_recovery,
            AVG(sleep_hours) as avg_sleep,
            AVG(stress_level) as avg_stress,
            AVG(soreness_level) as avg_soreness
          FROM readiness_check_ins
          WHERE user_id = ${this.userId}
            AND created_at >= ${oneWeekAgo}
        `),

        // Run data
        this.db.execute(sql`
          SELECT
            COALESCE(SUM(CASE WHEN started_at >= ${oneWeekAgo} THEN distance_meters ELSE 0 END), 0) as current_mileage,
            COALESCE(SUM(CASE WHEN started_at >= ${twoWeeksAgo} AND started_at < ${oneWeekAgo} THEN distance_meters ELSE 0 END), 0) as previous_mileage,
            COUNT(CASE WHEN started_at >= ${oneWeekAgo} THEN 1 END) as current_runs
          FROM running_activities
          WHERE user_id = ${this.userId}
            AND started_at >= ${twoWeeksAgo}
        `),

        // Consecutive training days
        this.db.execute(sql`
          WITH training_days AS (
            SELECT DISTINCT DATE(created_at) as day
            FROM workouts
            WHERE user_id = ${this.userId}
              AND created_at >= ${twoWeeksAgo}
            UNION
            SELECT DISTINCT DATE(started_at) as day
            FROM running_activities
            WHERE user_id = ${this.userId}
              AND started_at >= ${twoWeeksAgo}
          )
          SELECT COUNT(*) as consecutive_days
          FROM training_days
          WHERE day >= CURRENT_DATE - INTERVAL '7 days'
        `),
      ]);

    const currentVolume = parseFloat(currentWeekWorkouts.rows[0]?.volume || '0');
    const previousVolume = parseFloat(previousWeekWorkouts.rows[0]?.volume || '0');
    const volumeChange =
      previousVolume > 0 ? (currentVolume - previousVolume) / previousVolume : 0;

    const currentMileage = parseFloat(runData.rows[0]?.current_mileage || '0');
    const previousMileage = parseFloat(runData.rows[0]?.previous_mileage || '0');
    const mileageChange =
      previousMileage > 0 ? (currentMileage - previousMileage) / previousMileage : 0;

    return {
      currentWeekVolume: currentVolume,
      previousWeekVolume: previousVolume,
      weeklyVolumeChange: volumeChange,
      currentWeekRuns: parseInt(runData.rows[0]?.current_runs || '0'),
      currentWeekMileage: currentMileage / 1609.34, // Convert to miles
      previousWeekMileage: previousMileage / 1609.34,
      mileageChange,
      avgRecovery: parseFloat(readinessData.rows[0]?.avg_recovery || '50'),
      avgSleep: parseFloat(readinessData.rows[0]?.avg_sleep || '7'),
      avgStress: parseFloat(readinessData.rows[0]?.avg_stress || '50'),
      avgSoreness: parseFloat(readinessData.rows[0]?.avg_soreness || '30'),
      consecutiveHighIntensityDays: 0, // Would need more complex calculation
      daysWithoutRest: parseInt(consecutiveDays.rows[0]?.consecutive_days || '0'),
    };
  }

  // Calculate compound risk score
  private calculateRiskScore(factors: RiskFactor[]): number {
    if (factors.length === 0) return 0;

    const severityWeights: Record<RiskLevel, number> = {
      low: 10,
      moderate: 25,
      high: 40,
      critical: 60,
    };

    let score = 0;
    for (const factor of factors) {
      score += severityWeights[factor.severity];
    }

    // Compound effect for multiple factors
    if (factors.length > 2) {
      score *= 1.2;
    }
    if (factors.length > 4) {
      score *= 1.3;
    }

    return Math.min(100, Math.round(score));
  }

  // Get risk level from score
  private getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'moderate';
    return 'low';
  }

  // Generate recommendations
  private generateRecommendations(
    factors: RiskFactor[],
    data: TrainingLoadData
  ): string[] {
    const recommendations: string[] = [];

    // Add factor-specific recommendations
    for (const factor of factors) {
      recommendations.push(factor.recommendation);
    }

    // Add general recommendations based on overall state
    if (data.avgRecovery < 60 && data.avgSleep < 7) {
      recommendations.push('Both recovery and sleep are low. This significantly increases injury risk.');
    }

    if (factors.length >= 3) {
      recommendations.push('Multiple risk factors detected. Consider taking a deload week.');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Get suggested actions
  private getSuggestedActions(risk: RiskLevel, factors: RiskFactor[]): string[] {
    const actions: string[] = [];

    switch (risk) {
      case 'critical':
        actions.push('Take a complete rest day today');
        actions.push('Reduce training volume by 40-50% this week');
        actions.push('Prioritize sleep and recovery');
        break;
      case 'high':
        actions.push('Reduce training intensity today');
        actions.push('Add an extra rest day this week');
        actions.push('Focus on active recovery');
        break;
      case 'moderate':
        actions.push('Monitor symptoms closely');
        actions.push('Consider reducing volume by 10-20%');
        break;
      default:
        actions.push('Continue with your current training plan');
    }

    return actions;
  }
}

// Export factory function
export function createInjuryRiskService(db: any, userId: string): InjuryRiskService {
  return new InjuryRiskService(db, userId);
}
