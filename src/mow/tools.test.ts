import type { EquipmentType } from '../equipment/models';
import { mostRecentToolTypes, normalizeToolTypes } from './tools';

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
