import { captureWeatherForMow, MAX_CAPTURE_AGE_MS } from './captureWeatherForMow';
import type { Weather } from './WeatherService';

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));
jest.mock('./OpenWeatherService', () => ({
  weatherService: { getCurrentConditions: jest.fn() },
}));
jest.mock('../mow/asyncStorageRepositories', () => ({
  mowRepository: { attachWeather: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Location = require('expo-location');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { weatherService } = require('./OpenWeatherService');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository, propertyRepository } = require('../mow/asyncStorageRepositories');

const WEATHER: Weather = {
  tempF: 94,
  condition: 'Clear',
  humidity: 40,
  capturedAt: '2026-08-10T15:00:00.000Z',
};

// A square whose vertex-average centroid is [1, 1] → lon 1, lat 1.
const SQUARE = [
  [0, 0],
  [2, 0],
  [2, 2],
  [0, 2],
];
// Same square shifted +10 in longitude → centroid [11, 1].
const SQUARE_EAST = [
  [10, 0],
  [12, 0],
  [12, 2],
  [10, 2],
];

/** Build a property whose zones carry the given vertex rings. */
function propertyWithZones(...rings: number[][][]) {
  return {
    id: 'p1',
    zones: rings.map((vertices, i) => ({
      id: `z${i}`,
      name: 'Lawn',
      vertices,
      areaSqFt: 1,
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  weatherService.getCurrentConditions.mockResolvedValue(WEATHER);
  mowRepository.attachWeather.mockResolvedValue(undefined);
  propertyRepository.getOrCreateDefault.mockResolvedValue(propertyWithZones());
  Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
  Location.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe('captureWeatherForMow', () => {
  it('uses the single-zone centroid, identical to the old single-polygon behavior', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(propertyWithZones(SQUARE));

    await captureWeatherForMow('m1');

    // Same [1, 1] the pre-multi-zone single boundary produced.
    expect(weatherService.getCurrentConditions).toHaveBeenCalledWith(1, 1);
    expect(mowRepository.attachWeather).toHaveBeenCalledWith('m1', WEATHER);
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('pools vertices across zones: two zones give a centroid between them', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(
      propertyWithZones(SQUARE, SQUARE_EAST),
    );

    await captureWeatherForMow('m1');

    // Pooled centroid of the two squares ([1,1] and [11,1]) is [6, 1] → lat 1, lon 6.
    expect(weatherService.getCurrentConditions).toHaveBeenCalledWith(1, 6);
    expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('falls back to last-known location when there is no polygon', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 33, longitude: -96 },
    });

    await captureWeatherForMow('m1');

    expect(weatherService.getCurrentConditions).toHaveBeenCalledWith(33, -96);
    expect(mowRepository.attachWeather).toHaveBeenCalledWith('m1', WEATHER);
  });

  it('skips silently when neither zones nor granted location is available', async () => {
    // no zones + permission denied (default beforeEach state).
    await captureWeatherForMow('m1');

    expect(weatherService.getCurrentConditions).not.toHaveBeenCalled();
    expect(mowRepository.attachWeather).not.toHaveBeenCalled();
  });

  it('does not re-prompt: an ungranted permission is treated as unavailable', async () => {
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'undetermined' });

    await captureWeatherForMow('m1');

    expect(Location.getLastKnownPositionAsync).not.toHaveBeenCalled();
    expect(mowRepository.attachWeather).not.toHaveBeenCalled();
  });

  it('skips silently when the weather service returns null', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(propertyWithZones(SQUARE));
    weatherService.getCurrentConditions.mockResolvedValue(null);

    await captureWeatherForMow('m1');

    expect(mowRepository.attachWeather).not.toHaveBeenCalled();
  });

  it('refuses (silent) when the save is older than the recency window', async () => {
    const stale = Date.now() - (MAX_CAPTURE_AGE_MS + 60_000);

    await captureWeatherForMow('m1', stale);

    expect(propertyRepository.getOrCreateDefault).not.toHaveBeenCalled();
    expect(weatherService.getCurrentConditions).not.toHaveBeenCalled();
    expect(mowRepository.attachWeather).not.toHaveBeenCalled();
  });

  it('never rejects, even when every dependency throws', async () => {
    propertyRepository.getOrCreateDefault.mockRejectedValue(new Error('boom'));
    Location.getForegroundPermissionsAsync.mockRejectedValue(new Error('boom'));
    weatherService.getCurrentConditions.mockRejectedValue(new Error('boom'));
    mowRepository.attachWeather.mockRejectedValue(new Error('boom'));

    await expect(captureWeatherForMow('m1')).resolves.toBeUndefined();
  });
});
