import { applyMowEdit, type MowEdit } from './editMow';
import type { Mow } from './models';

/** A persisted mow with a known 40-minute duration. */
function makeMow(overrides: Partial<Mow> = {}): Mow {
  const startedAt = 1_700_000_000_000;
  return {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 2400 * 1000,
    durationSeconds: 2400,
    ...overrides,
  };
}

describe('applyMowEdit', () => {
  it('shifts endedAt to preserve duration when only startedAt changes', () => {
    const mow = makeMow();
    const newStart = mow.startedAt + 3 * 86_400_000; // three days later
    const edited = applyMowEdit(mow, { startedAt: newStart });

    expect(edited.startedAt).toBe(newStart);
    expect(edited.durationSeconds).toBe(2400); // unchanged
    expect(edited.endedAt).toBe(newStart + 2400 * 1000); // shifted with the start
  });

  it('recomputes endedAt from startedAt when only duration changes', () => {
    const mow = makeMow();
    const edited = applyMowEdit(mow, { durationSeconds: 1200 });

    expect(edited.startedAt).toBe(mow.startedAt); // unchanged
    expect(edited.durationSeconds).toBe(1200);
    expect(edited.endedAt).toBe(mow.startedAt + 1200 * 1000);
  });

  it('preserves an odd durationSeconds exactly when only the date is edited (no rounding)', () => {
    const mow = makeMow({ durationSeconds: 754, endedAt: 1_700_000_000_000 + 754 * 1000 });
    const newStart = mow.startedAt + 5 * 86_400_000;
    const edited = applyMowEdit(mow, { startedAt: newStart });

    expect(edited.durationSeconds).toBe(754);
    expect(edited.endedAt).toBe(newStart + 754 * 1000);
  });

  it('applies both startedAt and duration together', () => {
    const mow = makeMow();
    const newStart = mow.startedAt + 1000;
    const edited = applyMowEdit(mow, { startedAt: newStart, durationSeconds: 600 });

    expect(edited.startedAt).toBe(newStart);
    expect(edited.durationSeconds).toBe(600);
    expect(edited.endedAt).toBe(newStart + 600 * 1000);
  });

  it('sets notes from a non-empty patch and clears them from an empty one', () => {
    const mow = makeMow({ notes: 'old' });
    expect(applyMowEdit(mow, { notes: '  fresh cut ' }).notes).toBe('fresh cut');
    expect('notes' in applyMowEdit(mow, { notes: '   ' })).toBe(false);
  });

  it('leaves notes untouched when the patch omits them', () => {
    const mow = makeMow({ notes: 'keep me' });
    expect(applyMowEdit(mow, { durationSeconds: 100 }).notes).toBe('keep me');
  });

  it('sets hocInches from a patch, snapping to the valid grid', () => {
    const mow = makeMow();
    expect(applyMowEdit(mow, { hocInches: 2.5 }).hocInches).toBe(2.5);
    // Off-grid / out-of-range values are clamped and snapped.
    expect(applyMowEdit(mow, { hocInches: 2.6 }).hocInches).toBe(2.5);
    expect(applyMowEdit(mow, { hocInches: 99 }).hocInches).toBe(4.5);
  });

  it('clears hocInches when the patch value is undefined', () => {
    const mow = makeMow({ hocInches: 3 });
    const edited = applyMowEdit(mow, { hocInches: undefined });
    expect('hocInches' in edited).toBe(false);
  });

  it('leaves hocInches untouched when the patch omits it', () => {
    const mow = makeMow({ hocInches: 2.25 });
    expect(applyMowEdit(mow, { durationSeconds: 100 }).hocInches).toBe(2.25);
  });

  it('sets clippingBags from a patch, rounding/clamping to the valid range', () => {
    const mow = makeMow();
    expect(applyMowEdit(mow, { clippingBags: 3 }).clippingBags).toBe(3);
    expect(applyMowEdit(mow, { clippingBags: 2.6 }).clippingBags).toBe(3); // rounded
    expect(applyMowEdit(mow, { clippingBags: 99 }).clippingBags).toBe(20); // clamped
  });

  it('sets clippingBags to 0 (a recorded value, not a clear)', () => {
    const mow = makeMow();
    const edited = applyMowEdit(mow, { clippingBags: 0 });
    expect('clippingBags' in edited).toBe(true);
    expect(edited.clippingBags).toBe(0);
  });

  it('clears clippingBags when the patch value is undefined', () => {
    const mow = makeMow({ clippingBags: 4 });
    expect('clippingBags' in applyMowEdit(mow, { clippingBags: undefined })).toBe(false);
  });

  it('leaves clippingBags untouched when the patch omits it', () => {
    const mow = makeMow({ clippingBags: 2 });
    expect(applyMowEdit(mow, { notes: 'x' }).clippingBags).toBe(2);
  });

  it('sets toolTypes from a patch, deduping and forcing canonical order', () => {
    const mow = makeMow();
    expect(applyMowEdit(mow, { toolTypes: ['blower', 'mower', 'mower'] }).toolTypes).toEqual([
      'mower',
      'blower',
    ]);
  });

  it('clears toolTypes when the patch value is empty or undefined', () => {
    const mow = makeMow({ toolTypes: ['mower', 'trimmer'] });
    expect('toolTypes' in applyMowEdit(mow, { toolTypes: [] })).toBe(false);
    expect('toolTypes' in applyMowEdit(mow, { toolTypes: undefined })).toBe(false);
  });

  it('leaves toolTypes untouched when the patch omits them', () => {
    const mow = makeMow({ toolTypes: ['edger'] });
    expect(applyMowEdit(mow, { notes: 'x' }).toolTypes).toEqual(['edger']);
  });

  it('sets a photo slot from an (already app-owned) URI in the patch', () => {
    const mow = makeMow();
    const edited = applyMowEdit(mow, { beforePhotoUri: 'file:///app/mow-photos/b.jpg' });
    expect(edited.beforePhotoUri).toBe('file:///app/mow-photos/b.jpg');
    expect('afterPhotoUri' in edited).toBe(false); // other slot untouched
  });

  it('clears a photo slot when the patch value is undefined', () => {
    const mow = makeMow({ beforePhotoUri: 'file:///app/mow-photos/b.jpg' });
    expect('beforePhotoUri' in applyMowEdit(mow, { beforePhotoUri: undefined })).toBe(false);
  });

  it('treats the two photo slots independently', () => {
    const mow = makeMow({
      beforePhotoUri: 'file:///app/mow-photos/b.jpg',
      afterPhotoUri: 'file:///app/mow-photos/a.jpg',
    });
    // Replace only the after slot; before is left exactly as stored.
    const edited = applyMowEdit(mow, { afterPhotoUri: 'file:///app/mow-photos/a2.jpg' });
    expect(edited.beforePhotoUri).toBe('file:///app/mow-photos/b.jpg');
    expect(edited.afterPhotoUri).toBe('file:///app/mow-photos/a2.jpg');
  });

  it('leaves photo slots untouched when the patch omits them', () => {
    const mow = makeMow({ beforePhotoUri: 'file:///app/mow-photos/b.jpg' });
    expect(applyMowEdit(mow, { notes: 'x' }).beforePhotoUri).toBe('file:///app/mow-photos/b.jpg');
  });

  it('rejects an edit that makes endedAt <= startedAt', () => {
    const mow = makeMow();
    expect(() => applyMowEdit(mow, { durationSeconds: 0 })).toThrow();
    expect(() => applyMowEdit(mow, { durationSeconds: -5 })).toThrow();
  });

  it('does not mutate the input mow', () => {
    const mow = makeMow();
    const snapshot: Mow = { ...mow };
    applyMowEdit(mow, { startedAt: mow.startedAt + 1000, durationSeconds: 60 } satisfies MowEdit);
    expect(mow).toEqual(snapshot);
  });
});
