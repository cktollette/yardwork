import type { Position } from '../mow/models';

/**
 * Vertex-average centroid of a boundary ring — a plain mean of the `[lng, lat]`
 * vertices, returned as a `[lng, lat]` Position (matching pickCameraCenter's
 * axis order). Not an area-weighted centroid: for picking a single weather point
 * inside a lawn, the average vertex is close enough and needs no geometry lib.
 *
 * Returns `null` for an empty ring. A single vertex returns that vertex.
 */
export function polygonCentroid(boundary: Position[]): Position | null {
  if (boundary.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of boundary) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / boundary.length, sumLat / boundary.length];
}
