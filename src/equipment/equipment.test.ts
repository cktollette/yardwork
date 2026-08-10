import { applyEquipmentEdit, displayName, normalizeEquipment } from './equipment';
import type { Equipment } from './models';

/** A persisted mower with sensible defaults; override per-test. */
function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1',
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    driveType: 'self_propelled',
    catalogId: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('displayName', () => {
  it('uses the nickname when set', () => {
    expect(displayName(makeEquipment({ nickname: 'Old Reliable' }))).toBe('Old Reliable');
  });

  it('falls back to "brand model" when there is no nickname', () => {
    expect(displayName(makeEquipment({ nickname: undefined }))).toBe('Toro Recycler 22');
  });

  it('treats a whitespace-only nickname as unset', () => {
    expect(displayName(makeEquipment({ nickname: '   ' }))).toBe('Toro Recycler 22');
  });

  it('trims a nickname that has surrounding whitespace', () => {
    expect(displayName(makeEquipment({ nickname: '  Beast  ' }))).toBe('Beast');
  });
});

describe('normalizeEquipment', () => {
  it('trims brand and model', () => {
    const n = normalizeEquipment(makeEquipment({ brand: '  Honda ', model: ' HRX217 ' }));
    expect(n.brand).toBe('Honda');
    expect(n.model).toBe('HRX217');
  });

  it('drops a blank nickname', () => {
    const n = normalizeEquipment(makeEquipment({ nickname: '   ' }));
    expect('nickname' in n).toBe(false);
  });

  it('drops driveType when the type is not a mower', () => {
    const n = normalizeEquipment(
      makeEquipment({ type: 'trimmer', driveType: 'self_propelled' }),
    );
    expect('driveType' in n).toBe(false);
  });

  it('keeps driveType on a mower', () => {
    const n = normalizeEquipment(makeEquipment({ type: 'mower', driveType: 'push' }));
    expect(n.driveType).toBe('push');
  });

  it('does not mutate the input', () => {
    const e = makeEquipment({ type: 'blower', driveType: 'push' });
    const snapshot: Equipment = { ...e };
    normalizeEquipment(e);
    expect(e).toEqual(snapshot);
  });
});

describe('applyEquipmentEdit', () => {
  it('applies changed fields', () => {
    const edited = applyEquipmentEdit(makeEquipment(), {
      brand: 'Honda',
      model: 'HRX217',
      powerSource: 'battery',
    });
    expect(edited.brand).toBe('Honda');
    expect(edited.model).toBe('HRX217');
    expect(edited.powerSource).toBe('battery');
  });

  it('sets and clears the nickname', () => {
    expect(applyEquipmentEdit(makeEquipment(), { nickname: 'Green Machine' }).nickname).toBe(
      'Green Machine',
    );
    const cleared = applyEquipmentEdit(makeEquipment({ nickname: 'X' }), { nickname: '  ' });
    expect('nickname' in cleared).toBe(false);
  });

  it('drops driveType when the type changes away from mower', () => {
    const edited = applyEquipmentEdit(
      makeEquipment({ type: 'mower', driveType: 'ride' }),
      { type: 'trimmer' },
    );
    expect(edited.type).toBe('trimmer');
    expect('driveType' in edited).toBe(false);
  });

  it('leaves fields untouched when the patch omits them', () => {
    const edited = applyEquipmentEdit(makeEquipment(), { model: 'Recycler 30' });
    expect(edited.brand).toBe('Toro'); // unchanged
    expect(edited.driveType).toBe('self_propelled'); // unchanged
  });

  it('does not mutate the input', () => {
    const e = makeEquipment();
    const snapshot: Equipment = { ...e };
    applyEquipmentEdit(e, { brand: 'Ariens', type: 'edger' });
    expect(e).toEqual(snapshot);
  });
});
