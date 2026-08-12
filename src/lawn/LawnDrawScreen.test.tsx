import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import LawnDrawScreen from './LawnDrawScreen';
import type { Property, Position, Zone } from '../mow/models';

// Native modules are stubbed — this test exercises the load/save SEAMS
// (zone-parameterized I/O), not the gesture layer.
jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const passthrough = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children as never);
  return {
    __esModule: true,
    default: { setAccessToken: jest.fn(), StyleURL: { Satellite: 'satellite' } },
    MapView: passthrough('MapView'),
    Camera: passthrough('Camera'),
    ShapeSource: passthrough('ShapeSource'),
    FillLayer: passthrough('FillLayer'),
    LineLayer: passthrough('LineLayer'),
    MarkerView: passthrough('MarkerView'),
  };
});
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getLastKnownPositionAsync: jest.fn().mockResolvedValue(null),
  getCurrentPositionAsync: jest.fn().mockResolvedValue(null),
  Accuracy: { Balanced: 3 },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../mow/asyncStorageRepositories', () => ({
  propertyRepository: {
    getById: jest.fn(),
    addZone: jest.fn(),
    updateZone: jest.fn(),
    deleteZone: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { propertyRepository } = require('../mow/asyncStorageRepositories');

const SQUARE: Position[] = [
  [0, 0],
  [0.001, 0],
  [0.001, 0.001],
  [0, 0.001],
];

function property(zones: Zone[]): Property {
  return { id: 'p1', name: 'My Lawn', createdAt: 0, zones };
}

const navigation = { goBack: jest.fn(), setOptions: jest.fn() };

async function renderDraw(mode: 'create' | 'edit', zoneId?: string): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <LawnDrawScreen
        navigation={navigation as never}
        route={{ params: { propertyId: 'p1', mode, zoneId } } as never}
      />,
    );
  });
  // Flush the preload/location effects.
  await act(async () => {});
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  propertyRepository.updateZone.mockResolvedValue(property([]));
  propertyRepository.addZone.mockResolvedValue(property([]));
});

describe('LawnDrawScreen — per-zone I/O seam', () => {
  it('edit mode loads the targeted zone and Save writes back to THAT zone only', async () => {
    const zone: Zone = { id: 'z2', name: 'Back', vertices: SQUARE, areaSqFt: 500 };
    propertyRepository.getById.mockResolvedValue(
      property([{ id: 'z1', name: 'Front', vertices: [], areaSqFt: 100 }, zone]),
    );

    const tree = await renderDraw('edit', 'z2');

    await act(async () => {
      tree.root.findByProps({ testID: 'save-lawn' }).props.onPress();
    });

    // Wrote the loaded zone's vertices back to z2 — not addZone, not z1.
    expect(propertyRepository.updateZone).toHaveBeenCalledWith('p1', 'z2', { vertices: SQUARE });
    expect(propertyRepository.addZone).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('loads by id from the property (round-trips zoneId to getById)', async () => {
    propertyRepository.getById.mockResolvedValue(
      property([{ id: 'z9', name: 'Side', vertices: SQUARE, areaSqFt: 300 }]),
    );

    await renderDraw('edit', 'z9');

    expect(propertyRepository.getById).toHaveBeenCalledWith('p1');
  });
});
