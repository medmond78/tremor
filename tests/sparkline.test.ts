import { describe, it, expect } from 'vitest';
import { calculateSparklineGeometry } from '@/lib/sparkline';

describe('calculateSparklineGeometry', () => {
  it('generates valid geometry for upward probability jumps', () => {
    const geo = calculateSparklineGeometry(30, 65, 80, 24, 2);

    expect(geo.isPositive).toBe(true);
    expect(geo.delta).toBe(35);
    expect(geo.points).toHaveLength(4);
    expect(geo.linePath).toContain('M ');
    expect(geo.linePath).toContain('C ');
    expect(geo.areaPath).toContain('Z');

    // In SVG, higher percentage has smaller Y (near top)
    const pStart = geo.points[0];
    const pEnd = geo.points[3];
    expect(pEnd.y).toBeLessThan(pStart.y);
  });

  it('generates valid geometry for downward probability drops', () => {
    const geo = calculateSparklineGeometry(80, 25, 80, 24, 2);

    expect(geo.isPositive).toBe(false);
    expect(geo.delta).toBe(-55);
    expect(geo.points).toHaveLength(4);

    const pStart = geo.points[0];
    const pEnd = geo.points[3];
    expect(pEnd.y).toBeGreaterThan(pStart.y);
  });

  it('clamps values cleanly between 0 and 100', () => {
    const geoClamped = calculateSparklineGeometry(-20, 150, 100, 30, 0);
    expect(geoClamped.delta).toBe(100);
    expect(geoClamped.points[0].y).toBe(30); // 0% at bottom (height 30)
    expect(geoClamped.points[3].y).toBe(0); // 100% at top (height 0)
  });
});
