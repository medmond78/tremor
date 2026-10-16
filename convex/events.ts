import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

// Upsert event
export const upsertEvent = internalMutation({
  args: {
    event: v.object({
      eventId: v.string(),
      slug: v.string(),
      title: v.string(),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      image: v.optional(v.string()),
      active: v.boolean(),
      closed: v.boolean(),
      liquidity: v.optional(v.float64()),
      volume: v.optional(v.float64()),
      volume24hr: v.float64(),
      restricted: v.optional(v.boolean()),
      source: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('events')
      .withIndex('by_event', (q) => q.eq('eventId', args.event.eventId))
      .first();

    const eventData = {
      ...args.event,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, eventData);
    } else {
      await ctx.db.insert('events', eventData);
    }

    return { upserted: 1 };
  },
});

// Backfill missing restricted flags on existing events
export const backfillRestricted = mutation({
  args: {},
  handler: async (ctx) => {
    const unpopulated = await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('restricted'), undefined))
      .take(500);

    let updated = 0;
    for (const event of unpopulated) {
      await ctx.db.patch(event._id, { restricted: true });
      updated++;
    }

    return { updated };
  },
});

// Deactivate Polymarket events so Kalshi is the primary active exchange
export const deactivatePolymarket = mutation({
  args: {},
  handler: async (ctx) => {
    const polymarketEvents = await ctx.db
      .query('events')
      .filter((q) =>
        q.or(
          q.eq(q.field('source'), 'Polymarket'),
          q.eq(q.field('source'), undefined)
        )
      )
      .take(1000);

    let deactivated = 0;
    for (const event of polymarketEvents) {
      if (event.active) {
        await ctx.db.patch(event._id, { active: false, source: 'Polymarket' });
        deactivated++;
      }
    }

    const polymarketScores = await ctx.db
      .query('scores_lite')
      .filter((q) =>
        q.or(
          q.eq(q.field('source'), 'Polymarket'),
          q.eq(q.field('source'), undefined)
        )
      )
      .take(1000);

    let scoresRemoved = 0;
    for (const score of polymarketScores) {
      await ctx.db.delete(score._id);
      scoresRemoved++;
    }

    return { deactivated, scoresRemoved };
  },
});

// Get active events sorted by volume
export const getActiveEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    const events = await ctx.db
      .query('events')
      .withIndex('by_active_volume', (q) => q.eq('active', true))
      .order('desc')
      .take(limit);

    return events;
  },
});

// Get active events for scoring - focused on Kalshi prediction markets
export const getEventsForScoring = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 200;

    const kalshiEvents = await ctx.db
      .query('events')
      .filter((q) => q.eq(q.field('source'), 'Kalshi'))
      .take(limit);

    return kalshiEvents;
  },
});

// Get events that need trade syncing
export const getEventsToSync = query({
  args: {
    priority: v.string(), // "hot", "warm", "cold"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get events sorted by volume
    const events = await ctx.db
      .query('events')
      .withIndex('by_active_volume', (q) => q.eq('active', true))
      .order('desc')
      .take(limit);

    // Get their markets and sync states
    const results = await Promise.all(
      events.map(async (event) => {
        const markets = await ctx.db
          .query('markets')
          .withIndex('by_event', (q) => q.eq('eventId', event.eventId))
          .collect();

        // Get sync state for each market
        const marketStates = await Promise.all(
          markets.map(async (market) => {
            const state = await ctx.db
              .query('marketSyncState')
              .withIndex('by_condition', (q) =>
                q.eq('conditionId', market.conditionId)
              )
              .first();

            return {
              market,
              lastSync: state?.lastTradeFetchMs || 0,
            };
          })
        );

        // Return event with its least recently synced market
        const oldestSync = Math.min(...marketStates.map((s) => s.lastSync));

        return {
          event,
          markets: marketStates,
          oldestSyncMs: oldestSync,
        };
      })
    );

    // Sort by oldest sync time and filter by priority
    return results
      .sort((a, b) => a.oldestSyncMs - b.oldestSyncMs)
      .slice(0, limit);
  },
});
