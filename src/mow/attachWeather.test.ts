import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOWS_KEY, mowRepository } from './asyncStorageRepositories';
import type { Mow, NewMow } from './models';
import type { Weather } from '../weather/WeatherService';

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

const WEATHER: Weather = {
  tempF: 94,
  condition: 'Clear',
  humidity: 40,
  capturedAt: '2026-08-10T15:00:00.000Z',
};

describe('mowRepository.attachWeather', () => {
  it('attaches weather to an existing record without touching other fields', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow({ notes: 'first cut' }));

    await mowRepository.attachWeather(id, WEATHER);

    const mow = await mowRepository.getMowById(id);
    expect(mow?.weather).toEqual(WEATHER);
    expect(mow?.notes).toBe('first cut'); // untouched
  });

  it('is a silent no-op on an unknown id', async () => {
    await expect(mowRepository.attachWeather('does-not-exist', WEATHER)).resolves.toBeUndefined();
    expect(await mowRepository.listMows()).toHaveLength(0);
  });

  it.each([
    ['update then attach', 'update-first'] as const,
    ['attach then update', 'attach-first'] as const,
  ])(
    'keeps BOTH the edited notes and the weather when %s race',
    async (_label, order) => {
      const { id } = await mowRepository.saveMow(makeNewMow({ notes: 'original' }));

      const update = () => mowRepository.update(id, { notes: 'edited' });
      const attach = () => mowRepository.attachWeather(id, WEATHER);

      // Fire both without awaiting between them, in the given order.
      await Promise.all(
        order === 'update-first' ? [update(), attach()] : [attach(), update()],
      );

      const mow = await mowRepository.getMowById(id);
      expect(mow?.notes).toBe('edited');
      expect(mow?.weather).toEqual(WEATHER);
    },
  );

  it('preserves existing weather when update() is passed a payload without it', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());
    await mowRepository.attachWeather(id, WEATHER);

    await mowRepository.update(id, { notes: 'edited later' });

    const mow = await mowRepository.getMowById(id);
    expect(mow?.weather).toEqual(WEATHER); // edits never clear weather
    expect(mow?.notes).toBe('edited later');
  });

  it('loads pre-bump records (no weather) cleanly through list and get', async () => {
    // Seed a raw record written before the weather field existed.
    const legacy: Mow = {
      id: 'legacy-1',
      propertyId: 'prop-1',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_000 + 1800 * 1000,
      durationSeconds: 1800,
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacy]));

    const list = await mowRepository.listMows();
    expect(list).toHaveLength(1);
    expect(list[0].weather).toBeUndefined();

    const byId = await mowRepository.getMowById('legacy-1');
    expect(byId).toEqual(legacy);
    expect(byId?.weather).toBeUndefined();
  });
});
