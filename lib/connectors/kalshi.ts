import {
  PredictionMarketConnector,
  NormalizedEvent,
  NormalizedMarket,
  NormalizedCandlestick,
} from './types';

export interface KalshiMarketRaw {
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

export interface KalshiEventRaw {
  event_ticker: string;
  series_ticker: string;
  title: string;
  sub_title?: string;
  category?: string;
  markets?: KalshiMarketRaw[];
}

export interface KalshiCandlestickRaw {
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

export class KalshiConnector implements PredictionMarketConnector {
  readonly venue = 'kalshi' as const;
  readonly displayName = 'Kalshi';
  readonly isUsAccessible = true;
  readonly baseUrl = 'https://kalshi.com';
  readonly apiBaseUrl = 'https://api.elections.kalshi.com/trade-api/v2';

  getTradeUrl(slugOrTicker: string): string {
    const clean = slugOrTicker.toLowerCase().trim();
    return `${this.baseUrl}/markets/${clean}`;
  }

  normalizeMarket(
    raw: KalshiMarketRaw,
    eventTicker: string,
    fallbackTitle?: string
  ): NormalizedMarket {
    const lastPrice = raw.last_price_dollars
      ? Number(raw.last_price_dollars)
      : 0;
    const vol24h = raw.volume_24h_fp ? Number(raw.volume_24h_fp) : 0;

    return {
      conditionId: raw.ticker,
      eventId: eventTicker,
      question: raw.title || fallbackTitle || raw.ticker,
      active: raw.status === 'active',
      closed: raw.status === 'closed' || raw.status === 'settled',
      lastTradePrice: Number.isFinite(lastPrice)
        ? Math.max(0, Math.min(1, lastPrice))
        : 0,
      bestBid:
        raw.yes_bid_dollars && Number.isFinite(Number(raw.yes_bid_dollars))
          ? Number(raw.yes_bid_dollars)
          : undefined,
      bestAsk:
        raw.yes_ask_dollars && Number.isFinite(Number(raw.yes_ask_dollars))
          ? Number(raw.yes_ask_dollars)
          : undefined,
      volume24hr: Number.isFinite(vol24h) ? vol24h : 0,
      source: 'Kalshi',
    };
  }

  normalizeEvent(rawEvent: unknown): NormalizedEvent | null {
    if (!rawEvent || typeof rawEvent !== 'object') return null;

    const event = rawEvent as KalshiEventRaw;
    if (!event.event_ticker || !event.title) return null;

    const eventTicker = event.event_ticker;
    const seriesTicker = event.series_ticker || eventTicker;
    const slug = seriesTicker.toLowerCase();
    const eventUrl = this.getTradeUrl(slug);

    const rawMarkets = Array.isArray(event.markets) ? event.markets : [];
    let eventVolume24hr = 0;
    let eventTotalVolume = 0;

    const markets: NormalizedMarket[] = rawMarkets.map((m) => {
      const vol24h = Number(m.volume_24h_fp ?? 0);
      const totalVol = Number(m.volume_fp ?? 0);
      if (Number.isFinite(vol24h)) eventVolume24hr += vol24h;
      if (Number.isFinite(totalVol)) eventTotalVolume += totalVol;

      return this.normalizeMarket(m, eventTicker, event.title);
    });

    return {
      eventId: eventTicker,
      slug,
      title: event.title,
      description: event.sub_title,
      category: event.category,
      active: true,
      closed: false,
      restricted: false, // 100% legal & CFTC-regulated in the US
      source: 'Kalshi',
      url: eventUrl,
      volume24hr: eventVolume24hr,
      volume: eventTotalVolume,
      liquidity: eventTotalVolume,
      markets,
    };
  }

  normalizeCandlesticks(
    rawCandlesticks: unknown,
    conditionId: string,
    eventId: string,
    fallbackPrice: number = 0
  ): NormalizedCandlestick[] {
    if (!Array.isArray(rawCandlesticks)) return [];

    return (rawCandlesticks as KalshiCandlestickRaw[])
      .map((c) => {
        const rawPrice = c.price?.close_dollars || c.price?.previous_dollars;
        const price01 =
          rawPrice && Number.isFinite(Number(rawPrice))
            ? Number(rawPrice)
            : fallbackPrice;

        return {
          conditionId,
          eventId,
          timestampMs: (c.end_period_ts || 0) * 1000,
          price01: Math.max(0, Math.min(1, price01)),
          volumeSince: Number(c.volume_fp ?? 0) || 0,
        };
      })
      .filter((s) => s.price01 > 0 && s.timestampMs > 0);
  }
}

export const kalshiConnector = new KalshiConnector();
