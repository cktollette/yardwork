import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MowDetailScreen from './MowDetailScreen';
import type { Mow } from './models';
import type { Weather } from '../weather/WeatherService';

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { getMowById: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository } = require('./asyncStorageRepositories');

const navigation = { setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };

function mow(overrides: Partial<Mow> = {}): Mow {
  const startedAt = Date.parse('2026-07-20T10:00:00Z');
  return {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 2400 * 1000,
    durationSeconds: 2400,
    ...overrides,
  };
}

async function renderDetail(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <MowDetailScreen
        navigation={navigation as never}
        route={{ params: { mowId: 'mow-1' } } as never}
      />,
    );
  });
  return tree;
}

function checked(tree: ReactTestRenderer, label: string): boolean {
  return tree.root.findByProps({ accessibilityLabel: label }).props.accessibilityState
    .checked;
}

beforeEach(() => {
  jest.clearAllMocks();
  mowRepository.update.mockResolvedValue(undefined);
});

describe('MowDetailScreen — tool picker wiring', () => {
  it("seeds the picker from the mow's own toolTypes", async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ toolTypes: ['mower', 'edger'] }));

    const tree = await renderDetail();
    expect(checked(tree, 'Mow')).toBe(true);
    expect(checked(tree, 'Edge')).toBe(true);
    expect(checked(tree, 'Trim')).toBe(false);
    expect(checked(tree, 'Blow')).toBe(false);
  });

  it('produces no patch when the selection is unchanged', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ toolTypes: ['mower'] }));

    const tree = await renderDetail();
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // Nothing changed → no write, just navigate back.
    expect(mowRepository.update).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });
});

const WEATHER: Weather = {
  tempF: 94,
  condition: 'Clear',
  humidity: 40,
  capturedAt: '2026-08-10T15:00:00.000Z',
};

function weatherLine(tree: ReactTestRenderer): string | null {
  const nodes = tree.root.findAllByProps({ testID: 'mow-weather' });
  return nodes.length === 0 ? null : (nodes[0].props.children as string);
}

describe('MowDetailScreen — weather display', () => {
  it('renders the weather line when the mow has weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ weather: WEATHER }));

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBe('94°F · Clear');
  });

  it('renders nothing when the mow has no weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow());

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBeNull();
  });

  it('still shows weather after an edit, and the edit patch never carries weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ weather: WEATHER }));

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBe('94°F · Clear');

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('nice');
    });
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // The edit sends only notes — weather is never part of an edit patch.
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'nice' });
    const patch = mowRepository.update.mock.calls[0][1];
    expect(patch).not.toHaveProperty('weather');
    // The line was still on screen right up to the save.
    expect(weatherLine(tree)).toBe('94°F · Clear');
  });
});

describe('MowDetailScreen — short-mow guard does not apply to edits', () => {
  it('saves a 30-second edit with no confirmation dialog', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const startedAt = Date.parse('2026-07-20T10:00:00Z');
    mowRepository.getMowById.mockResolvedValue(
      mow({ startedAt, endedAt: startedAt + 30 * 1000, durationSeconds: 30 }),
    );

    const tree = await renderDetail();
    // Touch the notes so the save produces a real patch.
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('great');
    });
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // The sub-floor duration must not trigger the timer-flow confirmation.
    expect(alert).not.toHaveBeenCalled();
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'great' });
    alert.mockRestore();
  });
});
