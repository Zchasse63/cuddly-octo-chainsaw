/**
 * Web Dashboard AI Service
 *
 * Provides AI-powered coaching features for the coach web dashboard.
 * Uses the unified coach service with specialized tools.
 */

import type { Database } from '../db';
import { createUnifiedCoachV2 } from './unifiedCoachV2';

export interface MessageSuggestionInput {
  conversationContext: Array<{ role: 'user' | 'assistant'; content: string }>;
  clientProfile: {
    name: string;
    experienceLevel?: string;
    goals?: string[];
    injuries?: string;
  };
}

export interface ProgramGenerationInput {
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  timeConstraints: {
    sessionsPerWeek: number;
    minutesPerSession: number;
  };
}

export interface ClientHealth {
  readinessScore?: {
    sleep: number | null;
    stress: number | null;
    soreness: number | null;
    energy: number | null;
  };
  injuries?: Array<{ type: string; bodyPart: string; severity: string | null }>;
  healthMetrics?: Record<string, any>;
}

export async function generateMessageSuggestion(
  db: Database,
  coachId: string,
  input: MessageSuggestionInput
): Promise<{ suggestedResponse: string; confidence: number }> {
  const coach = await createUnifiedCoachV2(db);

  // Build context from conversation and client profile
  const prompt = `Based on this conversation with ${input.clientProfile.name}, suggest a helpful response as their coach.

Client Profile:
- Experience Level: ${input.clientProfile.experienceLevel || 'unknown'}
- Goals: ${input.clientProfile.goals?.join(', ') || 'not specified'}
- Active Injuries: ${input.clientProfile.injuries || 'none'}

Recent conversation:
${input.conversationContext.map(m => `${m.role === 'user' ? input.clientProfile.name : 'Coach'}: ${m.content}`).join('\n')}

Provide a supportive, professional coaching response that addresses their needs.`;

  const response = await coach.processMessage(prompt, {
    userId: coachId,
    name: 'Coach',
    conversationHistory: [],
  });

  return {
    suggestedResponse: response.message,
    confidence: 0.85, // Static confidence for now
  };
}

export async function generateProgram(
  db: Database,
  coachId: string,
  input: ProgramGenerationInput
): Promise<{
  program: {
    name: string;
    description: string;
    programType: 'strength' | 'running' | 'hybrid' | 'crossfit' | 'custom';
    durationWeeks: number;
    daysPerWeek: number;
  };
  workouts: Array<{
    day: number;
    name: string;
    description: string;
  }>;
}> {
  const coach = await createUnifiedCoachV2(db);

  const prompt = `Create a ${input.timeConstraints.sessionsPerWeek}-day per week training program with these requirements:

Goals: ${input.goals.join(', ')}
Fitness Level: ${input.fitnessLevel}
Available Equipment: ${input.equipment.join(', ')}
Session Duration: ${input.timeConstraints.minutesPerSession} minutes

Provide:
1. A descriptive program name
2. Program description (2-3 sentences)
3. Program type (strength/running/hybrid/crossfit/custom)
4. Duration in weeks (4-12 weeks based on goals)
5. Brief workout outline for each training day

Be specific and practical for a coach to implement.`;

  const response = await coach.processMessage(prompt, {
    userId: coachId,
    name: 'Coach',
    conversationHistory: [],
  });

  // Parse AI response into structured format
  // For now, return a structured fallback - in production, use LLM structured output
  const programType = input.goals.some(g => g.toLowerCase().includes('run')) ? 'running' :
                      input.goals.some(g => g.toLowerCase().includes('strength')) ? 'strength' :
                      'hybrid';

  return {
    program: {
      name: `${input.fitnessLevel.charAt(0).toUpperCase() + input.fitnessLevel.slice(1)} ${programType.charAt(0).toUpperCase() + programType.slice(1)} Program`,
      description: response.message.substring(0, 200) + '...',
      programType,
      durationWeeks: 8,
      daysPerWeek: input.timeConstraints.sessionsPerWeek,
    },
    workouts: Array.from({ length: input.timeConstraints.sessionsPerWeek }, (_, i) => ({
      day: i + 1,
      name: `Day ${i + 1} Training`,
      description: `${input.timeConstraints.minutesPerSession}-minute session`,
    })),
  };
}

export interface AnalyticsInsight {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  clientIds: string[];
}

export async function analyzeCoachAnalytics(
  db: Database,
  coachId: string,
  clientStats: Array<{
    clientId: string;
    name: string;
    adherence: number;
    lastWorkout?: Date;
    programType?: string;
  }>
): Promise<{ insights: AnalyticsInsight[]; cachedAt: Date }> {
  const coach = await createUnifiedCoachV2(db);

  const prompt = `Analyze this coach's client data and provide 3-5 actionable insights:

${clientStats.map(c => `- ${c.name}: ${c.adherence}% adherence, ${c.programType || 'no program'}, last workout ${c.lastWorkout ? new Date(c.lastWorkout).toLocaleDateString() : 'never'}`).join('\n')}

Identify:
1. Clients needing attention (low adherence, inactive)
2. Program performance trends
3. Opportunities for growth
4. Risk factors or concerns

Provide 3-5 specific, actionable insights with priority levels.`;

  const response = await coach.processMessage(prompt, {
    userId: coachId,
    name: 'Coach',
    conversationHistory: [],
  });

  // Parse response into structured insights
  // For production, use LLM structured output or more sophisticated parsing
  const lowAdherenceClients = clientStats.filter(c => c.adherence < 50);
  const inactiveClients = clientStats.filter(c => !c.lastWorkout ||
    (new Date().getTime() - new Date(c.lastWorkout).getTime()) > 14 * 24 * 60 * 60 * 1000);

  const insights: AnalyticsInsight[] = [];

  if (lowAdherenceClients.length > 0) {
    insights.push({
      id: '1',
      title: `${lowAdherenceClients.length} client${lowAdherenceClients.length > 1 ? 's' : ''} with low adherence`,
      description: `${lowAdherenceClients.map(c => c.name).join(', ')} ${lowAdherenceClients.length > 1 ? 'are' : 'is'} showing decreased adherence (<50%). Consider reaching out to understand barriers.`,
      priority: 'high',
      clientIds: lowAdherenceClients.map(c => c.clientId),
    });
  }

  if (inactiveClients.length > 0) {
    insights.push({
      id: '2',
      title: `${inactiveClients.length} inactive client${inactiveClients.length > 1 ? 's' : ''}`,
      description: `${inactiveClients.map(c => c.name).join(', ')} ${inactiveClients.length > 1 ? 'have' : 'has'} not logged workouts in 2+ weeks. Check in to maintain engagement.`,
      priority: 'medium',
      clientIds: inactiveClients.map(c => c.clientId),
    });
  }

  // Add generic insight from AI response
  insights.push({
    id: '3',
    title: 'AI Analysis',
    description: response.message.substring(0, 150) + '...',
    priority: 'low',
    clientIds: [],
  });

  return {
    insights: insights.slice(0, 5), // Max 5 insights
    cachedAt: new Date(),
  };
}

export async function analyzeClientHealth(
  db: Database,
  coachId: string,
  clientId: string,
  healthData: ClientHealth
): Promise<{
  summary: string;
  status: 'green' | 'yellow' | 'red';
  riskFactors: string[];
  recommendations: string[];
  analyzedAt: Date;
}> {
  const coach = await createUnifiedCoachV2(db);

  const prompt = `Analyze this client's health and readiness data:

Readiness Score:
- Sleep: ${healthData.readinessScore?.sleep || 'N/A'}/10
- Stress: ${healthData.readinessScore?.stress || 'N/A'}/10
- Soreness: ${healthData.readinessScore?.soreness || 'N/A'}/10
- Energy: ${healthData.readinessScore?.energy || 'N/A'}/10

Active Injuries: ${healthData.injuries?.map(i => `${i.bodyPart} ${i.type} (${i.severity})`).join(', ') || 'None'}

Provide:
1. Overall health status summary (2-3 sentences)
2. Risk factors or concerns
3. 3-5 coaching recommendations

Be specific and actionable for a coach.`;

  const response = await coach.processMessage(prompt, {
    userId: coachId,
    name: 'Coach',
    conversationHistory: [],
  });

  // Calculate status based on readiness and injuries
  const avgReadiness = healthData.readinessScore
    ? ((healthData.readinessScore.sleep ?? 0) + (healthData.readinessScore.stress ?? 0) +
       (healthData.readinessScore.soreness ?? 0) + (healthData.readinessScore.energy ?? 0)) / 4
    : 0;

  const hasActiveInjuries = (healthData.injuries?.length || 0) > 0;
  const riskFactorCount = ((healthData.readinessScore?.stress || 0) < 5 ? 1 : 0) +
                          ((healthData.readinessScore?.soreness || 0) > 7 ? 1 : 0);

  let status: 'green' | 'yellow' | 'red';
  if (avgReadiness > 7 && !hasActiveInjuries && riskFactorCount === 0) {
    status = 'green';
  } else if (avgReadiness < 5 || hasActiveInjuries || riskFactorCount >= 3) {
    status = 'red';
  } else {
    status = 'yellow';
  }

  // Extract risk factors
  const riskFactors: string[] = [];
  if (healthData.readinessScore?.stress && healthData.readinessScore.stress < 5) {
    riskFactors.push('High stress levels');
  }
  if (healthData.readinessScore?.soreness && healthData.readinessScore.soreness > 7) {
    riskFactors.push('Elevated muscle soreness');
  }
  if (healthData.readinessScore?.sleep && healthData.readinessScore.sleep < 6) {
    riskFactors.push('Poor sleep quality');
  }
  if (hasActiveInjuries) {
    riskFactors.push(`Active injury: ${healthData.injuries![0].bodyPart}`);
  }

  // Extract recommendations (simple parsing)
  const recommendations = [
    'Monitor training volume if soreness persists',
    'Consider active recovery session',
    'Ensure adequate sleep and nutrition',
  ];

  return {
    summary: response.message.split('\n')[0] || 'Health data analyzed.',
    status,
    riskFactors,
    recommendations,
    analyzedAt: new Date(),
  };
}
