import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { readinessScores } from '../db/schema/readiness';
import { workouts } from '../db/schema/workouts';
import { runningActivities } from '../db/schema/running';
import { generateCompletion, TEMPERATURES } from '../lib/ai';

// Correlation types
type CorrelationType =
  | 'nutrition_recovery'
  | 'sleep_performance'
  | 'volume_recovery'
  | 'sleep_workout_quality'
  | 'stress_performance';

// Time period options
type TimePeriod = 7 | 14 | 30 | 60;

// Correlation result
type CorrelationResult = {
  type: CorrelationType;
  correlation: number; // -1 to 1
  strength: 'weak' | 'moderate' | 'strong';
  direction: 'positive' | 'negative' | 'none';
  insight: string;
  dataPoints: number;
  recommendation?: string;
};

// Health score components
type HealthScore = {
  overall: number; // 0-100
  components: {
    sleep: number;
    recovery: number;
    consistency: number;
    nutrition: number;
    stress: number;
  };
  trend: 'improving' | 'declining' | 'stable';
  insights: string[];
};

export class HealthIntelligenceService {
  private db: any;
  private userId: string;

  constructor(db: any, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  // Get all correlations for a time period
  async getCorrelations(period: TimePeriod = 30): Promise<CorrelationResult[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const data = await this.getHealthData(startDate);

    if (data.length < 7) {
      return []; // Not enough data for meaningful correlations
    }

    // Convert snake_case to numbers (database returns strings)
    const normalizedData = data.map((d) => ({
      nutrition_score: Number(d.nutrition_score) || 0,
      recovery_score: Number(d.recovery_score) || 0,
      sleep_hours: Number(d.sleep_hours) || 0,
      workout_volume: Number(d.workout_volume) || 0,
      stress_level: Number(d.stress_level) || 0,
      workout_quality: Number(d.workoutQuality) || 0,
    }));

    const correlations: CorrelationResult[] = [];

    // Nutrition ↔ Recovery
    const nutritionRecovery = this.calculateCorrelation(
      normalizedData.map((d) => d.nutrition_score),
      normalizedData.map((d) => d.recovery_score)
    );
    correlations.push({
      type: 'nutrition_recovery',
      ...nutritionRecovery,
      insight: this.getNutritionRecoveryInsight(nutritionRecovery),
      dataPoints: data.length,
    });

    // Sleep ↔ Performance (workout volume next day)
    const sleepPerformance = this.calculateCorrelation(
      normalizedData.slice(0, -1).map((d) => d.sleep_hours),
      normalizedData.slice(1).map((d) => d.workout_volume)
    );
    correlations.push({
      type: 'sleep_performance',
      ...sleepPerformance,
      insight: this.getSleepPerformanceInsight(sleepPerformance),
      dataPoints: data.length - 1,
    });

    // Training Volume ↔ Recovery (next day)
    const volumeRecovery = this.calculateCorrelation(
      normalizedData.slice(0, -1).map((d) => d.workout_volume),
      normalizedData.slice(1).map((d) => d.recovery_score)
    );
    correlations.push({
      type: 'volume_recovery',
      ...volumeRecovery,
      insight: this.getVolumeRecoveryInsight(volumeRecovery),
      dataPoints: data.length - 1,
    });

    // Sleep ↔ Workout Quality
    const sleepWorkout = this.calculateCorrelation(
      normalizedData.map((d) => d.sleep_hours),
      normalizedData.map((d) => d.workout_quality)
    );
    correlations.push({
      type: 'sleep_workout_quality',
      ...sleepWorkout,
      insight: this.getSleepWorkoutInsight(sleepWorkout),
      dataPoints: data.length,
    });

    // Stress ↔ Performance
    const stressPerformance = this.calculateCorrelation(
      normalizedData.map((d) => d.stress_level),
      normalizedData.map((d) => d.workout_volume)
    );
    correlations.push({
      type: 'stress_performance',
      ...stressPerformance,
      insight: this.getStressPerformanceInsight(stressPerformance),
      dataPoints: data.length,
    });

    return correlations;
  }

  // Calculate overall health score
  async getHealthScore(): Promise<HealthScore> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentData, olderData] = await Promise.all([
      this.getHealthData(sevenDaysAgo),
      this.getHealthData(thirtyDaysAgo, sevenDaysAgo),
    ]);

    // Calculate component scores
    const sleepScore = this.calculateComponentScore(
      recentData.map((d) => d.sleepHours || 0),
      { min: 0, ideal: 8, max: 10 }
    );

    const recoveryScore = this.calculateComponentScore(
      recentData.map((d) => d.recoveryScore || 0),
      { min: 0, ideal: 85, max: 100 }
    );

    const consistencyScore = this.calculateConsistencyScore(recentData);

    const nutritionScore = this.calculateComponentScore(
      recentData.map((d) => d.nutritionScore || 0),
      { min: 0, ideal: 80, max: 100 }
    );

    const stressScore = 100 - this.calculateComponentScore(
      recentData.map((d) => d.stressLevel || 0),
      { min: 0, ideal: 0, max: 100 }
    ); // Invert stress

    // Overall score (weighted average)
    const overall = Math.round(
      sleepScore * 0.25 +
        recoveryScore * 0.25 +
        consistencyScore * 0.2 +
        nutritionScore * 0.15 +
        stressScore * 0.15
    );

    // Calculate trend
    const recentAvg = this.average(recentData.map((d) => d.recoveryScore || 0));
    const olderAvg = this.average(olderData.map((d) => d.recoveryScore || 0));
    const trend =
      recentAvg > olderAvg * 1.05
        ? 'improving'
        : recentAvg < olderAvg * 0.95
          ? 'declining'
          : 'stable';

    // Generate insights
    const insights = this.generateHealthInsights({
      sleepScore,
      recoveryScore,
      consistencyScore,
      nutritionScore,
      stressScore,
      overall,
    });

    return {
      overall,
      components: {
        sleep: Math.round(sleepScore),
        recovery: Math.round(recoveryScore),
        consistency: Math.round(consistencyScore),
        nutrition: Math.round(nutritionScore),
        stress: Math.round(stressScore),
      },
      trend,
      insights,
    };
  }

  // Generate AI insights based on correlations
  async generateAIInsights(period: TimePeriod = 30): Promise<string> {
    const correlations = await this.getCorrelations(period);
    const healthScore = await this.getHealthScore();

    if (correlations.length === 0) {
      return 'Not enough data to generate insights. Keep logging your readiness check-ins and workouts!';
    }

    const prompt = `Analyze this fitness data and provide personalized insights:

Health Score: ${healthScore.overall}/100
- Sleep: ${healthScore.components.sleep}/100
- Recovery: ${healthScore.components.recovery}/100
- Consistency: ${healthScore.components.consistency}/100
- Nutrition: ${healthScore.components.nutrition}/100
- Stress: ${healthScore.components.stress}/100
Trend: ${healthScore.trend}

Correlations found:
${correlations.map((c) => `- ${c.type}: ${c.strength} ${c.direction} correlation (${c.correlation.toFixed(2)})`).join('\n')}

Based on this data, provide 3-4 specific, actionable recommendations to improve performance and recovery. Be concise and practical.`;

    try {
      const response = await generateCompletion({
        systemPrompt:
          'You are a sports science expert providing personalized health and performance insights based on data analysis. Be specific, scientific, and actionable.',
        userPrompt: prompt,
        maxTokens: 500,
        temperature: TEMPERATURES.insights,
      });

      return response;
    } catch (error) {
      // Fallback to basic insights
      return healthScore.insights.join(' ');
    }
  }

  // Get health data for a time period
  private async getHealthData(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<HealthDataPoint[]> {
    const result = await this.db.execute(sql`
      WITH daily_data AS (
        SELECT
          DATE(r.created_at) as date,
          AVG(r.sleep_hours) as sleep_hours,
          AVG(r.sleep_quality) as sleep_quality,
          AVG(r.stress_level) as stress_level,
          AVG(r.soreness_level) as soreness_level,
          AVG(r.energy_level) as energy_level,
          AVG(r.motivation_level) as motivation_level,
          AVG(r.nutrition_quality) as nutrition_score,
          AVG(r.recovery_score) as recovery_score
        FROM readiness_check_ins r
        WHERE r.user_id = ${this.userId}
          AND r.created_at >= ${startDate}
          AND r.created_at <= ${endDate}
        GROUP BY DATE(r.created_at)
      ),
      workout_data AS (
        SELECT
          DATE(w.created_at) as date,
          COUNT(*) as workout_count,
          COALESCE(SUM(ws.weight * ws.reps), 0) as workout_volume
        FROM workouts w
        LEFT JOIN workout_sets ws ON ws.workout_id = w.id
        WHERE w.user_id = ${this.userId}
          AND w.created_at >= ${startDate}
          AND w.created_at <= ${endDate}
        GROUP BY DATE(w.created_at)
      )
      SELECT
        d.date,
        d.sleep_hours,
        d.sleep_quality,
        d.stress_level,
        d.soreness_level,
        d.energy_level,
        d.motivation_level,
        d.nutrition_score,
        d.recovery_score,
        COALESCE(w.workout_count, 0) as workout_count,
        COALESCE(w.workout_volume, 0) as workout_volume,
        COALESCE(d.energy_level, 50) as workout_quality
      FROM daily_data d
      LEFT JOIN workout_data w ON w.date = d.date
      ORDER BY d.date
    `);

    return result.rows as HealthDataPoint[];
  }

  // Calculate Pearson correlation coefficient
  private calculateCorrelation(
    x: number[],
    y: number[]
  ): { correlation: number; strength: 'weak' | 'moderate' | 'strong'; direction: 'positive' | 'negative' | 'none' } {
    if (x.length !== y.length || x.length < 3) {
      return { correlation: 0, strength: 'weak', direction: 'none' };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    const correlation = denominator === 0 ? 0 : numerator / denominator;
    const absCorrelation = Math.abs(correlation);

    return {
      correlation: Math.round(correlation * 100) / 100,
      strength:
        absCorrelation < 0.3 ? 'weak' : absCorrelation < 0.6 ? 'moderate' : 'strong',
      direction:
        absCorrelation < 0.1 ? 'none' : correlation > 0 ? 'positive' : 'negative',
    };
  }

  // Calculate component score
  private calculateComponentScore(
    values: number[],
    range: { min: number; ideal: number; max: number }
  ): number {
    if (values.length === 0) return 50;

    const avg = this.average(values);

    if (avg >= range.ideal) {
      return 100;
    }

    return Math.max(0, Math.min(100, (avg / range.ideal) * 100));
  }

  // Calculate consistency score
  private calculateConsistencyScore(data: HealthDataPoint[]): number {
    if (data.length < 3) return 50;

    const workoutDays = data.filter((d) => d.workout_count > 0).length;
    const totalDays = data.length;

    // Ideal is 4-5 workouts per 7 days
    const ratio = workoutDays / totalDays;
    const idealRatio = 4 / 7;

    if (ratio >= idealRatio * 0.9 && ratio <= idealRatio * 1.2) {
      return 100;
    }

    return Math.max(0, Math.min(100, (ratio / idealRatio) * 100));
  }

  // Helper functions
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Insight generators
  private getNutritionRecoveryInsight(
    result: { correlation: number; strength: string; direction: string }
  ): string {
    if (result.strength === 'strong' && result.direction === 'positive') {
      return 'Your nutrition quality strongly influences your recovery. On days you eat well, you recover better.';
    }
    if (result.strength === 'moderate') {
      return 'There is a moderate link between your nutrition and recovery.';
    }
    return 'Keep tracking to see how nutrition affects your recovery.';
  }

  private getSleepPerformanceInsight(
    result: { correlation: number; strength: string; direction: string }
  ): string {
    if (result.strength === 'strong' && result.direction === 'positive') {
      return 'Better sleep directly improves your next-day workout performance.';
    }
    if (result.direction === 'positive') {
      return 'More sleep tends to lead to better workouts.';
    }
    return 'Keep tracking to understand your sleep-performance relationship.';
  }

  private getVolumeRecoveryInsight(
    result: { correlation: number; strength: string; direction: string }
  ): string {
    if (result.direction === 'negative') {
      return 'Higher training volume impacts your recovery. Consider deload weeks.';
    }
    return 'Your body is handling training volume well.';
  }

  private getSleepWorkoutInsight(
    result: { correlation: number; strength: string; direction: string }
  ): string {
    if (result.strength === 'strong') {
      return 'Sleep quality has a major impact on your workout quality.';
    }
    return 'Sleep affects your workout quality.';
  }

  private getStressPerformanceInsight(
    result: { correlation: number; strength: string; direction: string }
  ): string {
    if (result.direction === 'negative') {
      return 'High stress is negatively impacting your workouts. Consider stress management.';
    }
    return 'Your stress levels are not significantly impacting performance.';
  }

  private generateHealthInsights(scores: Record<string, number>): string[] {
    const insights: string[] = [];

    if (scores.sleepScore < 60) {
      insights.push('Your sleep could use improvement. Aim for 7-9 hours per night.');
    }
    if (scores.recoveryScore < 50) {
      insights.push('Recovery is low. Consider adding rest days or reducing intensity.');
    }
    if (scores.consistencyScore > 80) {
      insights.push('Great workout consistency! Keep it up.');
    } else if (scores.consistencyScore < 50) {
      insights.push('Try to maintain a more consistent workout schedule.');
    }
    if (scores.stressScore < 50) {
      insights.push('Stress levels are elevated. Consider stress-reduction activities.');
    }

    if (insights.length === 0) {
      insights.push('Your health metrics are looking good. Keep maintaining your routine!');
    }

    return insights;
  }
}

// Data point type
type HealthDataPoint = {
  date: string;
  sleep_hours: number;
  sleep_quality: number;
  stress_level: number;
  soreness_level: number;
  energy_level: number;
  motivation_level: number;
  nutrition_score: number;
  recovery_score: number;
  workout_count: number;
  workout_volume: number;
  workoutQuality: number;
  sleepHours?: number;
  stressLevel?: number;
  nutritionScore?: number;
  recoveryScore?: number;
};

// Export factory function
export function createHealthIntelligence(db: any, userId: string): HealthIntelligenceService {
  return new HealthIntelligenceService(db, userId);
}
