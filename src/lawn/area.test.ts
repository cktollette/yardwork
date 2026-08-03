import type { Position } from '../mow/models';
import { computeAreaSqFt } from './area';

/**
 * A ~30.48 m (100 ft) square placed near the equator, where a degree of
 * longitude is closest to a degree of latitude, so the true area is close to a
 * clean 100 ft × 100 ft = 10,000 ft². We assert with tolerance because the
 * earth-surface (geodesic) area Turf returns is never exactly the flat-plane
 * figure.
 */
const METERS_PER_DEG_LAT = 111_320;
const SIDE_M = 30.48; // 100 feet
const d = SIDE_M / METERS_PER_DEG_LAT; // side length in degrees near the equator

const SQUARE: Position[] = [
  [0, 0],
  [d, 0],
  [d, d],
  [0, d],
];

describe('computeAreaSqFt', () => {
  it('returns ~10,000 ft² for a 100ft square near the equator', () => {
    const sqft = computeAreaSqFt(SQUARE);
    expect(sqft).toBeGreaterThan(9_900);
    expect(sqft).toBeLessThan(10_100);
  });

  it('is independent of winding order (same area drawn clockwise)', () => {
    const reversed = [...SQUARE].reverse();
    expect(computeAreaSqFt(reversed)).toBeCloseTo(computeAreaSqFt(SQUARE), 5);
  });

  it('treats the ring as closed — repeating the first point changes nothing', () => {
    const explicitlyClosed: Position[] = [...SQUARE, SQUARE[0]];
    // The extra zero-length closing edge adds no area.
    expect(computeAreaSqFt(explicitlyClosed)).toBeCloseTo(
      computeAreaSqFt(SQUARE),
      5,
    );
  });

  it('returns 0 for fewer than 3 vertices (not a polygon)', () => {
    expect(computeAreaSqFt([])).toBe(0);
    expect(computeAreaSqFt([[0, 0]])).toBe(0);
    expect(computeAreaSqFt([[0, 0], [d, 0]])).toBe(0);
  });
});
