import { action, internalAction, ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import { kalshiConnector } from '../lib/connectors/kalshi';

async function executeKalshiSync(
  ctx: ActionCtx
): Promise<{ events: number; markets: number; snapshots: number }> {
  try {
    console.log('[Kalshi] Fetching active events from Kalshi API...');
    const url = `${kalshiConnector.apiBaseUrl}/events?status=open&with_nested_markets=true&limit=100`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Kalshi API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const rawEvents = data.events || [];
    console.log(`[Kalshi] Received ${rawEvents.length} events from Kalshi.`);

    let totalSyncedEvents = 0;
    let totalSyncedMarkets = 0;
    const now = Date.now();

    // Collect top markets to backfill price snapshots
    const topMarketsForCandlesticks: Array<{
      ticker: string;
      seriesTicker: string;
      eventId: string;
      lastPrice01: number;
      volume24hr: number;
    }> = [];

    for (const rawEvent of rawEvents) {
      const normalized = kalshiConnector.normalizeEvent(rawEvent);
      if (!normalized || normalized.markets.length === 0) continue;

      // Upsert event in Convex
      await ctx.runMutation(internal.events.upsertEvent, {
        event: {
          eventId: normalized.eventId,
          slug: normalized.slug,
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          active: normalized.active,
          closed: normalized.closed,
          restricted: normalized.restricted,
          source: normalized.source,
          url: normalized.url,
          volume24hr: normalized.volume24hr,
          volume: normalized.volume,
          liquidity: normalized.liquidity,
        },
      });
      totalSyncedEvents++;

      // Upsert markets in Convex
      await ctx.runMutation(internal.markets.upsertMarkets, {
        markets: normalized.markets,
      });
      totalSyncedMarkets += normalized.markets.length;

      // Track qualifying markets with activity for candlestick sync
      const seriesTicker = rawEvent.series_ticker || normalized.eventId;
      for (const m of normalized.markets) {
        if (m.volume24hr > 0 || m.lastTradePrice > 0) {
          topMarketsForCandlesticks.push({
            ticker: m.conditionId,
            seriesTicker,
            eventId: normalized.eventId,
            lastPrice01: m.lastTradePrice,
            volume24hr: m.volume24hr,
          });
        }
      }
    }

    console.log(
      `[Kalshi] Successfully synced ${totalSyncedEvents} events and ${totalSyncedMarkets} markets.`
    );

    // Sort candidate markets by volume and fetch candlesticks for top 50
    topMarketsForCandlesticks.sort((a, b) => b.volume24hr - a.volume24hr);
    const candidates = topMarketsForCandlesticks.slice(0, 50);

    const sevenDaysAgoSec = Math.floor((now - 7 * 24 * 60 * 60 * 1000) / 1000);
    const nowSec = Math.floor(now / 1000);

    let snapshotsCount = 0;
    for (const item of candidates) {
      try {
        const candleUrl = `${kalshiConnector.apiBaseUrl}/series/${item.seriesTicker}/markets/${item.ticker}/candlesticks?start_ts=${sevenDaysAgoSec}&end_ts=${nowSec}&period_interval=60`;
        const candleRes = await fetch(candleUrl, {
          headers: { Accept: 'application/json' },
        });

        if (!candleRes.ok) continue;

        const candleJson = await candleRes.json();
        const snapshots = kalshiConnector.normalizeCandlesticks(
          candleJson.candlesticks,
          item.ticker,
          item.eventId,
          item.lastPrice01
        );

        // Always ensure current price snapshot is present
        snapshots.push({
          conditionId: item.ticker,
          eventId: item.eventId,
          timestampMs: now,
          price01: item.lastPrice01,
          volumeSince: item.volume24hr,
        });

        if (snapshots.length > 0) {
          await ctx.runMutation(internal.trades.insertBatchSnapshots, {
            snapshots,
          });
          snapshotsCount += snapshots.length;
        }
      } catch (err) {
        console.warn(
          `[Kalshi] Candlestick fetch failed for ${item.ticker}:`,
          err
        );
      }
    }

    console.log(
      `[Kalshi] Backfilled ${snapshotsCount} price snapshots across active markets.`
    );

    return {
      events: totalSyncedEvents,
      markets: totalSyncedMarkets,
      snapshots: snapshotsCount,
    };
  } catch (error) {
    console.error('[Kalshi] Sync failed:', error);
    throw error;
  }
}

/**
 * Internal action invoked by cron schedules
 */
export const syncKalshiEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    return await executeKalshiSync(ctx);
  },
});

/**
 * Public action to trigger Kalshi sync manually or via CLI / UI
 */
export const triggerKalshiSync = action({
  args: {},
  handler: async (ctx) => {
    return await executeKalshiSync(ctx);
  },
});
