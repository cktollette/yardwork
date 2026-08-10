import type { Equipment } from '../equipment/models';
import {
  mostRecentEquipmentIds,
  mowToolTypes,
  normalizeEquipmentIds,
  resolveMowTools,
  seedToolSelection,
} from './tools';

/** Build a piece of equipment with sensible defaults; override per-test. */
function eq(id: string, overrides: Partial<Equipment> = {}): Equipment {
  return {
    id,
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    catalogId: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

const GARAGE: Equipment[] = [
  eq('mower-1', { type: 'mower', nickname: 'Big Green' }),
  eq('trimmer-1', { type: 'trimmer', brand: 'Stihl', model: 'FS 56' }),
  eq('blower-1', { type: 'blower', brand: 'Echo', model: 'PB-580' }),
];

describe('resolveMowTools', () => {
  it('resolves ids to equipment, preserving order', () => {
    const r = resolveMowTools(['blower-1', 'mower-1'], GARAGE);
    expect(r.equipment.map((e) => e.id)).toEqual(['blower-1', 'mower-1']);
    expect(r.missingCount).toBe(0);
  });

  it('omits dangling ids and reports the missing count', () => {
    const r = resolveMowTools(['mower-1', 'ghost', 'trimmer-1'], GARAGE);
    expect(r.equipment.map((e) => e.id)).toEqual(['mower-1', 'trimmer-1']);
    expect(r.missingCount).toBe(1);
  });

  it('handles all-dangling ids against an empty garage without crashing', () => {
    const r = resolveMowTools(['ghost-1', 'ghost-2'], []);
    expect(r.equipment).toEqual([]);
    expect(r.missingCount).toBe(2);
  });

  it('returns empty for undefined or empty ids', () => {
    expect(resolveMowTools(undefined, GARAGE)).toEqual({ equipment: [], missingCount: 0 });
    expect(resolveMowTools([], GARAGE)).toEqual({ equipment: [], missingCount: 0 });
  });
});

describe('mowToolTypes', () => {
  it('returns distinct types in canonical order', () => {
    // Ids given blower-first, but canonical order is mower, trimmer, edger, blower.
    const types = mowToolTypes(['blower-1', 'mower-1', 'trimmer-1'], GARAGE);
    expect(types).toEqual(['mower', 'trimmer', 'blower']);
  });

  it('dedupes when two tools share a type', () => {
    const garage = [...GARAGE, eq('mower-2', { type: 'mower' })];
    expect(mowToolTypes(['mower-1', 'mower-2'], garage)).toEqual(['mower']);
  });

  it('omits dangling ids from the type list', () => {
    expect(mowToolTypes(['mower-1', 'ghost'], GARAGE)).toEqual(['mower']);
    expect(mowToolTypes(['ghost'], GARAGE)).toEqual([]);
  });
});

describe('mostRecentEquipmentIds', () => {
  it('returns undefined when no mow used tools', () => {
    expect(mostRecentEquipmentIds([{}, { equipmentIds: [] }])).toBeUndefined();
  });

  it('returns the first non-empty equipmentIds in a newest-first list', () => {
    expect(
      mostRecentEquipmentIds([
        { equipmentIds: ['a'] },
        { equipmentIds: ['b', 'c'] },
      ]),
    ).toEqual(['a']);
  });

  it('skips recent tool-less mows to find the last one that used tools', () => {
    expect(
      mostRecentEquipmentIds([{}, { equipmentIds: [] }, { equipmentIds: ['x'] }]),
    ).toEqual(['x']);
  });
});

describe('seedToolSelection', () => {
  it('seeds from the most recent mow, filtered to still-existing garage', () => {
    // Recent mow used mower-1 and a since-deleted "old-edger".
    const mows = [{ equipmentIds: ['mower-1', 'old-edger'] }];
    expect(seedToolSelection(mows, GARAGE)).toEqual(['mower-1']);
  });

  it('returns empty when the recent tools are all gone', () => {
    expect(seedToolSelection([{ equipmentIds: ['gone'] }], GARAGE)).toEqual([]);
  });

  it('returns empty when no mow used tools', () => {
    expect(seedToolSelection([{}], GARAGE)).toEqual([]);
  });
});

describe('normalizeEquipmentIds', () => {
  it('dedupes and drops blanks', () => {
    expect(normalizeEquipmentIds(['a', 'a', ' ', 'b'])).toEqual(['a', 'b']);
  });

  it('treats an empty result as undefined', () => {
    expect(normalizeEquipmentIds([])).toBeUndefined();
    expect(normalizeEquipmentIds(['  '])).toBeUndefined();
    expect(normalizeEquipmentIds(undefined)).toBeUndefined();
  });
});
