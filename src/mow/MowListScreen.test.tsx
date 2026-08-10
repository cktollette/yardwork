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
