import {
  CURRENT_POSITION_TIMEOUT_MS,
  decideLocationFlow,
  pickCameraCenter,
  withTimeout,
} from './location';
import type { Position } from '../mow/models';

const FALLBACK: Position = [-96.8236, 33.1507];

describe('decideLocationFlow', () => {
  it('proceeds when already granted', () => {
    expect(decideLocationFlow('granted')).toBe('proceed');
  });

  it('requests when undetermined', () => {
    expect(decideLocationFlow('undetermined')).toBe('request');
  });

  it('falls back when denied — never re-prompts', () => {
    expect(decideLocationFlow('denied')).toBe('fallback');
  });
});

describe('pickCameraCenter', () => {
  it('maps real coords to [lon, lat]', () => {
    expect(pickCameraCenter({ longitude: -97.1, latitude: 32.9 }, FALLBACK)).toEqual([-97.1, 32.9]);
  });

  it('returns fallback for null', () => {
    expect(pickCameraCenter(null, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for undefined', () => {
    expect(pickCameraCenter(undefined, FALLBACK)).toBe(FALLBACK);
  });
});

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resolves with the value when the promise wins the race', async () => {
    await expect(withTimeout(Promise.resolve('here'), CURRENT_POSITION_TIMEOUT_MS)).resolves.toBe(
      'here',
    );
  });

  it('rejects when the timeout wins', async () => {
    const pending = new Promise<string>(() => {}); // never settles
    const raced = withTimeout(pending, CURRENT_POSITION_TIMEOUT_MS);
    const assertion = expect(raced).rejects.toThrow(/Timed out/);
    jest.advanceTimersByTime(CURRENT_POSITION_TIMEOUT_MS);
    await assertion;
  });

  it('propagates the underlying rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000)).rejects.toThrow('boom');
  });
});
