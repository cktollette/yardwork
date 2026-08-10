import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Equipment } from '../equipment/models';
import MowListScreen from './MowListScreen';
import type { Mow } from './models';

// Focus effect runs the callback immediately in tests; stub it to just invoke.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
}));

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn() },
}));
jest.mock('../equipment/asyncStorageRepositories', () => ({
  equipmentRepository: { list: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository } = require('./asyncStorageRepositories');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { equipmentRepository } = require('../equipment/asyncStorageRepositories');

const navigation = { navigate: jest.fn() };

function eq(id: string, overrides: Partial<Equipment> = {}): Equipment {
  return {
    id,
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    catalogId: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

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

describe('MowListScreen — tool indicators with dangling ids', () => {
  it('renders only badges for resolvable tools and does not crash on a dangling id', async () => {
    mowRepository.listMows.mockResolvedValue([
      // References a live trimmer and a since-deleted mower id.
      mow({ equipmentIds: ['trimmer-1', 'deleted-mower'] }),
    ]);
    equipmentRepository.list.mockResolvedValue([
      eq('trimmer-1', { type: 'trimmer', brand: 'Stihl', model: 'FS 56' }),
    ]);

    const tree = await renderList();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Trim'); // resolvable trimmer badge
    expect(json).not.toContain('Mow'); // dangling mower id contributes nothing
  });

  it('shows no tool badges when a mow logged no tools', async () => {
    mowRepository.listMows.mockResolvedValue([mow({ equipmentIds: undefined })]);
    equipmentRepository.list.mockResolvedValue([]);

    const tree = await renderList();
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain('Trim');
    expect(json).not.toContain('Mow');
  });
});
