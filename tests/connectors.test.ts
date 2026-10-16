import { describe, it, expect } from 'vitest';
import {
  kalshiConnector,
  KalshiEventRaw,
  KalshiCandlestickRaw,
} from '@/lib/connectors';

describe('KalshiConnector', () => {
  it('has valid metadata and trade URL generation', () => {
    expect(kalshiConnector.venue).toBe('kalshi');
    expect(kalshiConnector.displayName).toBe('Kalshi');
    expect(kalshiConnector.isUsAccessible).toBe(true);
    expect(kalshiConnector.getTradeUrl('KXWORLDCUP38')).toBe(
      'https://kalshi.com/markets/kxworldcup38'
    );
  });

  it('normalizes a raw Kalshi event with nested markets', () => {
    const rawEvent: KalshiEventRaw = {
      event_ticker: 'KXWORLDCUP38',
      series_ticker: 'KXWORLDCUP38',
      title: 'FIFA 2038 World Cup Host',
      sub_title: 'Which country will host the 2038 World Cup?',
      category: 'Sports',
      markets: [
        {
          ticker: 'KXWORLDCUP38-USA',
          event_ticker: 'KXWORLDCUP38',
          title: 'United States',
          status: 'active',
          last_price_dollars: '0.45',
          yes_bid_dollars: '0.44',
          yes_ask_dollars: '0.46',
          volume_24h_fp: '12500.5',
          volume_fp: '85000',
        },
        {
          ticker: 'KXWORLDCUP38-CHN',
          event_ticker: 'KXWORLDCUP38',
          title: 'China',
          status: 'active',
          last_price_dollars: '0.12',
          volume_24h_fp: '3200',
          volume_fp: '15000',
        },
      ],
    };

    const normalized = kalshiConnector.normalizeEvent(rawEvent);

    expect(normalized).not.toBeNull();
    expect(normalized?.eventId).toBe('KXWORLDCUP38');
    expect(normalized?.slug).toBe('kxworldcup38');
    expect(normalized?.title).toBe('FIFA 2038 World Cup Host');
    expect(normalized?.restricted).toBe(false);
    expect(normalized?.source).toBe('Kalshi');
    expect(normalized?.url).toBe('https://kalshi.com/markets/kxworldcup38');
    expect(normalized?.volume24hr).toBe(15700.5);
    expect(normalized?.volume).toBe(100000);
    expect(normalized?.markets).toHaveLength(2);

    const m1 = normalized?.markets[0];
    expect(m1?.conditionId).toBe('KXWORLDCUP38-USA');
    expect(m1?.question).toBe('United States');
    expect(m1?.lastTradePrice).toBe(0.45);
    expect(m1?.bestBid).toBe(0.44);
    expect(m1?.bestAsk).toBe(0.46);
    expect(m1?.volume24hr).toBe(12500.5);
  });

  it('normalizes raw candlesticks and excludes invalid zero points', () => {
    const rawCandles: KalshiCandlestickRaw[] = [
      {
        end_period_ts: 1729000000,
        volume_fp: '120',
        price: {
          close_dollars: '0.42',
        },
      },
      {
        end_period_ts: 1729003600,
        volume_fp: '300',
        price: {
          previous_dollars: '0.45',
        },
      },
      {
        end_period_ts: 1729007200,
        volume_fp: '0',
        price: {
          close_dollars: '0',
        },
      },
    ];

    const snapshots = kalshiConnector.normalizeCandlesticks(
      rawCandles,
      'MKT-1',
      'EVT-1'
    );

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toEqual({
      conditionId: 'MKT-1',
      eventId: 'EVT-1',
      timestampMs: 1729000000000,
      price01: 0.42,
      volumeSince: 120,
    });
    expect(snapshots[1]).toEqual({
      conditionId: 'MKT-1',
      eventId: 'EVT-1',
      timestampMs: 1729003600000,
      price01: 0.45,
      volumeSince: 300,
    });
  });

  it('handles null and malformed event payloads safely', () => {
    expect(kalshiConnector.normalizeEvent(null)).toBeNull();
    expect(kalshiConnector.normalizeEvent(undefined)).toBeNull();
    expect(kalshiConnector.normalizeEvent({})).toBeNull();
    expect(kalshiConnector.normalizeEvent({ event_ticker: 'FOO' })).toBeNull();
    expect(kalshiConnector.normalizeCandlesticks(null, 'M', 'E')).toEqual([]);
  });
});
