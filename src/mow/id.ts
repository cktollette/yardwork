/**
 * Generate a locally-unique id for a persisted entity.
 *
 * Good enough for on-device storage: a base36 timestamp plus a random suffix.
 * Ordering never depends on the id (mows sort by startedAt), and Supabase will
 * assign real ids once that branch lands, so uniqueness here only needs to
 * hold on a single device.
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}`;
}
