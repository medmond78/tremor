export type MarketVenue =
  | 'kalshi'
  | 'polymarket'
  | 'forecastex'
  | 'manifold'
  | 'metaculus';

export interface NormalizedMarket {
  conditionId: string;
  eventId: string;
  question: string;
  active: boolean;
  closed: boolean;
  lastTradePrice: number; // 0 to 1 scale
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  volume24hr: number;
  source: string;
}

export interface NormalizedEvent {
  eventId: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  image?: string;
  active: boolean;
  closed: boolean;
  restricted: boolean; // true if non-US / geoblocked
  source: string;
  url: string;
  volume24hr: number;
  volume?: number;
  liquidity?: number;
  markets: NormalizedMarket[];
}

export interface NormalizedCandlestick {
  conditionId: string;
  eventId: string;
  timestampMs: number;
  price01: number; // 0 to 1 scale
  volumeSince: number;
  volumeUsdSince?: number;
}

export interface PredictionMarketConnector {
  venue: MarketVenue;
  displayName: string;
  isUsAccessible: boolean;
  getTradeUrl(slugOrTicker: string): string;
  normalizeEvent(rawEvent: unknown): NormalizedEvent | null;
  normalizeCandlesticks(
    rawCandlesticks: unknown,
    conditionId: string,
    eventId: string,
    fallbackPrice?: number
  ): NormalizedCandlestick[];
}
