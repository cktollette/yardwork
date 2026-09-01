import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';

export type AsyncStatus = 'loading' | 'success' | 'error';

export type AsyncResource<T> = {
  status: AsyncStatus;
  data: T | null;
  error: unknown | null;
  /** Re-run the loader (Retry button, or a post-mutation refresh). */
  reload: () => void;
};

/**
 * Focus-aware async loader for the read screens (Home, Profile, Statistics, Log,
 * Lawn, Garage). Runs `loader` on focus and on manual reload(), and encapsulates
 * the app's data-wins error semantics.
 *
 * DATA-WINS: status is 'success' whenever we hold data. So a FIRST-load rejection
 * (no data yet) surfaces the error state — fixing the defect where an un-caught
 * rejected read left the blank loading view up forever — while a background
 * REFETCH failure (we already have data) KEEPS the last good data on screen
 * rather than yanking it to an error over a transient blip.
 *
 * That swallowed refetch error is dev-logged, never fully silent (D-056): a
 * persistently failing refresh producing stale screens invisibly is the same
 * observability trap as the D-045 flush race.
 *
 * Loading stays each screen's own blank view (intentional flash-avoidance); this
 * hook adds only the error branch. Convention: READS get a screen-level error
 * state; MUTATIONS get an Alert.
 *
 * Success values here are never null (arrays default to [], the object loaders
 * always resolve a value), so `data !== null` is a safe success discriminator.
 */
export function useAsyncResource<T>(loader: () => Promise<T>): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [nonce, setNonce] = useState(0);

  // Refs so the focus effect closes over neither `loader` nor `data` (stable
  // deps) yet always sees the current loader, and can tell at reject time
  // whether we already hold data to fall back on.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const dataRef = useRef<T | null>(data);
  dataRef.current = data;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loaderRef.current().then(
        (result) => {
          if (!active) return;
          setData(result);
          setError(null);
        },
        (e) => {
          if (!active) return;
          setError(e);
          // Swallowed from the UI (data-wins), but never from the logs.
          if (dataRef.current !== null && __DEV__) {
            console.warn(`[state] refetch failed, showing stale data: ${String(e)}`);
          }
        },
      );
      return () => {
        active = false;
      };
    }, [nonce]),
  );

  const status: AsyncStatus =
    data !== null ? 'success' : error !== null ? 'error' : 'loading';

  return { status, data, error, reload };
}
