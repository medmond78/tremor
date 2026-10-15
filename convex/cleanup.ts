import { internalAction, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
// Logger removed - not available in Convex runtime

// CONSOLIDATED CLEANUP MODULE - Single source of truth for data retention
// Retention policies:
// - Price snapshots: 26 hours (for 24h scoring window + buffer)
// - Scores: 48 hours (for historical comparison)

export const cleanupOldData = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    snapshotsDeleted: number;
    scoresDeleted: number;
    summariesDeleted: number;
    aiExpiredDeleted: number;
  }> => {
    const now = Date.now();

    // 1. Clean up price snapshots older than 26 hours (loop in batches)
    const snapshotCutoff = now - 26 * 60 * 60 * 1000;
    let snapshotsDeleted = 0;
    while (true) {
      const deleted: number = await ctx.runMutation(
        internal.cleanup.deleteOldSnapshots,
        {
          cutoff: snapshotCutoff,
          batchSize: 500,
        }
      );
      snapshotsDeleted += deleted;
      if (deleted < 500 || snapshotsDeleted >= 50000) break;
    }

    // 2. Clean up scores older than 48 hours
    const scoreCutoff = now - 48 * 60 * 60 * 1000;
    let scoresDeleted = 0;
    while (true) {
      const deleted: number = await ctx.runMutation(
        internal.cleanup.deleteOldScores,
        {
          cutoff: scoreCutoff,
          batchSize: 500,
        }
      );
      scoresDeleted += deleted;
      if (deleted < 500 || scoresDeleted >= 10000) break;
    }

    // 3. Clean up summaries older than 24 hours
    const summaryCutoff = now - 24 * 60 * 60 * 1000;
    const summariesDeleted: number = await ctx.runMutation(
      internal.cleanup.deleteOldSummaries,
      { cutoff: summaryCutoff }
    );

    // 4. Clean up expired AI analyses
    const aiResult = await ctx.runMutation(
      internal.aiAnalysis.cleanupExpired,
      {}
    );
    const aiExpiredDeleted = aiResult?.deleted || 0;

    console.log(
      `Cleanup completed: ${snapshotsDeleted} snapshots, ${scoresDeleted} scores, ${summariesDeleted} summaries, ${aiExpiredDeleted} AI analyses deleted.`
    );

    return {
      snapshotsDeleted,
      scoresDeleted,
      summariesDeleted,
      aiExpiredDeleted,
    };
  },
});

export const deleteOldSnapshots = internalMutation({
  args: {
    cutoff: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 500;

    // Use by_time index instead of full table scan
    const oldSnapshots = await ctx.db
      .query('priceSnapshots')
      .withIndex('by_time', (q) => q.lt('timestampMs', args.cutoff))
      .take(batchSize);

    let deleted = 0;
    for (const snapshot of oldSnapshots) {
      await ctx.db.delete(snapshot._id);
      deleted++;
    }

    return deleted;
  },
});

export const deleteOldScores = internalMutation({
  args: {
    cutoff: v.number(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 500;

    const oldScores = await ctx.db
      .query('scores_lite')
      .filter((q) => q.lt(q.field('updatedAt'), args.cutoff))
      .take(batchSize);

    let deleted = 0;
    for (const score of oldScores) {
      await ctx.db.delete(score._id);
      deleted++;
    }

    return deleted;
  },
});

export const deleteOldSummaries = internalMutation({
  args: {
    cutoff: v.number(),
  },
  handler: async (ctx, args) => {
    const oldSummaries = await ctx.db
      .query('marketSummary')
      .filter((q) => q.lt(q.field('generatedAt'), args.cutoff))
      .collect();

    let deleted = 0;
    for (const summary of oldSummaries) {
      await ctx.db.delete(summary._id);
      deleted++;
    }

    return deleted;
  },
});

// Emergency clear all data (use with caution)
export const clearAllData = internalMutation({
  args: { confirmKey: v.string() },
  handler: async (ctx, args) => {
    if (args.confirmKey !== 'DELETE_ALL_DATA_CONFIRMED') {
      throw new Error('Invalid confirmation key');
    }

    const tables = [
      'events',
      'markets',
      'priceSnapshots',
      'scores_lite',
      'marketSyncState',
    ];
    const results: Record<string, number> = {};

    for (const table of tables) {
      let deleted = 0;
      let hasMore = true;

      while (hasMore) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const docs = await ctx.db.query(table as any).take(100);

        for (const doc of docs) {
          await ctx.db.delete(doc._id);
          deleted++;
        }

        hasMore = docs.length === 100;

        // Safety limit
        if (deleted > 10000) {
          console.warn(`Stopped deleting ${table} at 10000 docs`);
          break;
        }
      }

      results[table] = deleted;
    }

    console.log('All data cleared:', results);
    return results;
  },
});
