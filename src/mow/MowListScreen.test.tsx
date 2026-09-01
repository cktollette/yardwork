import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MowListScreen from './MowListScreen';
import type { Mow } from './models';

// Focus effect runs the callback immediately in tests; stub it to just invoke.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
}));

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository } = require('./asyncStorageRepositories');

const navigation = { navigate: jest.fn() };

function mow(overrides: Partial<Mow> = {}): Mow {
  return {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_000_000 + 2400 * 1000,
    durationSeconds: 2400,
    ...overrides,
  };
}

async function renderList(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<MowListScreen navigation={navigation as never} route={{} as never} />);
  });
  return tree;
}

beforeEach(() => jest.clearAllMocks());

describe('MowListScreen — captured temperature', () => {
  const WEATHER = { tempF: 72, condition: 'Clear', humidity: 40, capturedAt: 'x' };

  it('renders the captured temperature on the card when weather is present', async () => {
    mowRepository.listMows.mockResolvedValue([mow({ weather: WEATHER })]);

    const tree = await renderList();
    // The chip is present AND shows the actual value.
    expect(tree.root.findByProps({ testID: 'mow-temp' })).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).toContain('72°F');
  });

  it('omits the temperature entirely when the mow has no weather', async () => {
    mowRepository.listMows.mockResolvedValue([mow({ weather: undefined })]);

    const tree = await renderList();
    // No chip, no placeholder, no stray unit.
    expect(tree.root.findAllByProps({ testID: 'mow-temp' })).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).not.toContain('°F');
  });
});

describe('MowListScreen — job-type badges', () => {
  it('renders a badge per job type recorded on the mow', async () => {
    mowRepository.listMows.mockResolvedValue([mow({ toolTypes: ['mower', 'blower'] })]);

    const tree = await renderList();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Mow');
    expect(json).toContain('Blow');
    expect(json).not.toContain('Trim'); // not recorded
  });

  it('shows no badges when a mow recorded no tools', async () => {
    mowRepository.listMows.mockResolvedValue([mow({ toolTypes: undefined })]);

    const tree = await renderList();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('Trim');
    expect(json).not.toContain('Blow');
  });
});

describe('MowListScreen — load error', () => {
  it('renders the error state (not an eternal blank) when the read rejects', async () => {
    mowRepository.listMows.mockRejectedValue(new Error('read failed'));

    const tree = await renderList();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Couldn't load");
    expect(json).toContain('Retry');
  });
});
