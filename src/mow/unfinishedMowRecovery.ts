import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { mowRepository, propertyRepository } from './asyncStorageRepositories';
import { formatMowDate } from './format';
import {
  clearUnrecoverable,
  loadTimerState,
  loadUnrecoverableRaw,
  salvageDraft,
} from './timerStorage';

/**
 * Copy for the launch-time recovery prompt. ASCII only, no em dashes — pinned by
 * test so a wording drift is a deliberate change.
 */
export function unfinishedMowPromptTitle(startedAt: number): string {
  return `We found an unfinished mow from ${formatMowDate(startedAt)} we could not restore. Log it manually?`;
}
export const RECOVERY_CONFIRM_LABEL = 'Yes';
export const RECOVERY_DISMISS_LABEL = 'Dismiss';

/**
 * On launch, if an in-progress timer blob was quarantined (it survived a kill but
 * could not be restored — see timerStorage), offer to log it manually rather than
 * let it vanish. "Yes" creates a placeholder mow at the best-recoverable start
 * time and routes to the editor to fill in the rest; "Dismiss" clears the slot.
 *
 * The prompt shows at most once per app session (a ref guards re-renders) and,
 * because both actions clear the quarantine slot, never again after that.
 *
 * `openMowDetail` is passed in so this hook stays free of navigation typing and
 * is trivially testable; Home wires it to `navigation.navigate('MowDetail', ...)`.
 */
export function useUnfinishedMowRecovery(openMowDetail: (mowId: string) => void): void {
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    let active = true;

    (async () => {
      // Force the load that performs quarantine: an in-progress blob that fails
      // validation is moved to the unrecoverable slot as a side effect here, so a
      // corrupt blob is detected on THIS launch rather than only after the Timer
      // screen is next opened. A valid in-progress state returns normally and is
      // ignored (cold-launch routing to it is a separate concern).
      await loadTimerState();

      const raw = await loadUnrecoverableRaw();
      if (!active || raw == null) return;

      const draft = salvageDraft(raw);
      // Nothing usable to pre-fill (no plausible start time). Leave the blob in
      // place — it was already dev-logged at quarantine and stays inspectable —
      // rather than prompt with a blank date.
      if (draft == null) return;

      if (shownRef.current) return;
      shownRef.current = true;

      Alert.alert(unfinishedMowPromptTitle(draft.startedAt), undefined, [
        {
          text: RECOVERY_DISMISS_LABEL,
          style: 'cancel',
          onPress: () => {
            void clearUnrecoverable();
          },
        },
        {
          text: RECOVERY_CONFIRM_LABEL,
          onPress: () => {
            void (async () => {
              try {
                const property = await propertyRepository.getOrCreateDefault();
                const saved = await mowRepository.saveMow({
                  propertyId: property.id,
                  startedAt: draft.startedAt,
                  endedAt: draft.endedAt,
                  durationSeconds: draft.durationSeconds,
                });
                // Only clear the quarantine once the placeholder is durably saved,
                // so a failed create leaves the blob for another attempt.
                await clearUnrecoverable();
                openMowDetail(saved.id);
              } catch {
                Alert.alert(
                  'Could not recover that mow',
                  'It is still saved. Please try again.',
                );
              }
            })();
          },
        },
      ]);
    })();

    return () => {
      active = false;
    };
  }, [openMowDetail]);
}
