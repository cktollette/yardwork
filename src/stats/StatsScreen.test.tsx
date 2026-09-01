import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Mow, Property } from '../mow/models';
import StatsScreen from './StatsScreen';

// Run the focus effect once, like a mount effect. (Stats' loader builds a fresh
// object in .then(), so a run-every-render `(cb) => cb()` mock would loop.)
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    React.useEffect(cb, []);
  },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../mow/asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository, propertyRepository } = require('../mow/asyncStorageRepositories');

const navigation = { navigate: jest.fn() };
const PROPERTY: Property = { id: 'p1', name: 'My Lawn', createdAt: 0, zones: [] };
function mow(over: Partial<Mow> = {}): Mow {
  return {
    id: 'm1',
    propertyId: 'p1',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_000_000 + 1_800_000,
    durationSeconds: 1800,
    ...over,
  };
}

async function renderStats(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<StatsScreen navigation={navigation as never} route={{} as never} />);
  });
  await act(async () => {});
  return tree;
}

beforeEach(() => jest.clearAllMocks());

describe('StatsScreen', () => {
  it('renders the lifetime section when data loads', async () => {
    mowRepository.listMows.mockResolvedValue([mow()]);
    propertyRepository.getOrCreateDefault.mockResolvedValue(PROPERTY);

    const json = JSON.stringify((await renderStats()).toJSON());
    expect(json).toContain('Lifetime');
    expect(json).toContain('Mows');
  });

  it('renders the error state (not an eternal blank) when a read rejects', async () => {
    mowRepository.listMows.mockRejectedValue(new Error('read failed'));
    propertyRepository.getOrCreateDefault.mockResolvedValue(PROPERTY);

    const json = JSON.stringify((await renderStats()).toJSON());
    expect(json).toContain("Couldn't load");
    expect(json).toContain('Retry');
  });
});
