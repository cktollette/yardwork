import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOWS_KEY, mowRepository } from './asyncStorageRepositories';
import type { Mow, NewMow } from './models';
import type { Activity } from '../activity/ActivityService';
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

const ACTIVITY: Activity = {
  steps: 4213,
  distanceMi: 1.87,
  source: 'Apple Watch',
  capturedAt: '2026-08-10T15:00:00.000Z',
};

const WEATHER: Weather = {
  tempF: 94,
  condition: 'Clear',
  humidity: 40,
  capturedAt: '2026-08-10T15:00:00.000Z',
};

describe('mowRepository.attachActivity', () => {
  it('attaches activity to an existing record without touching other fields', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow({ notes: 'first cut' }));

    await mowRepository.attachActivity(id, ACTIVITY);

    const mow = await mowRepository.getMowById(id);
    expect(mow?.activity).toEqual(ACTIVITY);
    expect(mow?.notes).toBe('first cut'); // untouched
  });

  it('is a silent no-op on an unknown id', async () => {
    await expect(mowRepository.attachActivity('nope', ACTIVITY)).resolves.toBeUndefined();
    expect(await mowRepository.listMows()).toHaveLength(0);
  });

  it.each([
    ['update then attach', 'update-first'] as const,
    ['attach then update', 'attach-first'] as const,
  ])('keeps BOTH the edited notes and the activity when %s race', async (_label, order) => {
    const { id } = await mowRepository.saveMow(makeNewMow({ notes: 'original' }));

    const update = () => mowRepository.update(id, { notes: 'edited' });
    const attach = () => mowRepository.attachActivity(id, ACTIVITY);

    await Promise.all(
      order === 'update-first' ? [update(), attach()] : [attach(), update()],
    );

    const mow = await mowRepository.getMowById(id);
    expect(mow?.notes).toBe('edited');
    expect(mow?.activity).toEqual(ACTIVITY);
  });

  it('preserves existing activity when update() is passed a payload without it', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());
    await mowRepository.attachActivity(id, ACTIVITY);

    await mowRepository.update(id, { notes: 'edited later' });

    const mow = await mowRepository.getMowById(id);
    expect(mow?.activity).toEqual(ACTIVITY);
    expect(mow?.notes).toBe('edited later');
  });

  it('preserves existing activity even when the payload has activity: undefined', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow());
    await mowRepository.attachActivity(id, ACTIVITY);

    // A present-but-undefined key must not clear the capture-only field.
    await mowRepository.update(id, { notes: 'x', activity: undefined } as never);

    const mow = await mowRepository.getMowById(id);
    expect(mow?.activity).toEqual(ACTIVITY);
  });

  it('holds weather AND activity at once, both surviving an edit', async () => {
    const { id } = await mowRepository.saveMow(makeNewMow({ notes: 'original' }));
    await mowRepository.attachWeather(id, WEATHER);
    await mowRepository.attachActivity(id, ACTIVITY);

    await mowRepository.update(id, { notes: 'edited' });

    const mow = await mowRepository.getMowById(id);
    expect(mow?.weather).toEqual(WEATHER);
    expect(mow?.activity).toEqual(ACTIVITY);
    expect(mow?.notes).toBe('edited');
  });

  it('loads v6 records (no activity) cleanly through list and get', async () => {
    // A record written before the activity field existed — may carry weather.
    const legacy: Mow = {
      id: 'legacy-1',
      propertyId: 'prop-1',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_000_000_000 + 1800 * 1000,
      durationSeconds: 1800,
      weather: WEATHER,
    };
    await AsyncStorage.setItem(MOWS_KEY, JSON.stringify([legacy]));

    const list = await mowRepository.listMows();
    expect(list).toHaveLength(1);
    expect(list[0].activity).toBeUndefined();
    expect(list[0].weather).toEqual(WEATHER);

    const byId = await mowRepository.getMowById('legacy-1');
    expect(byId).toEqual(legacy);
    expect(byId?.activity).toBeUndefined();
  });
});
