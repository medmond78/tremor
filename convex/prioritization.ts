import { v } from 'convex/values';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import { internal } from './_generated/api';
import { logger } from '../lib/logger';
import { calculateVolatility } from '../lib/scoring';

// MARKET PRIORITIZATION ALGORITHM
// Determines which markets to sync most frequently based on activity

export const updateMarketPriority = internalMutation({
  args: {
    conditionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get market data
    const market = await ctx.db
      .query('markets')
      .withIndex('by_condition', (q) => q.eq('conditionId', args.conditionId))
      .first();

    if (!market) return null;

    // Get recent activity
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recentSnapshots = await ctx.db
      .query('priceSnapshots')
      .withIndex('by_market_time', (q) =>
        q.eq('conditionId', args.conditionId).gte('timestampMs', hourAgo)
      )
      .collect();

    // Calculate activity metrics
    const priceVolatility = calculateVolatility(recentSnapshots);
    const volumeUsd = (market.volume24hr || 0) * 0.5; // Approximate USD
    const spread =
      market.bestAsk && market.bestBid ? market.bestAsk - market.bestBid : 0.1;

    // Scoring algorithm for priority
    let priorityScore = 0;

    // Volume component (0-40 points)
    if (volumeUsd > 100000) priorityScore += 40;
    else if (volumeUsd > 50000) priorityScore += 35;
    else if (volumeUsd > 10000) priorityScore += 30;
    else if (volumeUsd > 5000) priorityScore += 20;
    else if (volumeUsd > 1000) priorityScore += 10;
    else priorityScore += 5;

    // Volatility component (0-30 points)
    if (priceVolatility > 0.1)
      priorityScore += 30; // 10%+ volatility
    else if (priceVolatility > 0.05) priorityScore += 25;
    else if (priceVolatility > 0.02) priorityScore += 20;
    else if (priceVolatility > 0.01) priorityScore += 10;
    else priorityScore += 5;

    // Liquidity component (0-20 points)
    if (spread < 0.02)
      priorityScore += 20; // Tight spread = high liquidity
    else if (spread < 0.05) priorityScore += 15;
    else if (spread < 0.1) priorityScore += 10;
    else priorityScore += 5;

    // Recency component (0-10 points)
    const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];
    if (lastSnapshot) {
      const minutesSinceLast = (Date.now() - lastSnapshot.timestampMs) / 60000;
      if (minutesSinceLast < 5) priorityScore += 10;
      else if (minutesSinceLast < 15) priorityScore += 7;
      else if (minutesSinceLast < 30) priorityScore += 5;
    }

    // Determine priority tier
    let priority: 'hot' | 'warm' | 'cold';
    if (priorityScore >= 70)
      priority = 'hot'; // Sync every 15 seconds
    else if (priorityScore >= 40)
      priority = 'warm'; // Sync every minute
    else priority = 'cold'; // Sync every 5 minutes

    // Update or create sync state
    const existing = await ctx.db
      .query('marketSyncState')
      .withIndex('by_condition', (q) => q.eq('conditionId', args.conditionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priority,
        lastTradeFetchMs: existing.lastTradeFetchMs || Date.now(),
      });
    } else {
      await ctx.db.insert('marketSyncState', {
        conditionId: args.conditionId,
        priority,
        lastTradeFetchMs: Date.now(),
      });
    }

    return { priority, score: priorityScore };
  },
});

// Get markets by priority for syncing
export const getMarketsByPriority = query({
  args: {
    priority: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Calculate time threshold based on priority
    let thresholdMs: number;
    switch (args.priority) {
      case 'hot':
        thresholdMs = 15 * 1000; // 15 seconds
        break;
      case 'warm':
        thresholdMs = 60 * 1000; // 1 minute
        break;
      case 'cold':
        thresholdMs = 5 * 60 * 1000; // 5 minutes
        break;
      default:
        thresholdMs = 60 * 1000;
    }

    const cutoff = Date.now() - thresholdMs;

    // Get markets that need updating
    const syncStates = await ctx.db
      .query('marketSyncState')
      .withIndex('by_priority', (q) =>
        q.eq('priority', args.priority).lte('lastTradeFetchMs', cutoff)
      )
      .take(limit);

    // Join with market data
    const results = await Promise.all(
      syncStates.map(async (state) => {
        const market = await ctx.db
          .query('markets')
          .withIndex('by_condition', (q) =>
            q.eq('conditionId', state.conditionId)
          )
          .first();

        return {
          conditionId: state.conditionId,
          priority: state.priority,
          lastFetchMs: state.lastTradeFetchMs,
          market,
        };
      })
    );

    return results.filter((r) => r.market !== null);
  },
});

// Query active markets to prioritize
export const getActiveMarketsForPriority = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('markets')
      .withIndex('by_active_volume', (q) => q.eq('active', true))
      .take(100);
  },
});

// Batch update all market priorities (run periodically via action)
export const updateAllPriorities = internalAction({
  args: {},
  handler: async (ctx) => {
    const markets = await ctx.runQuery(
      internal.prioritization.getActiveMarketsForPriority,
      {}
    );

    let updated = 0;
    for (const market of markets) {
      await ctx.runMutation(internal.prioritization.updateMarketPriority, {
        conditionId: market.conditionId,
      });
      updated++;
      if (updated >= 100) break;
    }

    logger.info(`Updated priority for ${updated} markets`);
    return updated;
  },
});
