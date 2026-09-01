import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import LawnHomeScreen from './LawnHomeScreen';
import type { Property, Zone } from '../mow/models';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => cb(),
}));

// prompts.ts (via hasLawn) imports AsyncStorage; use the in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../mow/asyncStorageRepositories', () => ({
  propertyRepository: {
    getOrCreateDefault: jest.fn(),
    updateZone: jest.fn(),
    deleteZone: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { propertyRepository } = require('../mow/asyncStorageRepositories');

const navigation = { navigate: jest.fn() };

function zone(over: Partial<Zone> = {}): Zone {
  return { id: 'z1', name: 'Lawn', vertices: [], areaSqFt: 1000, ...over };
}

function property(zones: Zone[]): Property {
  return { id: 'p1', name: 'My Lawn', createdAt: 0, zones };
}

async function renderLawn(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<LawnHomeScreen navigation={navigation as never} route={{} as never} />);
  });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('LawnHomeScreen — zone list', () => {
  const TWO_ZONES = [
    zone({ id: 'z1', name: 'Front', areaSqFt: 1200 }),
    zone({ id: 'z2', name: 'Back', areaSqFt: 3400 }),
  ];

  it('renders each zone name, its area, and the total', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(property(TWO_ZONES));

    const tree = await renderLawn();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Front');
    expect(json).toContain('Back');

    expect(tree.root.findByProps({ testID: 'zone-area-z1' }).props.children).toBe('1,200 sq ft');
    expect(tree.root.findByProps({ testID: 'zone-area-z2' }).props.children).toBe('3,400 sq ft');
    // Total = 1200 + 3400.
    expect(tree.root.findByProps({ testID: 'lawn-total' }).props.children).toBe('4,600 sq ft');
  });

  it('opens the draw editor for the tapped zone (retrace round-trips zoneId)', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(property(TWO_ZONES));

    const tree = await renderLawn();
    await act(async () => {
      tree.root.findByProps({ testID: 'retrace-z2' }).props.onPress(); // the "Back" zone
    });

    expect(navigation.navigate).toHaveBeenCalledWith('LawnDraw', {
      propertyId: 'p1',
      mode: 'edit',
      zoneId: 'z2',
    });
  });

  it('confirms before deleting a zone, then removes it', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(property(TWO_ZONES));
    propertyRepository.deleteZone.mockResolvedValue(property([TWO_ZONES[0]]));

    const tree = await renderLawn();
    await act(async () => {
      tree.root.findByProps({ testID: 'delete-z2' }).props.onPress(); // delete "Back"
    });

    // A confirm dialog is shown; nothing deleted until the user confirms.
    expect(Alert.alert).toHaveBeenCalled();
    expect(propertyRepository.deleteZone).not.toHaveBeenCalled();

    // Invoke the destructive "Delete" button from the alert.
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void;
    }>;
    await act(async () => {
      buttons.find((b) => b.text === 'Delete')?.onPress?.();
    });
    expect(propertyRepository.deleteZone).toHaveBeenCalledWith('p1', 'z2');
  });

  it('renames a zone via the inline field on end-editing', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(property([zone({ id: 'z1', name: 'Lawn' })]));
    propertyRepository.updateZone.mockResolvedValue(property([zone({ id: 'z1', name: 'Front' })]));

    const tree = await renderLawn();
    const input = tree.root.findByProps({ accessibilityLabel: 'Zone name for Lawn' });
    await act(async () => {
      input.props.onChangeText('Front');
    });
    await act(async () => {
      input.props.onEndEditing();
    });

    expect(propertyRepository.updateZone).toHaveBeenCalledWith('p1', 'z1', { name: 'Front' });
  });

  it('shows the empty "Draw your lawn" state when the last zone is gone', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(property([]));

    const tree = await renderLawn();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Trace your lawn once to unlock');
    expect(json).toContain('Draw your lawn');
    expect(tree.root.findAllByProps({ testID: 'lawn-total' })).toHaveLength(0);
  });
});

describe('LawnHomeScreen — zone grass type', () => {
  it('persists a selected grass type to the zone', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(
      property([zone({ id: 'z1', name: 'Front' })]),
    );
    propertyRepository.updateZone.mockResolvedValue(
      property([zone({ id: 'z1', name: 'Front', grassType: 'Bermuda' })]),
    );

    const tree = await renderLawn();
    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: 'Grass type Bermuda for Front' })
        .props.onPress();
    });

    expect(propertyRepository.updateZone).toHaveBeenCalledWith('p1', 'z1', {
      grassType: 'Bermuda',
    });
  });

  it('clears the grass type when the selected chip is tapped again (deselect)', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(
      property([zone({ id: 'z1', name: 'Front', grassType: 'Zoysia' })]),
    );
    propertyRepository.updateZone.mockResolvedValue(
      property([zone({ id: 'z1', name: 'Front' })]),
    );

    const tree = await renderLawn();
    await act(async () => {
      tree.root
        .findByProps({ accessibilityLabel: 'Grass type Zoysia for Front' })
        .props.onPress();
    });

    expect(propertyRepository.updateZone).toHaveBeenCalledWith('p1', 'z1', {
      grassType: undefined,
    });
  });

  it('shows no grass type selected when the zone has none', async () => {
    propertyRepository.getOrCreateDefault.mockResolvedValue(
      property([zone({ id: 'z1', name: 'Front' })]),
    );

    const tree = await renderLawn();
    const bermuda = tree.root.findByProps({
      accessibilityLabel: 'Grass type Bermuda for Front',
    });
    expect(bermuda.props.accessibilityState).toEqual({ selected: false });
  });
});

describe('LawnHomeScreen — load error', () => {
  it('renders the error state (not an eternal blank) when the read rejects', async () => {
    propertyRepository.getOrCreateDefault.mockRejectedValue(new Error('read failed'));

    const tree = await renderLawn();
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Couldn't load");
    expect(json).toContain('Retry');
  });
});
