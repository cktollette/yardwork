import { polygonCentroid } from './centroid';
import type { Position } from '../mow/models';

describe('polygonCentroid', () => {
  it('averages the vertices of a simple square', () => {
    const square: Position[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(polygonCentroid(square)).toEqual([1, 1]);
  });

  it('returns a single vertex unchanged (degenerate ring)', () => {
    expect(polygonCentroid([[-96.8236, 33.1507]])).toEqual([-96.8236, 33.1507]);
  });

  it('returns null for an empty ring', () => {
    expect(polygonCentroid([])).toBeNull();
  });
});
