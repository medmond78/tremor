export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineGeometry {
  points: SparklinePoint[];
  linePath: string;
  areaPath: string;
  isPositive: boolean;
  delta: number;
  minY: number;
  maxY: number;
}

/**
 * Calculates deterministic SVG paths for probability trajectories and jumps
 */
export function calculateSparklineGeometry(
  fromPercent: number,
  toPercent: number,
  width: number = 80,
  height: number = 24,
  padding: number = 2
): SparklineGeometry {
  const from = Math.max(0, Math.min(100, fromPercent));
  const to = Math.max(0, Math.min(100, toPercent));
  const delta = to - from;
  const isPositive = delta >= 0;

  // Normalize Y: 100% is near top (padding), 0% is near bottom (height - padding)
  const usableHeight = height - padding * 2;
  const scaleY = (p: number) => height - padding - (p / 100) * usableHeight;

  // We generate a smooth 4-point trajectory reflecting the seismo movement
  // P0 (start), P1 (inflection start), P2 (inflection shock), P3 (final destination)
  const p0: SparklinePoint = { x: padding, y: scaleY(from) };
  const p1: SparklinePoint = {
    x: padding + (width - padding * 2) * 0.35,
    y: scaleY(from + delta * 0.1),
  };
  const p2: SparklinePoint = {
    x: padding + (width - padding * 2) * 0.65,
    y: scaleY(from + delta * 0.85),
  };
  const p3: SparklinePoint = {
    x: width - padding,
    y: scaleY(to),
  };

  const points = [p0, p1, p2, p3];

  // Build cubic Bezier line path: M p0 C p1_ctrl p2_ctrl p3
  const linePath = `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}, ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;

  // Build closed area path for bottom gradient fill
  const bottomY = height - padding;
  const areaPath = `${linePath} L ${p3.x.toFixed(1)} ${bottomY.toFixed(1)} L ${p0.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;

  return {
    points,
    linePath,
    areaPath,
    isPositive,
    delta,
    minY: Math.min(p0.y, p3.y),
    maxY: Math.max(p0.y, p3.y),
  };
}
