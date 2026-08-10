import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Equipment } from '../equipment/models';
import MowDetailScreen from './MowDetailScreen';
import type { Mow } from './models';

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { getMowById: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));
jest.mock('../equipment/asyncStorageRepositories', () => ({
  equipmentRepository: { list: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository } = require('./asyncStorageRepositories');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { equipmentRepository } = require('../equipment/asyncStorageRepositories');

const navigation = { setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };

function eq(id: string, overrides: Partial<Equipment> = {}): Equipment {
  return {
    id,
    type: 'trimmer',
    brand: 'Stihl',
    model: 'FS 56',
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

beforeEach(() => jest.clearAllMocks());

describe('MowDetailScreen — dangling tools footnote', () => {
  it('renders the muted footnote with the right count and omits removed tools', async () => {
    // Mow logged one live tool + two since-deleted ones.
    mowRepository.getMowById.mockResolvedValue(
      mow({ equipmentIds: ['trimmer-1', 'gone-a', 'gone-b'] }),
    );
    equipmentRepository.list.mockResolvedValue([eq('trimmer-1')]);

    const tree = await renderDetail();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('2 tools no longer in your garage');
    // The live tool's chip is still selectable by name.
    expect(json).toContain('Stihl FS 56');
    // No named row is invented for the removed tools.
    expect(json).not.toContain('gone-a');
  });

  it('singularizes the footnote for a single missing tool', async () => {
    mowRepository.getMowById.mockResolvedValue(
      mow({ equipmentIds: ['trimmer-1', 'gone-a'] }),
    );
    equipmentRepository.list.mockResolvedValue([eq('trimmer-1')]);

    const tree = await renderDetail();
    expect(JSON.stringify(tree.toJSON())).toContain('1 tool no longer in your garage');
  });

  it('shows no footnote when nothing dangles', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ equipmentIds: ['trimmer-1'] }));
    equipmentRepository.list.mockResolvedValue([eq('trimmer-1')]);

    const tree = await renderDetail();
    expect(JSON.stringify(tree.toJSON())).not.toContain('no longer in your garage');
  });
});
