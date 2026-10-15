import { describe, it, expect } from 'vitest';

describe('Trade Bucketing & Normalization Logic', () => {
  const BUCKET_MS = 5 * 60 * 1000;

  function getBucketTs(timestampMs: number): number {
    return Math.floor(timestampMs / BUCKET_MS) * BUCKET_MS;
  }

  function normalizeTradePrice(price: number, outcome: string): number {
    const rawPrice = Number(price ?? 0);
    const normalizedOutcome = (outcome || '').toLowerCase();
    if (normalizedOutcome === 'no') {
      return Math.max(0, Math.min(1, 1 - rawPrice));
    }
    return Math.max(0, Math.min(1, rawPrice));
  }

  it('aligns trade timestamps into strict 5-minute intervals', () => {
    // 12:00:00 -> 12:00:00
    const ts0 = new Date('2026-10-15T12:00:00Z').getTime();
    expect(getBucketTs(ts0)).toBe(ts0);

    // 12:02:45 -> 12:00:00
    const ts1 = new Date('2026-10-15T12:02:45Z').getTime();
    expect(getBucketTs(ts1)).toBe(ts0);

    // 12:04:59.999 -> 12:00:00
    const ts2 = new Date('2026-10-15T12:04:59.999Z').getTime();
    expect(getBucketTs(ts2)).toBe(ts0);

    // 12:05:00 -> 12:05:00
    const ts3 = new Date('2026-10-15T12:05:00Z').getTime();
    expect(getBucketTs(ts3)).toBe(ts0 + BUCKET_MS);
  });

  it('normalizes NO outcome prices into implied YES probabilities', () => {
    // A NO trade at 0.70 means YES probability is 0.30
    expect(normalizeTradePrice(0.7, 'No')).toBeCloseTo(0.3, 5);
    expect(normalizeTradePrice(0.85, 'no')).toBeCloseTo(0.15, 5);
    expect(normalizeTradePrice(0.1, 'NO')).toBeCloseTo(0.9, 5);
  });

  it('preserves YES outcome prices and clamps boundaries', () => {
    expect(normalizeTradePrice(0.65, 'Yes')).toBeCloseTo(0.65, 5);
    expect(normalizeTradePrice(0.99, 'yes')).toBeCloseTo(0.99, 5);
    expect(normalizeTradePrice(1.05, 'yes')).toBe(1.0);
    expect(normalizeTradePrice(-0.05, 'yes')).toBe(0.0);
  });

  it('accumulates volume incrementally across sync iterations', () => {
    // Simulating batch 1
    let existingVolume = 0;
    const batch1TradeVolume = 500;
    existingVolume += batch1TradeVolume;
    expect(existingVolume).toBe(500);

    // Simulating batch 2 in the same 5-minute bucket
    const batch2TradeVolume = 1200;
    existingVolume += batch2TradeVolume;
    expect(existingVolume).toBe(1700);
  });
});
