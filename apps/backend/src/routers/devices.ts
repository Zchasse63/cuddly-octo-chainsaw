import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { deviceRegistrations, syncCheckpoints, pendingSyncOps, syncAuditLog, offlineQueue } from '../db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

export const devicesRouter = router({
  // ==================== Device Registration ====================

  // Register device
  registerDevice: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        deviceName: z.string().optional(),
        deviceModel: z.string().optional(),
        osName: z.enum(['ios', 'android']),
        osVersion: z.string().optional(),
        appVersion: z.string().optional(),
        pushToken: z.string().optional(),
        pushProvider: z.enum(['apns', 'fcm']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.deviceRegistrations.findFirst({
        where: and(
          eq(deviceRegistrations.userId, ctx.user.id),
          eq(deviceRegistrations.deviceId, input.deviceId)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(deviceRegistrations)
          .set({
            ...input,
            lastActiveAt: new Date(),
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(deviceRegistrations.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(deviceRegistrations)
        .values({
          userId: ctx.user.id,
          ...input,
          lastActiveAt: new Date(),
        })
        .returning();
      return created;
    }),

  // Get user's devices
  getDevices: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.deviceRegistrations.findMany({
      where: eq(deviceRegistrations.userId, ctx.user.id),
      orderBy: [desc(deviceRegistrations.lastActiveAt)],
    });
  }),

  // Update push token
  updatePushToken: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        pushToken: z.string(),
        pushProvider: z.enum(['apns', 'fcm']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(deviceRegistrations)
        .set({
          pushToken: input.pushToken,
          pushProvider: input.pushProvider,
          pushEnabled: true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(deviceRegistrations.userId, ctx.user.id),
          eq(deviceRegistrations.deviceId, input.deviceId)
        ))
        .returning();

      return updated;
    }),

  // Disable push notifications for device
  disablePush: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(deviceRegistrations)
        .set({
          pushEnabled: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(deviceRegistrations.userId, ctx.user.id),
          eq(deviceRegistrations.deviceId, input.deviceId)
        ))
        .returning();

      return updated;
    }),

  // Deactivate device
  deactivateDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(deviceRegistrations)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(deviceRegistrations.userId, ctx.user.id),
          eq(deviceRegistrations.deviceId, input.deviceId)
        ))
        .returning();

      return updated;
    }),

  // ==================== Sync Checkpoints (PowerSync) ====================

  // Get sync checkpoints
  getSyncCheckpoints: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.syncCheckpoints.findMany({
        where: and(
          eq(syncCheckpoints.userId, ctx.user.id),
          eq(syncCheckpoints.deviceId, input.deviceId)
        ),
      });
    }),

  // Update sync checkpoint
  updateSyncCheckpoint: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        bucketName: z.string(),
        lastSyncedOpId: z.string(),
        syncVersion: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.syncCheckpoints.findFirst({
        where: and(
          eq(syncCheckpoints.userId, ctx.user.id),
          eq(syncCheckpoints.deviceId, input.deviceId),
          eq(syncCheckpoints.bucketName, input.bucketName)
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(syncCheckpoints)
          .set({
            lastSyncedAt: new Date(),
            lastSyncedOpId: input.lastSyncedOpId,
            syncVersion: input.syncVersion,
            syncStatus: 'synced',
            updatedAt: new Date(),
          })
          .where(eq(syncCheckpoints.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(syncCheckpoints)
        .values({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          bucketName: input.bucketName,
          lastSyncedAt: new Date(),
          lastSyncedOpId: input.lastSyncedOpId,
          syncVersion: input.syncVersion,
          syncStatus: 'synced',
        })
        .returning();
      return created;
    }),

  // ==================== Offline Queue ====================

  // Push offline operations
  pushOfflineOps: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        operations: z.array(z.object({
          operationType: z.enum(['create', 'update', 'delete']),
          tableName: z.string(),
          recordId: z.string().uuid(),
          payload: z.record(z.unknown()),
          sequenceNumber: z.number(),
          clientTimestamp: z.date(),
        })),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ops = input.operations.map((op) => ({
        userId: ctx.user.id,
        deviceId: input.deviceId,
        ...op,
        status: 'pending' as const,
      }));

      await ctx.db.insert(offlineQueue).values(ops);

      return { success: true, count: ops.length };
    }),

  // Get pending offline operations (for processing)
  getPendingOps: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.offlineQueue.findMany({
        where: and(
          eq(offlineQueue.userId, ctx.user.id),
          eq(offlineQueue.deviceId, input.deviceId),
          eq(offlineQueue.status, 'pending')
        ),
        orderBy: [asc(offlineQueue.sequenceNumber)],
        limit: input.limit,
      });
    }),

  // Mark operations as processed
  markOpsProcessed: protectedProcedure
    .input(
      z.object({
        operationIds: z.array(z.string().uuid()),
        status: z.enum(['completed', 'failed']),
        errors: z.record(z.string()).optional(), // { opId: errorMessage }
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const opId of input.operationIds) {
        await ctx.db
          .update(offlineQueue)
          .set({
            status: input.status,
            processedAt: new Date(),
            error: input.errors?.[opId],
          })
          .where(and(
            eq(offlineQueue.id, opId),
            eq(offlineQueue.userId, ctx.user.id)
          ));
      }

      return { success: true };
    }),

  // ==================== Conflict Resolution ====================

  // Get pending conflicts
  getPendingConflicts: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.pendingSyncOps.findMany({
      where: and(
        eq(pendingSyncOps.userId, ctx.user.id),
        eq(pendingSyncOps.hasConflict, true),
        eq(pendingSyncOps.status, 'conflict')
      ),
      orderBy: [desc(pendingSyncOps.createdAt)],
    });
  }),

  // Resolve conflict
  resolveConflict: protectedProcedure
    .input(
      z.object({
        opId: z.string().uuid(),
        resolution: z.enum(['client_wins', 'server_wins', 'merged']),
        mergedData: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(pendingSyncOps)
        .set({
          conflictResolution: input.resolution,
          mergedData: input.resolution === 'merged' ? input.mergedData : undefined,
          resolvedAt: new Date(),
          status: 'applied',
        })
        .where(and(
          eq(pendingSyncOps.id, input.opId),
          eq(pendingSyncOps.userId, ctx.user.id)
        ))
        .returning();

      // Log resolution
      await ctx.db.insert(syncAuditLog).values({
        userId: ctx.user.id,
        eventType: 'conflict_resolved',
        tableName: updated.tableName,
        recordId: updated.recordId,
        details: {
          resolution: input.resolution,
          originalConflict: {
            local: updated.localData,
            server: updated.serverData,
          },
        },
      });

      return updated;
    }),

  // ==================== Sync Audit Log ====================

  // Get sync audit log
  getSyncAuditLog: protectedProcedure
    .input(
      z.object({
        deviceId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(syncAuditLog.userId, ctx.user.id)];

      if (input.deviceId) {
        conditions.push(eq(syncAuditLog.deviceId, input.deviceId));
      }

      return ctx.db.query.syncAuditLog.findMany({
        where: and(...conditions),
        orderBy: [desc(syncAuditLog.createdAt)],
        limit: input.limit,
      });
    }),

  // Log sync event
  logSyncEvent: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
        tableName: z.string().optional(),
        recordId: z.string().uuid().optional(),
        details: z.record(z.unknown()).optional(),
        errorMessage: z.string().optional(),
        deviceId: z.string().optional(),
        appVersion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [log] = await ctx.db
        .insert(syncAuditLog)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();

      return log;
    }),

  // ==================== Sync Status Summary ====================

  // Get overall sync status
  getSyncStatus: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [checkpoints, pendingOps, conflicts, recentErrors] = await Promise.all([
        ctx.db.query.syncCheckpoints.findMany({
          where: and(
            eq(syncCheckpoints.userId, ctx.user.id),
            eq(syncCheckpoints.deviceId, input.deviceId)
          ),
        }),
        ctx.db.execute(sql`
          SELECT COUNT(*) as count FROM offline_queue
          WHERE user_id = ${ctx.user.id}
            AND device_id = ${input.deviceId}
            AND status = 'pending'
        `),
        ctx.db.execute(sql`
          SELECT COUNT(*) as count FROM pending_sync_ops
          WHERE user_id = ${ctx.user.id}
            AND has_conflict = true
            AND status = 'conflict'
        `),
        ctx.db.query.syncAuditLog.findMany({
          where: and(
            eq(syncAuditLog.userId, ctx.user.id),
            eq(syncAuditLog.deviceId, input.deviceId),
            eq(syncAuditLog.eventType, 'error')
          ),
          orderBy: [desc(syncAuditLog.createdAt)],
          limit: 5,
        }),
      ]);

      const lastSync = checkpoints.reduce((latest, cp) => {
        if (!latest || (cp.lastSyncedAt && cp.lastSyncedAt > latest)) {
          return cp.lastSyncedAt;
        }
        return latest;
      }, null as Date | null);

      return {
        lastSyncAt: lastSync,
        checkpoints: checkpoints.map((cp) => ({
          bucket: cp.bucketName,
          status: cp.syncStatus,
          lastSynced: cp.lastSyncedAt,
        })),
        pendingOpsCount: Number(pendingOps.rows[0]?.count || 0),
        conflictsCount: Number(conflicts.rows[0]?.count || 0),
        recentErrors,
        isFullySynced: Number(pendingOps.rows[0]?.count || 0) === 0 &&
          Number(conflicts.rows[0]?.count || 0) === 0,
      };
    }),
});
