import AsyncStorage from '@react-native-async-storage/async-storage';
import { mowRepository } from './asyncStorageRepositories';
import type { NewMow } from './models';

// In-memory AsyncStorage mock shipped with the async-storage package.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeNewMow(overrides: Partial<NewMow> = {}): NewMow {
  const startedAt = 1_700_000_000_000;
  return {
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 2400 * 1000,
    durationSeconds: 2400,
    ...overrides,
  };
}

// The mow repository persists the whole array under one key, so two overlapping
// read-modify-write mutations would lose one write without serialization. These
// tests pin the serialized behavior of the write queue.
describe('mow repository — serialized mutations', () => {
  it('lands both of two interleaved updates to different fields', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());

    // Fire without awaiting between them — they overlap.
    await Promise.all([
      mowRepository.update(id, { notes: 'from A' }),
      mowRepository.update(id, { hocInches: 2.5 }),
    ]);

    const mow = await mowRepository.getMowById(id);
    expect(mow?.notes).toBe('from A');
    expect(mow?.hocInches).toBe(2.5);
  });

  it('resolves update-then-delete deterministically (record ends deleted)', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());

    const update = mowRepository.update(id, { notes: 'edited' });
    const del = mowRepository.delete(id);
    await Promise.all([update, del]);

    expect(await mowRepository.getMowById(id)).toBeNull();
  });

  it('resolves delete-then-update deterministically (update rejects on the gone record)', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());

    const del = mowRepository.delete(id);
    const update = mowRepository.update(id, { notes: 'edited' });
    await del;

    await expect(update).rejects.toThrow(`No mow with id ${id}`);
    expect(await mowRepository.getMowById(id)).toBeNull();
  });
});
