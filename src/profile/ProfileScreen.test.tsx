import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Mow, Property } from '../mow/models';
import ProfileScreen from './ProfileScreen';

// Run the focus effect once, like a mount effect, without a real navigator.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));
jest.mock('../mow/asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));
jest.mock('../equipment/asyncStorageRepositories', () => ({
  equipmentRepository: { list: jest.fn() },
}));

import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import { equipmentRepository } from '../equipment/asyncStorageRepositories';

const listMows = mowRepository.listMows as jest.Mock;
const getProperty = propertyRepository.getOrCreateDefault as jest.Mock;
const listEquipment = equipmentRepository.list as jest.Mock;

const NOW = Date.parse('2026-07-22T12:00:00Z');
const day = 86_400_000;
const navigate = jest.fn();

const emptyProperty: Property = { id: 'p1', name: 'My Lawn', createdAt: 0, zones: [] };
const seededProperty: Property = {
  id: 'p1',
  name: 'My Lawn',
  createdAt: 0,
  zones: [{ id: 'lawn', name: 'Lawn', vertices: [], areaSqFt: 5000, grassType: 'Fescue' }],
  locationCity: 'Dallas',
  locationRegion: 'Texas',
  locationCountry: 'US',
  hardinessZone: '8a',
};
function mow(overrides: Partial<Mow>): Mow {
  return {
    id: 'm', propertyId: 'p1', startedAt: NOW - 2 * day, endedAt: NOW - 2 * day + 1800_000,
    durationSeconds: 1800, ...overrides,
  };
}

async function render(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<ProfileScreen navigation={{ navigate } as never} route={{} as never} />);
  });
  await act(async () => {});
  return tree;
}
const json = (t: ReactTestRenderer) => JSON.stringify(t.toJSON());
const press = (t: ReactTestRenderer, label: string) =>
  act(() => t.root.findByProps({ accessibilityLabel: label }).props.onPress());

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockImplementation(() => NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('empty install', () => {
  beforeEach(() => {
    getProperty.mockResolvedValue(emptyProperty);
    listMows.mockResolvedValue([]);
    listEquipment.mockResolvedValue([]);
  });

  it('shows the fallback name only, gated hints (never null), and empty subtitles', async () => {
    const t = await render();
    const shown = json(t);
    expect(shown).toContain('My Lawn'); // fallback name
    expect(shown).toContain('Add location'); // discoverable placeholder row
    expect(shown).not.toContain('"Edit"'); // no edit affordance when there's no line
    // Distance is gated (no activity): an unlock hint replaces the ring, so the
    // gate is proven by the hint's presence and the absence of a distance ring
    // (a raw null would surface as a "miles" ring with an empty/null value).
    expect(shown).toContain('Mow with your phone or watch on you to track distance.');
    expect(shown).not.toContain('miles'); // no distance ring
    // Empty-state section subtitles.
    expect(shown).toContain('No lawn drawn yet');
    expect(shown).toContain('Garage is empty');
    // "No mows yet" appears for both Statistics and Mows rows.
    expect(shown).toContain('No mows yet');
  });

  it('the placeholder row opens the location sheet', async () => {
    const t = await render();
    expect(json(t)).not.toContain('City'); // sheet closed
    press(t, 'Edit location');
    expect(json(t)).toContain('City'); // sheet opened
  });
});

describe('seeded', () => {
  beforeEach(() => {
    getProperty.mockResolvedValue(seededProperty);
    listMows.mockResolvedValue([
      mow({ id: 'm1', startedAt: NOW - 2 * day, activity: { steps: 2000, distanceMi: 0.9, capturedAt: 'x' } }),
      mow({ id: 'm2', startedAt: NOW - 9 * day, durationSeconds: 3600 }),
    ]);
    listEquipment.mockResolvedValue([{}, {}, {}]);
  });

  it('renders the location line, stats (incl. distance), and live subtitles', async () => {
    const t = await render();
    const shown = json(t);
    expect(shown).toContain('Dallas, Texas - Zone 8a - Fescue'); // header line
    expect(shown).toContain('"Edit"'); // trailing edit affordance on the line
    expect(shown).toContain('miles'); // distance ring present
    expect(shown).not.toContain('Mow with your phone'); // hint gone
    expect(shown).toContain('2 mows - '); // Statistics subtitle
    expect(shown).toContain('Last mow: 2 days ago'); // Mows subtitle
    expect(shown).toContain('1 zone - 5,000 sq ft'); // My Lawn subtitle
    expect(shown).toContain('3 pieces'); // Garage subtitle
  });

  it('rows navigate to the right routes (Statistics is not orphaned)', async () => {
    const t = await render();
    press(t, 'Statistics');
    expect(navigate).toHaveBeenCalledWith('Statistics');
    press(t, 'Mows');
    expect(navigate).toHaveBeenCalledWith('Log');
    press(t, 'My Lawn');
    expect(navigate).toHaveBeenCalledWith('Lawn');
    press(t, 'Garage');
    expect(navigate).toHaveBeenCalledWith('Garage');
  });

  it('tapping the location line (with its Edit affordance) opens the sheet', async () => {
    const t = await render();
    expect(json(t)).not.toContain('City');
    press(t, 'Edit location');
    expect(json(t)).toContain('City');
  });
});
