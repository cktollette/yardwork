import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Position, Zone } from '../mow/models';
import {
  dismissFirstMowSheet,
  dismissOnboarding,
  dismissThirdMowPrompt,
  hasLawn,
  isFirstMowSheetDismissed,
  isOnboardingDismissed,
  isThirdMowPromptDismissed,
  shouldPromptAfterMow,
  shouldShowFirstMowSheet,
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
const zone = (): Zone => ({ id: 'z1', name: 'Lawn', vertices: TRIANGLE, areaSqFt: 100 });

describe('shouldShowFirstMowSheet', () => {
  it('shows only when onboarding is not active and it has not been dismissed', () => {
    expect(
      shouldShowFirstMowSheet({ onboardingActive: false, firstMowSheetDismissed: false }),
    ).toBe(true);
  });
  it('never stacks on the lawn onboarding', () => {
    expect(
      shouldShowFirstMowSheet({ onboardingActive: true, firstMowSheetDismissed: false }),
    ).toBe(false);
  });
  it('never shows once dismissed', () => {
    expect(
      shouldShowFirstMowSheet({ onboardingActive: false, firstMowSheetDismissed: true }),
    ).toBe(false);
  });
});

describe('first-mow sheet dismissed flag', () => {
  it('round-trips through storage', async () => {
    expect(await isFirstMowSheetDismissed()).toBe(false);
    await dismissFirstMowSheet();
    expect(await isFirstMowSheetDismissed()).toBe(true);
  });
});

describe('hasLawn', () => {
  it('is true once at least one zone exists', () => {
    expect(hasLawn([zone()])).toBe(true);
    expect(hasLawn([zone(), zone()])).toBe(true);
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
