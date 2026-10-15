import { describe, it, expect } from 'vitest';
import {
  calculateBaseScore,
  calculateVolumeMultiplier,
  calculateSeismoScore,
  calculateVolatility,
} from '../lib/scoring';

describe('calculateBaseScore', () => {
  it('returns 0 for zero or non-positive changes', () => {
    expect(calculateBaseScore(0)).toBe(0);
    expect(calculateBaseScore(-5)).toBe(0);
    expect(calculateBaseScore(NaN)).toBe(0);
    expect(calculateBaseScore(Infinity)).toBe(0);
  });

  it('calculates linear scores for micro movements (< 1pp)', () => {
    expect(calculateBaseScore(0.2)).toBeCloseTo(0.2, 5);
    expect(calculateBaseScore(0.5)).toBeCloseTo(0.5, 5);
    expect(calculateBaseScore(0.8)).toBeCloseTo(0.8, 5);
  });

  it('accelerates scores for small-to-medium movements (1pp to 5pp)', () => {
    expect(calculateBaseScore(1.0)).toBeCloseTo(1.0, 5);
    expect(calculateBaseScore(3.0)).toBeCloseTo(2.75, 5);
    expect(calculateBaseScore(5.0)).toBeCloseTo(4.5, 5);
  });

  it('scales medium-to-large movements (5pp to 10pp)', () => {
    expect(calculateBaseScore(7.5)).toBeCloseTo(5.75, 5);
    expect(calculateBaseScore(10.0)).toBeCloseTo(7.0, 5);
  });

  it('scales high-intensity movements (10pp to 20pp)', () => {
    expect(calculateBaseScore(15.0)).toBeCloseTo(8.5, 5);
    expect(calculateBaseScore(20.0)).toBeCloseTo(10.0, 5);
  });

  it('caps base score at 10.0 for extreme movements (> 20pp)', () => {
    expect(calculateBaseScore(25.0)).toBe(10.0);
    expect(calculateBaseScore(80.0)).toBe(10.0);
  });
});

describe('calculateVolumeMultiplier', () => {
  it('returns 0 for volume below minimum threshold ($250)', () => {
    expect(calculateVolumeMultiplier(0)).toBe(0);
    expect(calculateVolumeMultiplier(-100)).toBe(0);
    expect(calculateVolumeMultiplier(50)).toBe(0);
    expect(calculateVolumeMultiplier(249.99)).toBe(0);
    expect(calculateVolumeMultiplier(NaN)).toBe(0);
  });

  it('returns 1.0 for volume meeting or exceeding full confidence threshold ($5,000)', () => {
    expect(calculateVolumeMultiplier(5000)).toBe(1.0);
    expect(calculateVolumeMultiplier(25000)).toBe(1.0);
    expect(calculateVolumeMultiplier(1000000)).toBe(1.0);
  });

  it('scales smoothly between $250 and $5,000 with concave ramp', () => {
    // At midpoint $2,625: (2625 - 250)/(5000 - 250) = 2375/4750 = 0.5; sqrt(0.5) ~= 0.7071
    const midMultiplier = calculateVolumeMultiplier(2625);
    expect(midMultiplier).toBeCloseTo(Math.SQRT1_2, 3);
    expect(midMultiplier).toBeGreaterThan(0.5); // Concave curve gives higher weight early
  });
});

describe('calculateSeismoScore', () => {
  it('prevents illiquid wash trading from triggering false tremors', () => {
    // 50pp movement on a market with only $20 volume should score 0.0
    const spoofScore = calculateSeismoScore(50, 20);
    expect(spoofScore).toBe(0.0);
  });

  it('rewards significant price change backed by substantial volume', () => {
    // 15pp movement with $10,000 volume: base = 8.5, volMult = 1.0 -> 8.5
    const genuineTremor = calculateSeismoScore(15, 10000);
    expect(genuineTremor).toBe(8.5);
  });

  it('clamps final score to [0.0, 10.0] range', () => {
    expect(calculateSeismoScore(-10, -500)).toBe(0.0);
    expect(calculateSeismoScore(99, 500000)).toBe(10.0);
  });
});

describe('calculateVolatility', () => {
  it('returns 0 when there are fewer than 2 snapshots', () => {
    expect(calculateVolatility([])).toBe(0);
    expect(calculateVolatility([{ price01: 0.5 }])).toBe(0);
  });

  it('returns 0 for stable prices', () => {
    const stable = [
      { price01: 0.5 },
      { price01: 0.5 },
      { price01: 0.5 },
      { price01: 0.5 },
    ];
    expect(calculateVolatility(stable)).toBe(0);
  });

  it('calculates standard deviation of returns for moving prices', () => {
    const volatile = [
      { price01: 0.5 },
      { price01: 0.6 }, // +20%
      { price01: 0.45 }, // -25%
      { price01: 0.55 }, // +22.2%
    ];
    const vol = calculateVolatility(volatile);
    expect(vol).toBeGreaterThan(0);
    expect(Number.isFinite(vol)).toBe(true);
  });

  it('safely handles zero prices and missing returns', () => {
    const withZeros = [{ price01: 0 }, { price01: 0 }, { price01: 0 }];
    expect(calculateVolatility(withZeros)).toBe(0);
  });
});
