import { MapboxGeocodingService } from './MapboxGeocodingService';

const TOKEN = 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN';

/** A well-formed v6 forward-geocoding FeatureCollection. */
function okBody(features?: unknown[]) {
  return {
    type: 'FeatureCollection',
    features: features ?? [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-96.8236, 33.1507] },
        properties: { full_address: '123 Main St, Frisco, TX 75034', name: '123 Main St' },
      },
    ],
  };
}

const originalFetch = globalThis.fetch;
const originalToken = process.env[TOKEN];

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env[TOKEN];
  else process.env[TOKEN] = originalToken;
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('MapboxGeocodingService', () => {
  it('maps a successful response to GeocodeResults', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    const results = await new MapboxGeocodingService().forwardGeocode('123 Main St');

    expect(results).toEqual([
      { label: '123 Main St, Frisco, TX 75034', center: [-96.8236, 33.1507] },
    ]);
  });

  it('sends the query and limit, and NO permanent flag (temporary tier)', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    await new MapboxGeocodingService().forwardGeocode('123 Main St, Frisco');

    const url = (globalThis.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/search/geocode/v6/forward');
    expect(url).toContain('q=123%20Main%20St%2C%20Frisco');
    expect(url).toContain('limit=5');
    expect(url).not.toContain('permanent');
  });

  it('falls back to properties.name when full_address is absent', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => okBody([
        {
          geometry: { coordinates: [-97.1, 32.9] },
          properties: { name: 'Frisco' },
        },
      ]),
    }) as unknown as typeof fetch;

    const results = await new MapboxGeocodingService().forwardGeocode('Frisco');
    expect(results).toEqual([{ label: 'Frisco', center: [-97.1, 32.9] }]);
  });

  it('drops malformed features but keeps valid ones', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => okBody([
        { geometry: { coordinates: ['x', 'y'] }, properties: { name: 'bad coords' } },
        { geometry: { coordinates: [-96.8, 33.1] }, properties: {} }, // no label
        { geometry: { coordinates: [-96.5, 33.2] }, properties: { full_address: 'Good One' } },
      ]),
    }) as unknown as typeof fetch;

    const results = await new MapboxGeocodingService().forwardGeocode('q');
    expect(results).toEqual([{ label: 'Good One', center: [-96.5, 33.2] }]);
  });

  it('returns [] and never calls fetch when the token is missing', async () => {
    delete process.env[TOKEN];
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    expect(await new MapboxGeocodingService().forwardGeocode('123 Main St')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    const logged = (console.warn as jest.Mock).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[geocoding]');
    expect(logged).toContain('MAPBOX_ACCESS_TOKEN');
  });

  it('returns [] on a non-200 response and logs the status', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => okBody(),
    }) as unknown as typeof fetch;

    expect(await new MapboxGeocodingService().forwardGeocode('q')).toEqual([]);
    const logged = (console.warn as jest.Mock).mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('non-200');
    expect(logged).toContain('429');
  });

  it('returns [] on a network rejection', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    expect(await new MapboxGeocodingService().forwardGeocode('q')).toEqual([]);
  });

  it('returns [] on a malformed response body', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ nope: true }),
    }) as unknown as typeof fetch;

    expect(await new MapboxGeocodingService().forwardGeocode('q')).toEqual([]);
  });

  it('returns [] when the request times out', async () => {
    jest.useFakeTimers();
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;

    const promise = new MapboxGeocodingService().forwardGeocode('q');
    jest.advanceTimersByTime(5000);

    expect(await promise).toEqual([]);
  });

  it('aborts when a caller-supplied signal fires', async () => {
    process.env[TOKEN] = 'pk.test';
    globalThis.fetch = jest.fn(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;

    const controller = new AbortController();
    const promise = new MapboxGeocodingService().forwardGeocode('q', { signal: controller.signal });
    controller.abort();

    expect(await promise).toEqual([]);
  });
});
