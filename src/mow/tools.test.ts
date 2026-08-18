import type { EquipmentType } from '../equipment/models';
import { mostRecentToolTypes, normalizeToolTypes, rankToolUsage } from './tools';

describe('normalizeToolTypes', () => {
  it('dedupes and forces canonical order', () => {
    // Given out of order with a duplicate, comes back mower, trimmer, blower.
    expect(normalizeToolTypes(['blower', 'mower', 'trimmer', 'mower'])).toEqual([
      'mower',
      'trimmer',
      'blower',
    ]);
  });

  it('drops values that are not known types', () => {
    expect(
      normalizeToolTypes(['mower', 'jetpack' as EquipmentType, 'edger']),
    ).toEqual(['mower', 'edger']);
  });

  it('treats an empty result as undefined', () => {
    expect(normalizeToolTypes([])).toBeUndefined();
    expect(normalizeToolTypes(['nope' as EquipmentType])).toBeUndefined();
    expect(normalizeToolTypes(undefined)).toBeUndefined();
  });
});

describe('mostRecentToolTypes (seed from last mow)', () => {
  it('returns undefined when no mow recorded tools', () => {
    expect(mostRecentToolTypes([{}, { toolTypes: [] }])).toBeUndefined();
  });

  it('returns the first non-empty toolTypes in a newest-first list', () => {
    expect(
      mostRecentToolTypes([{ toolTypes: ['mower'] }, { toolTypes: ['trimmer', 'edger'] }]),
    ).toEqual(['mower']);
  });

  it('skips recent tool-less mows to find the last one that recorded tools', () => {
    expect(
      mostRecentToolTypes([{}, { toolTypes: [] }, { toolTypes: ['blower'] }]),
    ).toEqual(['blower']);
  });
});

describe('rankToolUsage (most-used tool ranking)', () => {
  const m = (toolTypes?: EquipmentType[]) => ({ toolTypes });

  it('returns [] for zero mows', () => {
    expect(rankToolUsage([])).toEqual([]);
  });

  it('returns [] when every mow has absent or empty toolTypes', () => {
    expect(rankToolUsage([m(), m([]), m(undefined)])).toEqual([]);
  });

  it('ranks by mow count, most-used first', () => {
    // trimmer on 3 mows, mower on 1.
    const mows = [m(['mower', 'trimmer']), m(['trimmer']), m(['trimmer'])];
    expect(rankToolUsage(mows)).toEqual([
      { type: 'trimmer', count: 3 },
      { type: 'mower', count: 1 },
    ]);
  });

  it('breaks ties by canonical EQUIPMENT_TYPES order (mower before edger)', () => {
    // mower and edger both appear on 2 mows; mower wins the tie (earlier in order).
    const mows = [m(['mower', 'edger']), m(['mower', 'edger'])];
    expect(rankToolUsage(mows)).toEqual([
      { type: 'mower', count: 2 },
      { type: 'edger', count: 2 },
    ]);
  });

  it('when every mow has every tool, all tie and canonical order decides', () => {
    const every: EquipmentType[] = ['mower', 'trimmer', 'edger', 'blower'];
    const mows = [m(every), m(every), m(every)];
    expect(rankToolUsage(mows)).toEqual([
      { type: 'mower', count: 3 },
      { type: 'trimmer', count: 3 },
      { type: 'edger', count: 3 },
      { type: 'blower', count: 3 },
    ]);
  });

  it('counts only tagged mows, ignoring tool-less ones', () => {
    const mows = [m(['blower']), m(), m(['blower']), m([]), m(['edger'])];
    expect(rankToolUsage(mows)).toEqual([
      { type: 'blower', count: 2 },
      { type: 'edger', count: 1 },
    ]);
  });

  it('drops unknown values that survived into toolTypes (defensive)', () => {
    const mows = [m(['mower', 'jetpack' as EquipmentType]), m(['mower'])];
    expect(rankToolUsage(mows)).toEqual([{ type: 'mower', count: 2 }]);
  });
});
