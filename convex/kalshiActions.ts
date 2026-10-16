import { action, internalAction, ActionCtx } from './_generated/server';
import { internal } from './_generated/api';

const KALSHI_API_BASE = 'https://api.elections.kalshi.com/trade-api/v2';

interface KalshiMarketRaw {
  ticker: string;
  event_ticker: string;
  title: string;
  status: string;
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  volume_24h_fp?: string;
  volume_fp?: string;
  open_interest_fp?: string;
}

interface KalshiEventRaw {
  event_ticker: string;
  series_ticker: string;
  title: string;
  sub_title?: string;
  category?: string;
  markets?: KalshiMarketRaw[];
}

interface KalshiCandlestickRaw {
  end_period_ts: number;
  volume_fp?: string;
  price?: {
    close_dollars?: string;
    previous_dollars?: string;
    open_dollars?: string;
    high_dollars?: string;
    low_dollars?: string;
  };
}

async function executeKalshiSync(
  ctx: ActionCtx
): Promise<{ events: number; markets: number; snapshots: number }> {
  try {
    console.log('[Kalshi] Fetching active events from Kalshi API...');
    const url = `${KALSHI_API_BASE}/events?status=open&with_nested_markets=true&limit=100`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(
        `Kalshi API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const events: KalshiEventRaw[] = data.events || [];
    console.log(`[Kalshi] Received ${events.length} events from Kalshi.`);

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

    for (const event of events) {
      if (!event.markets || event.markets.length === 0) continue;

      const eventTicker = event.event_ticker;
      const seriesTicker = event.series_ticker || eventTicker;
      const slug = seriesTicker.toLowerCase();
      const eventUrl = `https://kalshi.com/markets/${slug}`;

      let eventVolume24hr = 0;
      let eventTotalVolume = 0;

      const validMarkets = event.markets.map((m) => {
        const lastPrice = Number(m.last_price_dollars ?? 0);
        const vol24h = Number(m.volume_24h_fp ?? 0);
        const totalVol = Number(m.volume_fp ?? 0);

        eventVolume24hr += vol24h;
        eventTotalVolume += totalVol;

        return {
          conditionId: m.ticker,
          eventId: eventTicker,
          question: m.title || event.title,
          active: m.status === 'active',
          closed: m.status === 'closed' || m.status === 'settled',
          lastTradePrice: lastPrice,
          bestBid: m.yes_bid_dollars ? Number(m.yes_bid_dollars) : undefined,
          bestAsk: m.yes_ask_dollars ? Number(m.yes_ask_dollars) : undefined,
          volume24hr: vol24h,
          source: 'Kalshi',
        };
      });

      if (validMarkets.length === 0) continue;

      // Upsert event in Convex
      await ctx.runMutation(internal.events.upsertEvent, {
        event: {
          eventId: eventTicker,
          slug,
          title: event.title,
          description: event.sub_title,
          category: event.category,
          active: true,
          closed: false,
          restricted: false, // 100% legal & accessible for US users (CFTC-regulated)
          source: 'Kalshi',
          url: eventUrl,
          volume24hr: eventVolume24hr,
          volume: eventTotalVolume,
          liquidity: eventTotalVolume,
        },
      });
      totalSyncedEvents++;

      // Upsert markets in Convex
      await ctx.runMutation(internal.markets.upsertMarkets, {
        markets: validMarkets,
      });
      totalSyncedMarkets += validMarkets.length;

      // Track qualifying markets with activity for candlestick sync
      for (const m of validMarkets) {
        if (m.volume24hr > 0 || m.lastTradePrice > 0) {
          topMarketsForCandlesticks.push({
            ticker: m.conditionId,
            seriesTicker,
            eventId: eventTicker,
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
        const candleUrl = `${KALSHI_API_BASE}/series/${item.seriesTicker}/markets/${item.ticker}/candlesticks?start_ts=${sevenDaysAgoSec}&end_ts=${nowSec}&period_interval=60`;
        const candleRes = await fetch(candleUrl, {
          headers: { Accept: 'application/json' },
        });

        if (!candleRes.ok) continue;

        const candleJson = await candleRes.json();
        const candlesticks: KalshiCandlestickRaw[] =
          candleJson.candlesticks || [];

        const snapshots = candlesticks
          .map((c) => {
            const rawPrice =
              c.price?.close_dollars || c.price?.previous_dollars;
            const price01 = rawPrice ? Number(rawPrice) : item.lastPrice01;
            return {
              conditionId: item.ticker,
              eventId: item.eventId,
              timestampMs: c.end_period_ts * 1000,
              price01,
              volumeSince: Number(c.volume_fp ?? 0),
            };
          })
          .filter((s) => s.price01 > 0);

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
