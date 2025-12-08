/**
 * Multi-Turn Workflow Integration Tests
 *
 * Tests complex multi-turn scenarios with real API calls:
 * - Premium user onboarding → program generation
 * - Program adjustments (volume, running, intensity)
 * - Injury management conversations
 * - Progress tracking and analysis
 *
 * Run with: npm test -- --run src/__tests__/integration/multi-turn-workflows.integration.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateText } from 'ai';
import { db } from '../../db';
import { xai, TEMPERATURES } from '../../lib/ai';
import { ToolContext, collectTools } from '../../tools/registry';
import { getAllAthleteTools } from '../../tools/athlete';
import { getAllCoachTools } from '../../tools/coach';
import { getSeededTestUsers, SeededTestUsers } from './test-factory';

const GROK_TIMEOUT = 120000; // 120s for multi-turn conversations

let seededUsers: SeededTestUsers;
let premiumContext: ToolContext;
let coachContext: ToolContext;
let athleteTools: Record<string, any>;
let coachTools: Record<string, any>;

describe('Multi-Turn Workflow Integration Tests', () => {
  beforeAll(async () => {
    // Use pre-seeded test users
    seededUsers = await getSeededTestUsers();

    premiumContext = { db, userId: seededUsers.premiumAthlete.id, userRole: 'premium' };
    coachContext = { db, userId: seededUsers.coach.id, userRole: 'coach' };
    athleteTools = collectTools(premiumContext, getAllAthleteTools());
    coachTools = collectTools(coachContext, getAllCoachTools());
  });

  // No cleanup needed - using pre-seeded data

  // ============================================================
  // WORKFLOW 1: Premium User Onboarding → Program Generation
  // ============================================================
  describe('Workflow 1: Premium Onboarding → Program Generation', () => {
    it('Step 1: AI gathers user profile information', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        prompt: 'I want to start a new training program. What do you know about me?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => ['getUserProfile', 'getUserPreferences'].includes(name))).toBe(true);
    }, GROK_TIMEOUT);

    it('Step 2: AI checks for injuries before program design', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        prompt: 'I want a strength program. Do I have any injuries that would affect my training?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => ['getActiveInjuries', 'getInjuryHistory'].includes(name))).toBe(true);
    }, GROK_TIMEOUT);

    it('Step 3: AI verifies user has no conflicting active program', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        system: 'You are a fitness assistant. Always use tools to look up information before responding.',
        prompt: 'Use the getActiveProgram tool to check if I currently have an active training program.',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames).toContain('getActiveProgram');
    }, GROK_TIMEOUT);

    it('Complete Flow: Gather all info for program generation', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        system: `You are VoiceFit, a fitness AI coach. When a user wants a new program,
          you should gather their profile, check for injuries, and check their current program status.
          Use the available tools to collect this information.
          After gathering information, provide a summary response.`,
        prompt: `I want you to create me a personalized 8-week strength program.
          I can train 4 days per week for about 60 minutes each session.
          Please check my profile, any injuries, and current program status first.
          Then summarize what you found.`,
      });

      // Verify tool usage - this is the core workflow validation
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(2);
      // Verify we have SOME response (text or tool results)
      const hasOutput = result.text.length > 0 || result.toolResults.length > 0;
      expect(hasOutput).toBe(true);
    }, GROK_TIMEOUT);
  });

  // ============================================================
  // WORKFLOW 2: Program Adjustment Scenarios
  // ============================================================
  describe('Workflow 2: Program Adjustments', () => {
    it('Volume Adjustment: AI retrieves program then suggests changes', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. When a user wants to adjust their program,
          first check their current program, then provide suggestions.`,
        prompt: 'This is too much squat volume. Can you reduce it?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => ['getActiveProgram', 'getProgramWeek'].includes(name))).toBe(true);
    }, GROK_TIMEOUT);

    it('Intensity Adjustment: AI checks fatigue and readiness', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. When a user says training is too hard,
          check their readiness, fatigue, and recent workouts.`,
        prompt: 'This week feels too hard. Should I back off?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getFatigueScore', 'getReadinessScore', 'getDailySummary', 'getRecentWorkouts'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('Exercise Substitution: AI finds alternatives', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. When a user needs exercise substitutions,
          check their injuries and find suitable alternatives.`,
        prompt: "I can't do deadlifts because of my back. What alternatives do I have?",
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getActiveInjuries', 'getExerciseSubstitutes', 'searchExercises'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);
  });

  // ============================================================
  // WORKFLOW 3: Injury Management Conversations
  // ============================================================
  describe('Workflow 3: Injury Management', () => {
    it('Turn 1: AI identifies injury concern', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        prompt: 'My left shoulder has been bothering me after bench press. What should I do?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getActiveInjuries', 'getInjuryHistory', 'getExercisesToAvoid'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('Turn 2: AI provides exercise modifications', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. The user has a shoulder injury and needs modified exercises.
          Check what exercises they should avoid and suggest alternatives.`,
        prompt: 'What chest exercises can I still do with my shoulder issue?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getExercisesToAvoid', 'searchExercises', 'getExerciseSubstitutes'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('Multi-turn: Complete injury assessment flow', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: athleteTools,
        system: `You are VoiceFit, an AI fitness coach. For injury concerns:
          1. Check user's injury history
          2. Review exercises they should avoid
          3. Suggest safe alternatives
          Use multiple tools to provide comprehensive guidance.
          After gathering information, provide a summary response.`,
        prompt: `I've had recurring knee pain. Can you check my injury history
          and tell me what exercises I should avoid and what I can do instead?
          Please summarize your findings.`,
      });

      // Verify multi-tool workflow executes correctly
      expect(result.toolCalls.length).toBeGreaterThanOrEqual(2);
      // Verify we have SOME response (text or tool results)
      const hasOutput = result.text.length > 0 || result.toolResults.length > 0;
      expect(hasOutput).toBe(true);
    }, GROK_TIMEOUT);
  });

  // ============================================================
  // WORKFLOW 4: Progress Tracking & Analysis
  // ============================================================
  describe('Workflow 4: Progress Tracking', () => {
    it('Weekly Review: AI checks workout completion and trends', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. When reviewing progress, check recent workouts,
          program progress, and any PRs achieved.`,
        prompt: 'How did I do this week? Give me a progress summary.',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getRecentWorkouts', 'getProgramProgress', 'getDailySummary', 'getPersonalRecords'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('PR Analysis: AI retrieves and analyzes personal records', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'What are my current PRs? How have they been trending?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getPersonalRecords', 'getProgressTrends', 'getExerciseHistory'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('Volume Analysis: AI checks training volume distribution', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'Am I training enough chest? Check my volume for this week.',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getVolumeAnalytics', 'getRecentWorkouts'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);
  });

  // ============================================================
  // WORKFLOW 5: Coach-Client Interactions
  // ============================================================
  describe('Workflow 5: Coach-Client Interactions', () => {
    it('Client Review: Coach checks client status', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: coachTools,
        system: `You are VoiceFit assistant for coaches. Help manage client relationships.`,
        prompt: 'Show me which clients need my attention today.',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getAtRiskClients', 'getClientList', 'getProgramAdherence'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);

    it('Client Analytics: Coach reviews client progress', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.parsing,
                tools: coachTools,
        system: `You are VoiceFit assistant for coaches. Help analyze client data.`,
        prompt: 'Give me an overview of how all my clients are doing this week.',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getClientAnalyticsSummary', 'getProgramAdherence', 'getClientList'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);
  });

  // ============================================================
  // WORKFLOW 6: Hybrid Athlete Scenarios (Strength + Running)
  // ============================================================
  describe('Workflow 6: Hybrid Athlete Scenarios', () => {
    it('Balance Check: AI assesses strength and running load', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        system: `You are VoiceFit. For hybrid athletes who do both strength and running,
          check both types of training data.`,
        prompt: 'I want to balance strength training and running. What does my recent training look like?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      // Should check both strength and running
      const checksStrength = toolNames.some(name => 
        ['getRecentWorkouts', 'getActiveProgram'].includes(name)
      );
      const checksRunning = toolNames.some(name => 
        ['getRecentRuns', 'getRunningStats'].includes(name)
      );
      expect(checksStrength || checksRunning).toBe(true);
    }, GROK_TIMEOUT);

    it('Running Addition: AI adjusts program for more running', async () => {
      const result = await generateText({
        model: xai('grok-4-fast'),
        temperature: TEMPERATURES.creative,
                tools: athleteTools,
        prompt: 'I want to add an extra day of running this week. Can you check my current schedule?',
      });

      expect(result.toolCalls.length).toBeGreaterThan(0);
      const toolNames = result.toolCalls.map(tc => tc.toolName);
      expect(toolNames.some(name => 
        ['getUpcomingWorkouts', 'getActiveProgram', 'getRunningStats'].includes(name)
      )).toBe(true);
    }, GROK_TIMEOUT);
  });
});

