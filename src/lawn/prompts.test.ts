import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Position } from '../mow/models';
import {
  dismissOnboarding,
  dismissThirdMowPrompt,
  hasLawn,
  isOnboardingDismissed,
  isThirdMowPromptDismissed,
  shouldPromptAfterMow,
  shouldShowOnboarding,
  THIRD_MOW_PROMPT_THRESHOLD,
} from './prompts';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

const TRIANGLE: Position[] = [
  [0, 0],
  [1, 0],
  [0, 1],
];

describe('hasLawn', () => {
  it('is true only for a ring at/above the minimum vertex count', () => {
    expect(hasLawn(TRIANGLE)).toBe(true);
    expect(hasLawn([[0, 0], [1, 1]])).toBe(false);
    expect(hasLawn([])).toBe(false);
    expect(hasLawn(null)).toBe(false);
    expect(hasLawn(undefined)).toBe(false);
  });
});

describe('shouldShowOnboarding', () => {
  it('shows only when there is no lawn and it was not dismissed', () => {
    expect(shouldShowOnboarding({ hasBoundary: false, dismissed: false })).toBe(true);
    expect(shouldShowOnboarding({ hasBoundary: true, dismissed: false })).toBe(false);
    expect(shouldShowOnboarding({ hasBoundary: false, dismissed: true })).toBe(false);
    expect(shouldShowOnboarding({ hasBoundary: true, dismissed: true })).toBe(false);
  });
});

describe('shouldPromptAfterMow', () => {
  it('waits for the threshold, then only while lawn-less and not dismissed', () => {
    const base = { hasBoundary: false, dismissed: false };
    expect(shouldPromptAfterMow({ ...base, mowCount: THIRD_MOW_PROMPT_THRESHOLD - 1 })).toBe(false);
    expect(shouldPromptAfterMow({ ...base, mowCount: THIRD_MOW_PROMPT_THRESHOLD })).toBe(true);
    expect(shouldPromptAfterMow({ ...base, mowCount: THIRD_MOW_PROMPT_THRESHOLD + 5 })).toBe(true);
  });

  it('never prompts once a lawn exists or it was dismissed', () => {
    const many = THIRD_MOW_PROMPT_THRESHOLD + 10;
    expect(shouldPromptAfterMow({ mowCount: many, hasBoundary: true, dismissed: false })).toBe(false);
    expect(shouldPromptAfterMow({ mowCount: many, hasBoundary: false, dismissed: true })).toBe(false);
  });
});

describe('dismissal flags', () => {
  it('default to not-dismissed and flip to dismissed after a write', async () => {
    expect(await isOnboardingDismissed()).toBe(false);
    expect(await isThirdMowPromptDismissed()).toBe(false);

    await dismissOnboarding();
    await dismissThirdMowPrompt();

    expect(await isOnboardingDismissed()).toBe(true);
    expect(await isThirdMowPromptDismissed()).toBe(true);
  });

  it('tracks the two nudges independently', async () => {
    await dismissThirdMowPrompt();
    expect(await isThirdMowPromptDismissed()).toBe(true);
    expect(await isOnboardingDismissed()).toBe(false);
  });
});
