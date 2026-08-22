import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Zone } from '../mow/models';

/**
 * When to nudge the user toward drawing their lawn, and remembering when
 * they've said no. Every nudge is skippable and, once dismissed, never returns
 * (D-002: the polygon is optional — the app is fully usable without it).
 *
 * The decision logic is pure and unit-tested; the AsyncStorage flags are thin
 * wrappers so the predicates can be reasoned about without touching storage.
 */

export const ONBOARDING_DISMISSED_KEY = '@yardwork/lawn-onboarding-dismissed';
export const THIRD_MOW_PROMPT_DISMISSED_KEY =
  '@yardwork/lawn-third-mow-prompt-dismissed';
export const FIRST_MOW_SHEET_DISMISSED_KEY =
  '@yardwork/first-mow-sheet-dismissed';

/** Mows logged before a lawn-less user gets the one-time "trace it" nudge. */
export const THIRD_MOW_PROMPT_THRESHOLD = 3;

/** True once at least one lawn zone has been traced. */
export function hasLawn(zones: Zone[] | null | undefined): boolean {
  return (zones?.length ?? 0) > 0;
}

/** First-launch onboarding: offer to draw until they draw one or skip. */
export function shouldShowOnboarding(args: {
  hasBoundary: boolean;
  dismissed: boolean;
}): boolean {
  return !args.hasBoundary && !args.dismissed;
}

/**
 * First-mow coaching sheet: shown the first time the user starts the timer, but
 * never stacked on the lawn onboarding — it waits until onboarding is not going
 * to show (already dismissed, or a lawn already exists). Shown at most once.
 */
export function shouldShowFirstMowSheet(args: {
  onboardingActive: boolean;
  firstMowSheetDismissed: boolean;
}): boolean {
  return !args.onboardingActive && !args.firstMowSheetDismissed;
}

/** Post-save nudge: once they've logged enough mows but still have no lawn. */
export function shouldPromptAfterMow(args: {
  mowCount: number;
  hasBoundary: boolean;
  dismissed: boolean;
}): boolean {
  return (
    args.mowCount >= THIRD_MOW_PROMPT_THRESHOLD &&
    !args.hasBoundary &&
    !args.dismissed
  );
}

// --- AsyncStorage flags. Defensive: a storage error reads as "not dismissed"
// (show the nudge) and a failed write is swallowed, never crashing a flow. ---

async function readFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === '1';
  } catch {
    return false;
  }
}

async function setFlag(key: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, '1');
  } catch {
    // A lost dismissal just means the nudge may show once more — harmless.
  }
}

export const isOnboardingDismissed = () => readFlag(ONBOARDING_DISMISSED_KEY);
export const dismissOnboarding = () => setFlag(ONBOARDING_DISMISSED_KEY);
export const isThirdMowPromptDismissed = () =>
  readFlag(THIRD_MOW_PROMPT_DISMISSED_KEY);
export const dismissThirdMowPrompt = () =>
  setFlag(THIRD_MOW_PROMPT_DISMISSED_KEY);
export const isFirstMowSheetDismissed = () =>
  readFlag(FIRST_MOW_SHEET_DISMISSED_KEY);
export const dismissFirstMowSheet = () => setFlag(FIRST_MOW_SHEET_DISMISSED_KEY);
