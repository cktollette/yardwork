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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Location = require('expo-location');

const DEFAULT_CENTER: Position = [-96.8236, 33.1507];
const FIX: Position = [-97.1, 32.9];

/** The <Camera>'s current controlled target. */
function cameraCenter(tree: ReactTestRenderer): Position {
  return tree.root.findByProps({ zoomLevel: 18.5 }).props.centerCoordinate as Position;
}

/** Drive the map's onCameraChanged with a synthetic gesture / programmatic move. */
function fireCameraChange(tree: ReactTestRenderer, isGestureActive: boolean): void {
  tree.root
    .findByProps({ styleURL: 'satellite' })
    .props.onCameraChanged({ gestures: { isGestureActive } });
}

describe('LawnDrawScreen — late-GPS-fix camera guard (create mode, first zone)', () => {
  // A deferred current-position fix so a "user pan" can be interleaved between
  // mount and the fix resolving.
  let resolveFix: (v: { coords: { longitude: number; latitude: number } }) => void;

  beforeEach(() => {
    // First-ever zone: no property/zones → the effect falls through to GPS.
    propertyRepository.getById.mockResolvedValue(null);
    Location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getLastKnownPositionAsync.mockResolvedValue(null);
    Location.getCurrentPositionAsync.mockReturnValue(
      new Promise((res) => {
        resolveFix = res;
      }),
    );
  });

  it('applies the fix when it resolves before any interaction', async () => {
    const tree = await renderDraw('create');
    expect(cameraCenter(tree)).toEqual(DEFAULT_CENTER); // not yet resolved

    await act(async () => {
      resolveFix({ coords: { longitude: FIX[0], latitude: FIX[1] } });
    });

    expect(cameraCenter(tree)).toEqual(FIX);
  });

  it('discards the fix silently once the user has moved the camera', async () => {
    const tree = await renderDraw('create');

    // User pans/zooms (real gesture) before the fix lands.
    await act(async () => {
      fireCameraChange(tree, true);
    });
    await act(async () => {
      resolveFix({ coords: { longitude: FIX[0], latitude: FIX[1] } });
    });

    // Their framing is untouched — no snap to the late fix.
    expect(cameraCenter(tree)).toEqual(DEFAULT_CENTER);
  });

  it('does NOT trip the guard on a programmatic move (isGestureActive false)', async () => {
    const tree = await renderDraw('create');

    // A programmatic <Camera> write reports the gesture flag false.
    await act(async () => {
      fireCameraChange(tree, false);
    });
    await act(async () => {
      resolveFix({ coords: { longitude: FIX[0], latitude: FIX[1] } });
    });

    // The guard did not defeat itself — the fix still applies.
    expect(cameraCenter(tree)).toEqual(FIX);
  });
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

// Regression guard for the build-10 bug: a finished/closed polygon rendered its
// vertex MarkerViews but no edges, because closing swapped the ShapeSource id
// (line→polygon) and rnmapbox silently drops the layers of a mounted source
// whose id changes. These pin the two invariants that keep it from silently
// dropping again: (1) the closed state renders BOTH the fill and the outline
// over a closed ring; (2) the ShapeSource id never changes across open→closed.
describe('LawnDrawScreen — closed polygon renders edge + fill layers', () => {
  const allSources = (tree: ReactTestRenderer) =>
    tree.root.findAll((n) => String(n.type) === 'ShapeSource');
  // The rnmapbox mock renders each layer as a function component AND the host
  // node it returns — both carry the id, so restrict to host (string-type) nodes.
  const layerById = (tree: ReactTestRenderer, id: string) =>
    tree.root.findAll((n) => typeof n.type === 'string' && n.props?.id === id);

  it('edit/closed state mounts fill + outline over a closed ring (edge-drop pin)', async () => {
    propertyRepository.getById.mockResolvedValue(
      property([{ id: 'z1', name: 'Front', vertices: SQUARE, areaSqFt: 100 }]),
    );

    const tree = await renderDraw('edit', 'z1');

    const sources = allSources(tree);
    expect(sources).toHaveLength(1);

    // Both the fill and the outline are present...
    expect(layerById(tree, 'polygon-fill')).toHaveLength(1);
    expect(layerById(tree, 'polygon-outline')).toHaveLength(1);
    // ...and the fill actually paints (not a transparent no-op) when closed.
    expect(layerById(tree, 'polygon-fill')[0].props.style.fillOpacity).toBeGreaterThan(0);

    // Geometry is a polygon whose ring is closed (last coord repeats the first).
    const geom = sources[0].props.shape.geometry;
    expect(geom.type).toBe('Polygon');
    const ring = geom.coordinates[0];
    expect(ring[ring.length - 1]).toEqual(ring[0]);
  });

  it('keeps the ShapeSource id stable across open→closed (no-teardown pin)', async () => {
    // Create mode, first zone: getById null + denied location → no camera/timer
    // side effects, so the transition is all we exercise.
    propertyRepository.getById.mockResolvedValue(null);

    const tree = await renderDraw('create');
    const map = tree.root.findByProps({ styleURL: 'satellite' });
    const tap = (coordinates: Position) =>
      act(async () => {
        map.props.onPress({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates },
        });
      });

    // Place 3 vertices — enough to close.
    await tap([0, 0]);
    await tap([0.001, 0]);
    await tap([0.001, 0.001]);

    // Open: one source, an OPEN LineString.
    let sources = allSources(tree);
    expect(sources).toHaveLength(1);
    const openId = sources[0].props.id;
    expect(sources[0].props.shape.geometry.type).toBe('LineString');

    // Close the ring.
    await act(async () => {
      tree.root.findByProps({ testID: 'done-lawn' }).props.onPress();
    });

    // SAME source id — the swap that broke build 10 must not recur — now a
    // closed Polygon, with the fill + outline still mounted.
    sources = allSources(tree);
    expect(sources).toHaveLength(1);
    expect(sources[0].props.id).toBe(openId);
    expect(sources[0].props.shape.geometry.type).toBe('Polygon');
    expect(layerById(tree, 'polygon-fill')).toHaveLength(1);
    expect(layerById(tree, 'polygon-outline')).toHaveLength(1);
  });
});
