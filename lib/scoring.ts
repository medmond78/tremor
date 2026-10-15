/**
 * Tremor Scoring Engine
 * Pure mathematical functions for calculating tremor intensity scores,
 * volume multipliers, and price volatility.
 */

/**
 * Calculates the non-linear base score from absolute percentage point change.
 *
 * Curve specifications:
 * - 0% - 1% change: linear (0.0 to 1.0)
 * - 1% - 5% change: steep acceleration (1.0 to 4.5)
 * - 5% - 10% change: moderate acceleration (4.5 to 7.0)
 * - 10% - 20% change: high intensity (7.0 to 10.0)
 * - > 20% change: capped at 10.0
 *
 * @param absChange Absolute price change in percentage points (e.g. 5.5 for 5.5pp)
 * @returns Base score between 0.0 and 10.0
 */
export function calculateBaseScore(absChange: number): number {
  if (!Number.isFinite(absChange) || absChange <= 0) {
    return 0;
  }
  if (absChange < 1) {
    return absChange; // Linear: 0.5pp -> 0.5
  }
  if (absChange < 5) {
    return 1 + (absChange - 1) * 0.875; // 5pp -> 4.5
  }
  if (absChange < 10) {
    return 4.5 + (absChange - 5) * 0.5; // 10pp -> 7.0
  }
  if (absChange < 20) {
    return 7 + (absChange - 10) * 0.3; // 20pp -> 10.0
  }
  return 10.0;
}

/**
 * Calculates the volume confidence multiplier based on USD-equivalent market volume.
 *
 * Requirements:
 * - < $250: multiplier = 0 (prevents wash trading and illiquid spikes)
 * - >= $5,000: multiplier = 1.0 (full confidence)
 * - $250 - $5,000: smooth concave ramp sqrt((vol - min) / (max - min))
 *
 * @param marketUsdVol Volume traded in estimated USD
 * @returns Multiplier between 0.0 and 1.0
 */
export function calculateVolumeMultiplier(marketUsdVol: number): number {
  if (!Number.isFinite(marketUsdVol) || marketUsdVol <= 0) {
    return 0;
  }
  const minVol = 250;
  const fullVol = 5000;

  if (marketUsdVol < minVol) return 0;
  if (marketUsdVol >= fullVol) return 1.0;

  return Math.sqrt((marketUsdVol - minVol) / (fullVol - minVol));
}

/**
 * Calculates the combined Seismo intensity score for a single market.
 *
 * @param absChange Absolute percentage point price change (e.g., 8.0 for 8pp)
 * @param marketUsdVol Volume traded in USD in the given window
 * @returns Intensity score rounded to 1 decimal place between 0.0 and 10.0
 */
export function calculateSeismoScore(
  absChange: number,
  marketUsdVol: number
): number {
  const base = calculateBaseScore(absChange);
  const volMult = calculateVolumeMultiplier(marketUsdVol);
  const rawScore = base * volMult;
  return Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10));
}

/**
 * Calculates price volatility as standard deviation of returns across price snapshots.
 *
 * @param snapshots Array of snapshot items with price01 in range [0, 1]
 * @returns Volatility (std dev of returns), or 0 if fewer than 2 valid points
 */
export function calculateVolatility(
  snapshots: Array<{ price01: number }>
): number {
  if (!snapshots || snapshots.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prevPrice = snapshots[i - 1].price01;
    const currPrice = snapshots[i].price01;
    if (
      prevPrice > 0 &&
      Number.isFinite(prevPrice) &&
      Number.isFinite(currPrice)
    ) {
      returns.push((currPrice - prevPrice) / prevPrice);
    }
  }

  if (returns.length === 0) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

  return Math.sqrt(variance);
}
