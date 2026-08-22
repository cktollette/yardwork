import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SaveMowScreen from './SaveMowScreen';
import type { DraftMow } from './timer';

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn(), saveMow: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));

// The third-mow "trace your lawn" nudge is unrelated to this feature; stub it
// so shouldPromptAfterMow never fires and save follows the plain navigate path.
jest.mock('../lawn/prompts', () => ({
  hasLawn: jest.fn(() => false),
  isThirdMowPromptDismissed: jest.fn(),
  dismissThirdMowPrompt: jest.fn(),
  shouldPromptAfterMow: jest.fn(() => false),
}));

// Weather + activity capture are fire-and-forget; mock them so we can assert
// the save never awaits either (and never touches HealthKit / network / the
// repository from this screen).
jest.mock('../weather/captureWeatherForMow', () => ({ captureWeatherForMow: jest.fn() }));
jest.mock('../activity/captureActivityForMow', () => ({ captureActivityForMow: jest.fn() }));

// PhotoSlots is exercised in its own test; here mock it to a prop-carrying host
// element so we can drive onChange and assert what the save payload includes.
jest.mock('./PhotoSlots', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  default: (props: Record<string, unknown>) => require('react').createElement('PhotoSlots', props),
}));
// ZonePicker → prop-carrying host so we can drive onToggle / read selectedIds.
jest.mock('./ZonePicker', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  default: (props: Record<string, unknown>) => require('react').createElement('ZonePicker', props),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository, propertyRepository } = require('./asyncStorageRepositories');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isThirdMowPromptDismissed } = require('../lawn/prompts');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { captureWeatherForMow } = require('../weather/captureWeatherForMow');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { captureActivityForMow } = require('../activity/captureActivityForMow');

const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() };

const STARTED_AT = Date.parse('2026-07-20T10:00:00Z');

function draft(durationSeconds: number): DraftMow {
  return {
    startedAt: STARTED_AT,
    endedAt: STARTED_AT + durationSeconds * 1000,
    durationSeconds,
  };
}

async function renderSave(durationSeconds: number): Promise<ReactTestRenderer> {
  return renderSaveWith(draft(durationSeconds));
}

async function renderSaveWith(d: DraftMow): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <SaveMowScreen
        navigation={navigation as never}
        route={{ params: { draft: d } } as never}
      />,
    );
  });
  return tree;
}

async function pressSave(tree: ReactTestRenderer): Promise<void> {
  await act(async () => {
    tree.root.findByProps({ label: 'Save' }).props.onPress();
  });
}

/** Invoke the onPress of an Alert button by its text, from the latest alert. */
async function pressAlertButton(text: string): Promise<void> {
  const spy = Alert.alert as jest.Mock;
  const buttons = spy.mock.calls[spy.mock.calls.length - 1][2] as Array<{
    text: string;
    onPress?: () => void;
  }>;
  const button = buttons.find((b) => b.text === text);
  if (!button) throw new Error(`No alert button labelled "${text}"`);
  await act(async () => {
    button.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mowRepository.listMows.mockResolvedValue([]);
  // Echo the saved payload back with an id, so `saved` carries the timer window.
  mowRepository.saveMow.mockImplementation(async (input: object) => ({ ...input, id: 'mow-1' }));
  propertyRepository.getOrCreateDefault.mockResolvedValue({ id: 'prop-1', zones: [] });
  isThirdMowPromptDismissed.mockResolvedValue(true);
  captureWeatherForMow.mockResolvedValue(undefined);
  captureActivityForMow.mockResolvedValue(undefined);
});

describe('SaveMowScreen — short-mow confirmation', () => {
  it('prompts and does not save yet when the mow is under the floor', async () => {
    const tree = await renderSave(120);
    await pressSave(tree);

    expect(Alert.alert).toHaveBeenCalled();
    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toContain('That was quick');
    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toContain('2m 0s');
    expect(mowRepository.saveMow).not.toHaveBeenCalled();
  });

  it('"Save anyway" persists the same payload a normal save would', async () => {
    const tree = await renderSave(120);
    await pressSave(tree);
    await pressAlertButton('Save anyway');

    expect(mowRepository.saveMow).toHaveBeenCalledTimes(1);
    expect(mowRepository.saveMow).toHaveBeenCalledWith({
      propertyId: 'prop-1',
      startedAt: STARTED_AT,
      endedAt: STARTED_AT + 120 * 1000,
      durationSeconds: 120,
    });
  });

  it('"Discard" persists nothing and pops the screen', async () => {
    const tree = await renderSave(120);
    await pressSave(tree);
    await pressAlertButton('Discard');

    expect(mowRepository.saveMow).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('saves with no dialog at exactly the floor', async () => {
    const tree = await renderSave(180);
    await pressSave(tree);

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mowRepository.saveMow).toHaveBeenCalledTimes(1);
    expect(mowRepository.saveMow).toHaveBeenCalledWith(
      expect.objectContaining({ durationSeconds: 180 }),
    );
  });

  it('uses the mostly-paused copy for a long, mostly-paused mow', async () => {
    const tree = await renderSaveWith({
      startedAt: STARTED_AT,
      endedAt: STARTED_AT + 1200 * 1000, // 20 min wall-clock
      durationSeconds: 150, // only 2.5 min active
    });
    await pressSave(tree);

    expect((Alert.alert as jest.Mock).mock.calls[0][0]).toBe(
      'You were paused for most of this one. Save 2 minutes of mowing?',
    );
    expect(mowRepository.saveMow).not.toHaveBeenCalled();
  });
});

describe('SaveMowScreen — clippings bags (seed-on-tap, no auto-fill)', () => {
  async function tapAddBags(tree: ReactTestRenderer): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' }).props.onPress();
    });
  }

  function savedPayload(): Record<string, unknown> {
    return (mowRepository.saveMow as jest.Mock).mock.calls[0][0];
  }

  it('starts unset even when the last mow recorded bags; saving without tapping omits it', async () => {
    mowRepository.listMows.mockResolvedValue([{ id: 'm0', clippingBags: 5 }]);
    const tree = await renderSave(600);

    // The field shows the "Add bags" affordance, not a pre-filled stepper.
    expect(tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' })).toBeTruthy();
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Increase clippings bags' })).toHaveLength(0);

    await pressSave(tree);
    expect('clippingBags' in savedPayload()).toBe(false);
  });

  it('seeds the last-entered count on tap and saves it', async () => {
    mowRepository.listMows.mockResolvedValue([{ id: 'm0', clippingBags: 5 }]);
    const tree = await renderSave(600);

    await tapAddBags(tree);
    await pressSave(tree);

    expect(savedPayload()).toEqual(expect.objectContaining({ clippingBags: 5 }));
  });

  it('seeds 0 on tap when the last mow recorded 0 (a real value, not unset)', async () => {
    mowRepository.listMows.mockResolvedValue([{ id: 'm0', clippingBags: 0 }]);
    const tree = await renderSave(600);

    await tapAddBags(tree);
    await pressSave(tree);

    const payload = savedPayload();
    expect('clippingBags' in payload).toBe(true);
    expect(payload.clippingBags).toBe(0);
  });

  it('seeds the default (1) on tap when there is no history', async () => {
    mowRepository.listMows.mockResolvedValue([]);
    const tree = await renderSave(600);

    await tapAddBags(tree);
    await pressSave(tree);

    expect(savedPayload()).toEqual(expect.objectContaining({ clippingBags: 1 }));
  });
});

describe('SaveMowScreen — before/after photos', () => {
  function setPhoto(tree: ReactTestRenderer, slot: 'before' | 'after', uri: string | undefined): void {
    act(() => {
      tree.root.findByType('PhotoSlots' as never).props.onChange(slot, uri);
    });
  }
  function savedPayload(): Record<string, unknown> {
    return (mowRepository.saveMow as jest.Mock).mock.calls[0][0];
  }

  it('passes picked photo URIs into the save payload', async () => {
    const tree = await renderSave(600);
    setPhoto(tree, 'before', 'file:///tmp/before.jpg');
    setPhoto(tree, 'after', 'file:///tmp/after.jpg');
    await pressSave(tree);

    expect(savedPayload()).toEqual(
      expect.objectContaining({
        beforePhotoUri: 'file:///tmp/before.jpg',
        afterPhotoUri: 'file:///tmp/after.jpg',
      }),
    );
  });

  it('omits both photo keys when no photo was added', async () => {
    const tree = await renderSave(600);
    await pressSave(tree);

    const payload = savedPayload();
    expect('beforePhotoUri' in payload).toBe(false);
    expect('afterPhotoUri' in payload).toBe(false);
  });
});

describe('SaveMowScreen — zone coverage', () => {
  const TWO_ZONES = { id: 'prop-1', zones: [{ id: 'z1', name: 'Front' }, { id: 'z2', name: 'Back' }] };
  const zonePicker = (tree: ReactTestRenderer) => tree.root.findByType('ZonePicker' as never);
  function savedPayload(): Record<string, unknown> {
    return (mowRepository.saveMow as jest.Mock).mock.calls[0][0];
  }

  it('shows the selector for a multi-zone lawn, all selected by default', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(TWO_ZONES);
    const tree = await renderSave(600);
    expect(zonePicker(tree).props.selectedIds).toEqual(['z1', 'z2']);
  });

  it('does not show the selector for a single-zone lawn', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue({ id: 'prop-1', zones: [{ id: 'z1', name: 'Front' }] });
    const tree = await renderSave(600);
    expect(tree.root.findAllByType('ZonePicker' as never)).toHaveLength(0);
  });

  it('omits zoneIds when all zones are selected (whole lawn = absent)', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(TWO_ZONES);
    const tree = await renderSave(600);
    await pressSave(tree);
    expect('zoneIds' in savedPayload()).toBe(false);
  });

  it('stores the subset when the user deselects a zone', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(TWO_ZONES);
    const tree = await renderSave(600);
    act(() => zonePicker(tree).props.onToggle('z1')); // deselect z1 → [z2]
    await pressSave(tree);
    expect(savedPayload()).toEqual(expect.objectContaining({ zoneIds: ['z2'] }));
  });
});

describe('SaveMowScreen — best-effort weather capture', () => {
  it('fires capture with the saved mow id after a successful save', async () => {
    const tree = await renderSave(600);
    await pressSave(tree);

    expect(mowRepository.saveMow).toHaveBeenCalledTimes(1);
    expect(captureWeatherForMow).toHaveBeenCalledWith('mow-1');
  });

  it('completes the save without awaiting capture (zero coupling)', async () => {
    // Capture that never resolves must not stall or fail the save.
    captureWeatherForMow.mockReturnValue(new Promise(() => {}));

    const tree = await renderSave(600);
    await pressSave(tree);

    // Save still finished and navigated on, despite capture hanging forever.
    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', { screen: 'Log' });
  });
});

describe('SaveMowScreen — best-effort activity capture', () => {
  it('fires activity capture with the saved mow (window included) after save', async () => {
    const tree = await renderSave(600);
    await pressSave(tree);

    expect(captureActivityForMow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mow-1',
        startedAt: STARTED_AT,
        endedAt: STARTED_AT + 600 * 1000,
      }),
    );
  });

  it('fires weather and activity from one save without interfering', async () => {
    const tree = await renderSave(600);
    await pressSave(tree);

    expect(captureWeatherForMow).toHaveBeenCalledTimes(1);
    expect(captureActivityForMow).toHaveBeenCalledTimes(1);
  });

  it('completes the save without awaiting activity capture (zero coupling)', async () => {
    captureActivityForMow.mockReturnValue(new Promise(() => {}));

    const tree = await renderSave(600);
    await pressSave(tree);

    expect(navigation.navigate).toHaveBeenCalledWith('Tabs', { screen: 'Log' });
  });
});
