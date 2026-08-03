import area from '@turf/area';
import type { Position } from '../mow/models';

/**
 * Lawn area, in square feet, from an ordered ring of boundary vertices.
 *
 * Pure and side-effect free. This is the ONLY place area is computed; the
 * repository calls it on write and stores the result, and every reader uses the
 * stored value (never recomputes). Keeping the math in one tested function is
 * what lets that "compute on write, read the stored number" rule hold.
 */

/** 1 m² = 10.7639104167 ft² (exact, from 1 ft = 0.3048 m). */
const SQ_FT_PER_SQ_M = 10.7639104167;

/**
 * Compute the polygon area in square feet. The input is an OPEN ring (the
 * first vertex is not repeated at the end); we close it here for the GeoJSON
 * polygon Turf expects. Fewer than 3 vertices is not a polygon, so it has no
 * area — returns 0 rather than throwing, so callers can show a live preview
 * while the user is still placing points.
 */
export function computeAreaSqFt(boundary: Position[]): number {
  if (boundary.length < 3) return 0;
  const closedRing: Position[] = [...boundary, boundary[0]];
  const squareMeters = area({
    type: 'Polygon',
    coordinates: [closedRing],
  });
  return squareMeters * SQ_FT_PER_SQ_M;
}
