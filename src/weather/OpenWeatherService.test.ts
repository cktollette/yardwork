import { OpenWeatherService } from './OpenWeatherService';

const KEY = 'EXPO_PUBLIC_OPENWEATHER_API_KEY';

/** A well-formed OpenWeather `/weather` body. */
function okBody(overrides: Record<string, unknown> = {}) {
  return {
    main: { temp: 93.6, humidity: 44.7 },
    weather: [{ main: 'Clear' }],
    ...overrides,
  };
}

const originalFetch = globalThis.fetch;
const originalKey = process.env[KEY];

beforeEach(() => {
  // Silence (and capture) the #26 __DEV__ diagnostics.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env[KEY];
  else process.env[KEY] = originalKey;
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('OpenWeatherService', () => {
  it('maps a successful response, rounding temp and humidity', async () => {
    process.env[KEY] = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    const weather = await new OpenWeatherService().getCurrentConditions(33.1, -96.8);

    expect(weather).toEqual({
      tempF: 94,
      condition: 'Clear',
      humidity: 45,
      capturedAt: expect.any(String),
    });
    // units=imperial and the coordinates go through to OpenWeather.
    const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('units=imperial');
    expect(url).toContain('lat=33.1');
    expect(url).toContain('lon=-96.8');
  });

  it('logs a [weather] diagnostic with the status code on a non-200 (#26)', async () => {
    process.env[KEY] = 'test-key';
    const warnSpy = console.warn as unknown as jest.Mock;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    await new OpenWeatherService().getCurrentConditions(1, 2);

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[weather]');
    expect(logged).toContain('non-200');
    expect(logged).toContain('503');
  });

  it('logs a [weather] diagnostic when the API key is missing (#26)', async () => {
    delete process.env[KEY];
    const warnSpy = console.warn as unknown as jest.Mock;

    expect(await new OpenWeatherService().getCurrentConditions(1, 2)).toBeNull();

    const logged = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[weather]');
    expect(logged).toContain('OPENWEATHER_API_KEY');
  });

  it('returns null on a non-200 response', async () => {
    process.env[KEY] = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    expect(await new OpenWeatherService().getCurrentConditions(1, 2)).toBeNull();
  });

  it('returns null on a network rejection', async () => {
    process.env[KEY] = 'test-key';
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    expect(await new OpenWeatherService().getCurrentConditions(1, 2)).toBeNull();
  });

  it('returns null on a malformed response body', async () => {
    process.env[KEY] = 'test-key';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    }) as unknown as typeof fetch;

    expect(await new OpenWeatherService().getCurrentConditions(1, 2)).toBeNull();
  });

  it('returns null when the API key is absent (and never calls fetch)', async () => {
    delete process.env[KEY];
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await new OpenWeatherService().getCurrentConditions(1, 2)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when the request times out', async () => {
    jest.useFakeTimers();
    process.env[KEY] = 'test-key';
    // Never resolves on its own — only the abort signal settles it.
    globalThis.fetch = jest.fn(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;

    const promise = new OpenWeatherService().getCurrentConditions(1, 2);
    jest.advanceTimersByTime(5000);

    expect(await promise).toBeNull();
  });
});
