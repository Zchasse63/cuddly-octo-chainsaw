/**
 * Coach Tools Structure Tests
 *
 * Tests tool definitions, structure, and permission checks.
 * For tool execution tests with real data, see tools-comprehensive.integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { getAllCoachTools, COACH_TOOL_COUNT } from '../coach';
import { db } from '../../db';
import type { ToolContext } from '../context';

// Real context for structure tests (tools don't hit DB for structure validation)
const coachContext: ToolContext = {
  db,
  userId: 'structure-test-coach',
  userRole: 'coach',
};

const athleteContext: ToolContext = {
  db,
  userId: 'structure-test-athlete',
  userRole: 'premium',
};

describe('Coach Tools', () => {

  describe('getAllCoachTools', () => {
    it('should return all 25 coach tools', () => {
      const tools = getAllCoachTools();
      const toolCount = Object.keys(tools).length;

      expect(toolCount).toBe(COACH_TOOL_COUNT);
      expect(toolCount).toBe(25);
    });

    it('should include client management tools', () => {
      const tools = getAllCoachTools();

      expect(tools.getClientList).toBeDefined();
      expect(tools.getClientProfile).toBeDefined();
      expect(tools.getClientWorkouts).toBeDefined();
      expect(tools.getClientProgress).toBeDefined();
      expect(tools.getClientHealthData).toBeDefined();
      expect(tools.getClientProgram).toBeDefined();
      expect(tools.getClientCheckIns).toBeDefined();
      expect(tools.getCoachNotes).toBeDefined();
      expect(tools.getClientInjuries).toBeDefined();
    });

    it('should include program management tools', () => {
      const tools = getAllCoachTools();

      expect(tools.getProgramTemplates).toBeDefined();
      expect(tools.assignProgramToClient).toBeDefined();
      expect(tools.getProgramAdherence).toBeDefined();
      expect(tools.getBulkAssignmentStatus).toBeDefined();
      expect(tools.getCSVImportStatus).toBeDefined();
    });

    it('should include messaging tools', () => {
      const tools = getAllCoachTools();

      expect(tools.getClientConversations).toBeDefined();
      expect(tools.getConversationMessages).toBeDefined();
      expect(tools.sendMessageToClient).toBeDefined();
    });

    it('should include analytics tools', () => {
      const tools = getAllCoachTools();

      expect(tools.getClientAnalyticsSummary).toBeDefined();
      expect(tools.getAtRiskClients).toBeDefined();
    });

    it('should include profile tools', () => {
      const tools = getAllCoachTools();

      expect(tools.getCoachProfile).toBeDefined();
      expect(tools.getPendingInvitations).toBeDefined();
    });

    it('should include future tools (stubs)', () => {
      const tools = getAllCoachTools();

      expect(tools.getWatchSyncStatus).toBeDefined();
      expect(tools.analyzeFormVideo).toBeDefined();
      expect(tools.detectPlateau).toBeDefined();
      expect(tools.getRecoveryPrediction).toBeDefined();
    });
  });

  describe('Tool Structure', () => {
    it('each tool factory should produce valid tools', () => {
      const toolFactories = getAllCoachTools();

      for (const [name, factory] of Object.entries(toolFactories)) {
        // Factory should be a function
        expect(typeof factory).toBe('function');

        // When called with context, should produce a tool (AI SDK tool format)
        const tool = factory(coachContext);
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        // AI SDK tools use 'inputSchema' not 'parameters'
        expect(tool.inputSchema).toBeDefined();
        expect(tool.execute).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('coach tools should deny access to non-coach users', async () => {
      const toolFactories = getAllCoachTools();

      // Test first tool - should return permission denied for athlete
      const firstFactory = Object.values(toolFactories)[0];
      const tool = firstFactory(athleteContext);
      // AI SDK v5: execute takes (input, options) where options has toolCallId and messages
      const result = await tool.execute!({}, { toolCallId: 'test-call-id', messages: [] });

      expect(result.success).toBe(false);
      expect((result as any).error.code).toBe('PERMISSION_DENIED');
    });
  });
});

