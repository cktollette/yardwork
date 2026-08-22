import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { formatMowDate } from './format';
import type { DraftMow } from './timer';
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
 * let it vanish.
 *
 * This hook NEVER writes to the mow store. "Yes" synthesizes a draft from the
 * salvaged state (start from the earliest intact segment; active duration + end
 * from any intact segments, else a zero-duration draft at the salvaged start) and
 * routes into SaveMowScreen — the same entry point Finish uses. A record exists
 * only if the user taps Save there; abandoning SaveMow leaves the store untouched.
 * Both "Yes" and "Dismiss" clear the quarantine slot, so nothing is written on
 * dismiss and the prompt never returns.
 *
 * The prompt shows at most once per app session (a ref guards re-renders).
 * `openSaveMow` is passed in so this hook stays free of navigation typing and is
 * trivially testable; Home wires it to `navigation.navigate('SaveMow', ...)`.
 */
export function useUnfinishedMowRecovery(openSaveMow: (draft: DraftMow) => void): void {
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
      // rather than route into SaveMow with a blank date.
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
            // Hand the salvaged draft to the normal save flow and retire the
            // quarantine slot. No record is created here — only SaveMow's Save
            // writes one; backing out of SaveMow writes nothing.
            void clearUnrecoverable();
            openSaveMow(draft);
          },
        },
      ]);
    })();

    return () => {
      active = false;
    };
  }, [openSaveMow]);
}
