/**
 * Coach Program Management Tools
 *
 * Tools for coaches to manage training programs and assignments.
 * All client-specific tools verify coach-client relationships.
 */

import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { createTool } from '../registry';
import { toolSuccess, toolError } from '../utils';
import { trainingPrograms } from '../../db/schema';
import { isCoachOfClient, getCoachClients } from './helpers';

// Tool 45: Get Program Templates
export const getProgramTemplates = createTool({
  name: 'getProgramTemplates',
  description: 'Get available program templates for assignment',
  parameters: z.object({
    programType: z.enum(['strength', 'running', 'hybrid', 'crossfit', 'custom', 'all']).default('all'),
    limit: z.number().min(1).max(50).default(20),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Templates are programs with isTemplate = true
    const templates = await ctx.db.query.trainingPrograms.findMany({
      where: params.programType === 'all'
        ? eq(trainingPrograms.isTemplate, true)
        : and(
            eq(trainingPrograms.isTemplate, true),
            eq(trainingPrograms.programType, params.programType as 'strength' | 'running' | 'hybrid' | 'crossfit' | 'custom')
          ),
      orderBy: [desc(trainingPrograms.createdAt)],
      limit: params.limit,
    });

    return toolSuccess({
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        programType: t.programType,
        durationWeeks: t.durationWeeks,
        daysPerWeek: t.daysPerWeek,
        primaryGoal: t.primaryGoal,
      })),
      totalCount: templates.length,
    });
  },
});

// Tool 46: Assign Program to Client
export const assignProgramToClient = createTool({
  name: 'assignProgramToClient',
  description: 'Assign a program template to a client',
  parameters: z.object({
    clientId: z.string().uuid().describe('Client user ID'),
    templateId: z.string().uuid().describe('Program template ID'),
    startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    customizations: z.object({
      name: z.string().optional(),
      daysPerWeek: z.number().min(1).max(7).optional(),
    }).optional(),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    // Verify coach has access to this client
    const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
    if (!hasAccess) {
      return toolError('Not authorized to assign programs to this client', 'UNAUTHORIZED');
    }

    // Get template
    const template = await ctx.db.query.trainingPrograms.findFirst({
      where: and(
        eq(trainingPrograms.id, params.templateId),
        eq(trainingPrograms.isTemplate, true)
      ),
    });

    if (!template) {
      return toolError('Template not found', 'TEMPLATE_NOT_FOUND');
    }

    // Check if client already has active program
    const existingProgram = await ctx.db.query.trainingPrograms.findFirst({
      where: and(
        eq(trainingPrograms.userId, params.clientId),
        eq(trainingPrograms.status, 'active')
      ),
    });

    if (existingProgram) {
      return toolError('Client already has an active program', 'PROGRAM_EXISTS');
    }

    // Create new program from template (simplified - full implementation would copy weeks/days)
    // startDate is a date column (string format YYYY-MM-DD)
    const startDateStr = params.startDate ?? new Date().toISOString().split('T')[0];

    const [newProgram] = await ctx.db.insert(trainingPrograms).values({
      userId: params.clientId,
      name: params.customizations?.name ?? template.name,
      description: template.description,
      programType: template.programType,
      durationWeeks: template.durationWeeks,
      daysPerWeek: params.customizations?.daysPerWeek ?? template.daysPerWeek,
      primaryGoal: template.primaryGoal,
      status: 'active',
      currentWeek: 1,
      currentDay: 1,
      startDate: startDateStr,
      templateId: template.id,
      createdByCoachId: ctx.userId,
    }).returning();

    return toolSuccess({
      success: true,
      program: {
        id: newProgram.id,
        name: newProgram.name,
        clientId: params.clientId,
        startDate: newProgram.startDate,
      },
    });
  },
});

// Tool 47: Get Program Adherence
export const getProgramAdherence = createTool({
  name: 'getProgramAdherence',
  description: 'Get program adherence stats for a client or all clients',
  parameters: z.object({
    clientId: z.string().uuid().optional().describe('Specific client ID'),
  }),
  requiredRole: 'coach',
  execute: async (params, ctx) => {
    if (params.clientId) {
      // Verify coach has access to this client
      const hasAccess = await isCoachOfClient(ctx.db, ctx.userId, params.clientId);
      if (!hasAccess) {
        return toolError('Not authorized to view this client', 'UNAUTHORIZED');
      }

      const program = await ctx.db.query.trainingPrograms.findFirst({
        where: and(
          eq(trainingPrograms.userId, params.clientId),
          eq(trainingPrograms.status, 'active')
        ),
      });

      if (!program) {
        return toolSuccess({ hasProgram: false });
      }

      return toolSuccess({
        hasProgram: true,
        clientId: params.clientId,
        adherence: {
          programName: program.name,
          adherencePercent: program.adherencePercent ?? 0,
          workoutsCompleted: program.totalWorkoutsCompleted ?? 0,
          workoutsScheduled: program.totalWorkoutsScheduled ?? 0,
          currentWeek: program.currentWeek,
          totalWeeks: program.durationWeeks,
        },
      });
    }

    // Get adherence for all coach's clients
    const { clients } = await getCoachClients(ctx.db, ctx.userId, { status: 'active' });

    if (clients.length === 0) {
      return toolSuccess({
        hasClients: false,
        clients: [],
      });
    }

    // Get programs for all clients
    const clientIds = clients.map(c => c.clientId);
    const programs = await ctx.db.query.trainingPrograms.findMany({
      where: and(
        eq(trainingPrograms.status, 'active')
      ),
    });

    // Filter to only coach's clients
    const clientPrograms = programs.filter(p => clientIds.includes(p.userId));

    return toolSuccess({
      hasClients: true,
      clients: clientPrograms.map(p => ({
        clientId: p.userId,
        programName: p.name,
        adherencePercent: p.adherencePercent ?? 0,
        currentWeek: p.currentWeek,
        totalWeeks: p.durationWeeks,
      })),
    });
  },
});

// Tool 48: Get Bulk Assignment Status
export const getBulkAssignmentStatus = createTool({
  name: 'getBulkAssignmentStatus',
  description: 'Get status of bulk program assignments',
  parameters: z.object({
    jobId: z.string().optional().describe('Specific job ID'),
  }),
  requiredRole: 'coach',
  execute: async (_params, _ctx) => {
    // Bulk assignment jobs would be tracked in a separate table
    return toolSuccess({
      message: 'Bulk assignment feature pending implementation',
      jobs: [],
    });
  },
});

// Tool 49: Get CSV Import Status
export const getCSVImportStatus = createTool({
  name: 'getCSVImportStatus',
  description: 'Get status of CSV client import',
  parameters: z.object({
    importId: z.string().optional().describe('Specific import ID'),
  }),
  requiredRole: 'coach',
  execute: async (_params, _ctx) => {
    // CSV imports would be tracked in a separate table
    return toolSuccess({
      message: 'CSV import feature pending implementation',
      imports: [],
    });
  },
});

// Export all program management tools
export const programTools = {
  getProgramTemplates,
  assignProgramToClient,
  getProgramAdherence,
  getBulkAssignmentStatus,
  getCSVImportStatus,
};

