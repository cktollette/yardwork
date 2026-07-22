import type { DraftMow } from './timer';

/**
 * STUB. The mow-log feature will replace this with real persistence
 * (Supabase / local store) later. For v0 it just logs the draft so we can
 * confirm the Stop flow produces a well-formed mow.
 */
export function saveDraftMow(draft: DraftMow): void {
  console.log('[saveDraftMow] draft mow:', draft);
}
