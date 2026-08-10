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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository, propertyRepository } = require('./asyncStorageRepositories');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { isThirdMowPromptDismissed } = require('../lawn/prompts');

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
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <SaveMowScreen
        navigation={navigation as never}
        route={{ params: { draft: draft(durationSeconds) } } as never}
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
  mowRepository.saveMow.mockResolvedValue(undefined);
  propertyRepository.getOrCreateDefault.mockResolvedValue({ id: 'prop-1', boundary: null });
  isThirdMowPromptDismissed.mockResolvedValue(true);
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
});
