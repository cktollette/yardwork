import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import GarageScreen from './GarageScreen';

// Run the focus effect once, like a mount effect.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const React = require('react');
    React.useEffect(cb, []);
  },
}));
jest.mock('./asyncStorageRepositories', () => ({
  equipmentRepository: { list: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { equipmentRepository } = require('./asyncStorageRepositories');

const navigation = { navigate: jest.fn() };

async function renderGarage(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<GarageScreen navigation={navigation as never} route={{} as never} />);
  });
  await act(async () => {});
  return tree;
}

beforeEach(() => jest.clearAllMocks());

describe('GarageScreen', () => {
  it('renders the empty state when there is no equipment', async () => {
    equipmentRepository.list.mockResolvedValue([]);

    const json = JSON.stringify((await renderGarage()).toJSON());
    expect(json).toContain('No equipment yet');
  });

  it('renders the error state (not an eternal blank) when the read rejects', async () => {
    equipmentRepository.list.mockRejectedValue(new Error('read failed'));

    const json = JSON.stringify((await renderGarage()).toJSON());
    expect(json).toContain("Couldn't load");
    expect(json).toContain('Retry');
  });
});
