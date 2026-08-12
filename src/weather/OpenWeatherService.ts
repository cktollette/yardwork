import type { Weather, WeatherService } from './WeatherService';

/**
 * OpenWeather-backed WeatherService.
 *
 * The ONLY place `fetch` and OpenWeather's request/response shape appear. Every
 * failure mode — missing key, non-200, timeout, network rejection, malformed
 * body — collapses to `null`; this service never throws, so best-effort callers
 * stay trivial.
 */

const ENDPOINT = 'https://api.openweathermap.org/data/2.5/weather';

/** Abort the request if OpenWeather hasn't answered within this budget. */
const TIMEOUT_MS = 5000;

/** Dev-only diagnostic for the silent null paths (#26). No-op in production. */
function warn(message: string): void {
  if (__DEV__) console.warn(`[weather] ${message}`);
}

/** Parse OpenWeather's `/weather` body into our `Weather`, or null if malformed. */
function parseConditions(data: unknown): Weather | null {
  if (typeof data !== 'object' || data === null) return null;
  const body = data as {
    main?: { temp?: unknown; humidity?: unknown };
    weather?: Array<{ main?: unknown }>;
  };
  const temp = body.main?.temp;
  const humidity = body.main?.humidity;
  const condition = body.weather?.[0]?.main;
  if (typeof temp !== 'number' || !Number.isFinite(temp)) return null;
  if (typeof humidity !== 'number' || !Number.isFinite(humidity)) return null;
  if (typeof condition !== 'string' || condition.length === 0) return null;
  return {
    tempF: Math.round(temp),
    condition,
    humidity: Math.round(humidity),
    capturedAt: new Date().toISOString(),
  };
}

export class OpenWeatherService implements WeatherService {
  async getCurrentConditions(lat: number, lon: number): Promise<Weather | null> {
    const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    if (!apiKey) {
      warn('skip: no EXPO_PUBLIC_OPENWEATHER_API_KEY set');
      return null;
    }

    // Bound the request so a hung network can never stall a capture.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const url =
        `${ENDPOINT}?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        warn(`skip: non-200 response (${res.status})`);
        return null;
      }
      const data = await res.json();
      const parsed = parseConditions(data);
      if (!parsed) warn('skip: malformed response body');
      return parsed;
    } catch (error) {
      // Timeout (abort), network rejection, or a non-JSON body all land here.
      const e = error as { name?: string; message?: string } | null;
      if (e?.name === 'AbortError') warn(`skip: timed out after ${TIMEOUT_MS}ms`);
      else warn(`skip: request failed — ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Wired singleton — the app's WeatherService binding. */
export const weatherService: WeatherService = new OpenWeatherService();
