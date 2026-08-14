import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MowDetailScreen from './MowDetailScreen';
import { formatDateField, formatTimeField } from './datetimeField';
import type { Mow } from './models';
import type { Weather } from '../weather/WeatherService';
import type { Activity } from '../activity/ActivityService';

jest.mock('./asyncStorageRepositories', () => ({
  mowRepository: { getMowById: jest.fn(), update: jest.fn(), delete: jest.fn() },
  propertyRepository: { getById: jest.fn() },
}));

// ZonePicker is exercised in its own test; mock it to a prop-carrying host so
// we can read what it was seeded with (selectedIds) and drive onToggle.
jest.mock('./ZonePicker', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    require('react').createElement('ZonePicker', props),
}));

// Native picker → a findable host element that just carries its props (onChange,
// value, testID), so tests can drive onChange directly.
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      React.createElement('DateTimePicker', props),
  };
});

// PhotoSlots is exercised in its own test; mock it to a prop-carrying host
// element so we can read what it was seeded with and drive onChange.
jest.mock('./PhotoSlots', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    require('react').createElement('PhotoSlots', props),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { mowRepository, propertyRepository } = require('./asyncStorageRepositories');

const navigation = { setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };

function mow(overrides: Partial<Mow> = {}): Mow {
  const startedAt = Date.parse('2026-07-20T10:00:00Z');
  return {
    id: 'mow-1',
    propertyId: 'prop-1',
    startedAt,
    endedAt: startedAt + 2400 * 1000,
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

function checked(tree: ReactTestRenderer, label: string): boolean {
  return tree.root.findByProps({ accessibilityLabel: label }).props.accessibilityState
    .checked;
}

beforeEach(() => {
  jest.clearAllMocks();
  mowRepository.update.mockResolvedValue(undefined);
  // Default: a single-zone lawn → no zone selector (existing tests unaffected).
  propertyRepository.getById.mockResolvedValue({ id: 'prop-1', zones: [{ id: 'lawn', name: 'Lawn' }] });
});

describe('MowDetailScreen — tool picker wiring', () => {
  it("seeds the picker from the mow's own toolTypes", async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ toolTypes: ['mower', 'edger'] }));

    const tree = await renderDetail();
    expect(checked(tree, 'Mow')).toBe(true);
    expect(checked(tree, 'Edge')).toBe(true);
    expect(checked(tree, 'Trim')).toBe(false);
    expect(checked(tree, 'Blow')).toBe(false);
  });

  it('produces no patch when the selection is unchanged', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ toolTypes: ['mower'] }));

    const tree = await renderDetail();
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // Nothing changed → no write, just navigate back.
    expect(mowRepository.update).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });
});

describe('MowDetailScreen — zone coverage wiring', () => {
  const TWO_ZONES = { id: 'prop-1', zones: [{ id: 'z1', name: 'Front' }, { id: 'z2', name: 'Back' }] };
  async function saveChanges(tree: ReactTestRenderer): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });
  }
  const zonePicker = (tree: ReactTestRenderer) => tree.root.findByType('ZonePicker' as never);

  it('does not render the selector for a single-zone lawn', async () => {
    propertyRepository.getById.mockResolvedValue({ id: 'prop-1', zones: [{ id: 'z1', name: 'Front' }] });
    mowRepository.getMowById.mockResolvedValue(mow());
    const tree = await renderDetail();
    expect(tree.root.findAllByType('ZonePicker' as never)).toHaveLength(0);
  });

  it('seeds all zones for a whole-lawn mow (absent zoneIds)', async () => {
    propertyRepository.getById.mockResolvedValue(TWO_ZONES);
    mowRepository.getMowById.mockResolvedValue(mow({ zoneIds: undefined }));
    const tree = await renderDetail();
    expect(zonePicker(tree).props.selectedIds).toEqual(['z1', 'z2']);
  });

  it('seeds the stored subset for a partial mow', async () => {
    propertyRepository.getById.mockResolvedValue(TWO_ZONES);
    mowRepository.getMowById.mockResolvedValue(mow({ zoneIds: ['z2'] }));
    const tree = await renderDetail();
    expect(zonePicker(tree).props.selectedIds).toEqual(['z2']);
  });

  it('writes the collapsed selection only after the user interacts', async () => {
    propertyRepository.getById.mockResolvedValue(TWO_ZONES);
    mowRepository.getMowById.mockResolvedValue(mow({ zoneIds: undefined })); // all selected
    const tree = await renderDetail();
    act(() => zonePicker(tree).props.onToggle('z1')); // deselect z1 → subset [z2]
    await saveChanges(tree);
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { zoneIds: ['z2'] });
  });

  it('collapses an all-zones selection back to absent (undefined) in the patch', async () => {
    propertyRepository.getById.mockResolvedValue(TWO_ZONES);
    mowRepository.getMowById.mockResolvedValue(mow({ zoneIds: ['z1'] })); // partial
    const tree = await renderDetail();
    act(() => zonePicker(tree).props.onToggle('z2')); // now z1+z2 = all
    await saveChanges(tree);
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { zoneIds: undefined });
  });

  // The amendment: a mow referencing a since-deleted zone, edited on an unrelated
  // field with the picker UNtouched, must leave zoneIds byte-identical. The
  // tolerant seed drops the deleted ref, so a seeded-vs-stored diff would wrongly
  // rewrite it — the dirty flag prevents that. Tolerance is read-time only.
  it('never rewrites zoneIds when the picker is untouched (deleted-zone reference preserved)', async () => {
    propertyRepository.getById.mockResolvedValue(TWO_ZONES);
    // Stored zoneIds reference 'gone', a zone no longer in the property.
    mowRepository.getMowById.mockResolvedValue(mow({ zoneIds: ['z1', 'gone'] }));
    const tree = await renderDetail();
    // Edit an UNRELATED field; do NOT touch the zone picker.
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('unrelated');
    });
    await saveChanges(tree);

    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'unrelated' });
    // zoneIds is NOT in the patch → stored value (incl. the 'gone' ref) untouched.
    expect(mowRepository.update.mock.calls[0][1]).not.toHaveProperty('zoneIds');
  });
});

describe('MowDetailScreen — before/after photo wiring', () => {
  async function saveChanges(tree: ReactTestRenderer): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });
  }
  function setPhoto(tree: ReactTestRenderer, slot: 'before' | 'after', uri: string | undefined): void {
    act(() => {
      tree.root.findByType('PhotoSlots' as never).props.onChange(slot, uri);
    });
  }
  function patch(): Record<string, unknown> {
    return mowRepository.update.mock.calls[0][1];
  }

  it("seeds the slots from the mow's stored URIs", async () => {
    mowRepository.getMowById.mockResolvedValue(
      mow({ beforePhotoUri: 'file:///app/b.jpg', afterPhotoUri: 'file:///app/a.jpg' }),
    );
    const tree = await renderDetail();
    const slots = tree.root.findByType('PhotoSlots' as never);
    expect(slots.props.before).toBe('file:///app/b.jpg');
    expect(slots.props.after).toBe('file:///app/a.jpg');
  });

  it('sends a replacing temp URI in the patch', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ beforePhotoUri: 'file:///app/b.jpg' }));
    const tree = await renderDetail();
    setPhoto(tree, 'before', 'file:///tmp/new.jpg');
    await saveChanges(tree);
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { beforePhotoUri: 'file:///tmp/new.jpg' });
  });

  it('sends an explicit undefined to clear a slot', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ beforePhotoUri: 'file:///app/b.jpg' }));
    const tree = await renderDetail();
    setPhoto(tree, 'before', undefined);
    await saveChanges(tree);
    expect('beforePhotoUri' in patch()).toBe(true);
    expect(patch().beforePhotoUri).toBeUndefined();
  });

  it('omits photo keys when the slots are untouched', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ beforePhotoUri: 'file:///app/b.jpg' }));
    const tree = await renderDetail();
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('nice');
    });
    await saveChanges(tree);
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'nice' });
    expect(patch()).not.toHaveProperty('beforePhotoUri');
    expect(patch()).not.toHaveProperty('afterPhotoUri');
  });
});

describe('MowDetailScreen — clippings bags wiring', () => {
  async function saveChanges(tree: ReactTestRenderer): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });
  }
  async function press(tree: ReactTestRenderer, label: string): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
  }

  it("seeds the field from the mow's own clippingBags", async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ clippingBags: 3 }));

    const tree = await renderDetail();
    // The set state (stepper) is shown, labelled with the stored count.
    expect(tree.root.findByProps({ accessibilityLabel: 'Clippings bags 3 bags' })).toBeTruthy();
  });

  it('shows the Add bags affordance for a mow with no bags', async () => {
    mowRepository.getMowById.mockResolvedValue(mow());

    const tree = await renderDetail();
    expect(tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' })).toBeTruthy();
  });

  it('sends the changed count in the patch', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ clippingBags: 3 }));

    const tree = await renderDetail();
    await press(tree, 'Increase clippings bags'); // 3 → 4
    await saveChanges(tree);

    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { clippingBags: 4 });
  });

  it('adds a count to a mow that had none (Add bags → default 1)', async () => {
    mowRepository.getMowById.mockResolvedValue(mow());

    const tree = await renderDetail();
    await press(tree, 'Add clippings bags'); // seeds default 1
    await saveChanges(tree);

    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { clippingBags: 1 });
  });

  it('clears the count with an explicit undefined in the patch', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ clippingBags: 3 }));

    const tree = await renderDetail();
    await press(tree, 'Clear clippings bags');
    await saveChanges(tree);

    const patch = mowRepository.update.mock.calls[0][1];
    expect('clippingBags' in patch).toBe(true);
    expect(patch.clippingBags).toBeUndefined();
  });

  it('omits clippingBags from the patch when it is untouched', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ clippingBags: 3 }));

    const tree = await renderDetail();
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('nice');
    });
    await saveChanges(tree);

    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'nice' });
    expect(mowRepository.update.mock.calls[0][1]).not.toHaveProperty('clippingBags');
  });
});

const WEATHER: Weather = {
  tempF: 94,
  condition: 'Clear',
  humidity: 40,
  capturedAt: '2026-08-10T15:00:00.000Z',
};

function weatherLine(tree: ReactTestRenderer): string | null {
  const nodes = tree.root.findAllByProps({ testID: 'mow-weather' });
  return nodes.length === 0 ? null : (nodes[0].props.children as string);
}

describe('MowDetailScreen — weather display', () => {
  it('renders the weather line when the mow has weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ weather: WEATHER }));

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBe('94°F · Clear');
  });

  it('renders nothing when the mow has no weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow());

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBeNull();
  });

  it('still shows weather after an edit, and the edit patch never carries weather', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ weather: WEATHER }));

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBe('94°F · Clear');

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('nice');
    });
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // The edit sends only notes — weather is never part of an edit patch.
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'nice' });
    const patch = mowRepository.update.mock.calls[0][1];
    expect(patch).not.toHaveProperty('weather');
    // The line was still on screen right up to the save.
    expect(weatherLine(tree)).toBe('94°F · Clear');
  });
});

const ACTIVITY: Activity = {
  steps: 4213,
  distanceMi: 1.87,
  source: 'Apple Watch',
  capturedAt: '2026-08-10T15:00:00.000Z',
};

function activityLine(tree: ReactTestRenderer): string | null {
  const nodes = tree.root.findAllByProps({ testID: 'mow-activity' });
  return nodes.length === 0 ? null : (nodes[0].props.children as string);
}

describe('MowDetailScreen — activity display', () => {
  it('renders the activity line (thousands separator) when present', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ activity: ACTIVITY }));

    const tree = await renderDetail();
    expect(activityLine(tree)).toBe('4,213 steps · 1.87 mi');
  });

  it('renders nothing when the mow has no activity', async () => {
    mowRepository.getMowById.mockResolvedValue(mow());

    const tree = await renderDetail();
    expect(activityLine(tree)).toBeNull();
  });

  it('shows both weather and activity lines together', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ weather: WEATHER, activity: ACTIVITY }));

    const tree = await renderDetail();
    expect(weatherLine(tree)).toBe('94°F · Clear');
    expect(activityLine(tree)).toBe('4,213 steps · 1.87 mi');
  });

  it('still shows activity after an edit, and the patch never carries activity', async () => {
    mowRepository.getMowById.mockResolvedValue(mow({ activity: ACTIVITY }));

    const tree = await renderDetail();
    expect(activityLine(tree)).toBe('4,213 steps · 1.87 mi');

    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('nice');
    });
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'nice' });
    expect(mowRepository.update.mock.calls[0][1]).not.toHaveProperty('activity');
    expect(activityLine(tree)).toBe('4,213 steps · 1.87 mi');
  });
});

describe('MowDetailScreen — native datetime picker', () => {
  async function firePicker(
    tree: ReactTestRenderer,
    testID: string,
    selected: Date,
  ): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ testID }).props.onValueChange({ type: 'set' }, selected);
    });
  }

  async function saveChanges(tree: ReactTestRenderer): Promise<void> {
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });
  }

  it('picking a date stores the byte-identical YYYY-MM-DD format', async () => {
    // Local-time construction so the round-trip is timezone-independent.
    const startedAt = new Date(2026, 6, 20, 10, 0).getTime(); // Jul 20 2026 10:00 local
    mowRepository.getMowById.mockResolvedValue(mow({ startedAt }));

    const tree = await renderDetail();
    await firePicker(tree, 'mow-date-picker', new Date(2026, 0, 15, 8, 45)); // Jan 15
    await saveChanges(tree);

    // New date, original time preserved — exactly what the text field produced.
    const expected = new Date(2026, 0, 15, 10, 0).getTime();
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { startedAt: expected });
    const stored = mowRepository.update.mock.calls[0][1].startedAt;
    expect(formatDateField(stored)).toBe('2026-01-15');
    expect(formatTimeField(stored)).toBe('10:00');
  });

  it('picking a time stores the byte-identical HH:MM format', async () => {
    const startedAt = new Date(2026, 6, 20, 10, 0).getTime();
    mowRepository.getMowById.mockResolvedValue(mow({ startedAt }));

    const tree = await renderDetail();
    await firePicker(tree, 'mow-time-picker', new Date(2026, 6, 20, 6, 5)); // 06:05
    await saveChanges(tree);

    const expected = new Date(2026, 6, 20, 6, 5).getTime();
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { startedAt: expected });
    const stored = mowRepository.update.mock.calls[0][1].startedAt;
    expect(formatTimeField(stored)).toBe('06:05');
    expect(formatDateField(stored)).toBe('2026-07-20');
  });

  it('a date edit leaves weather and activity provenance intact', async () => {
    const startedAt = new Date(2026, 6, 20, 10, 0).getTime();
    mowRepository.getMowById.mockResolvedValue(
      mow({ startedAt, weather: WEATHER, activity: ACTIVITY }),
    );

    const tree = await renderDetail();
    await firePicker(tree, 'mow-date-picker', new Date(2026, 0, 15, 8, 45));
    await saveChanges(tree);

    const patch = mowRepository.update.mock.calls[0][1];
    expect(patch).toHaveProperty('startedAt');
    expect(patch).not.toHaveProperty('weather');
    expect(patch).not.toHaveProperty('activity');
    // Provenance is still shown; nothing re-fires on edit.
    expect(weatherLine(tree)).toBe('94°F · Clear');
    expect(activityLine(tree)).toBe('4,213 steps · 1.87 mi');
  });
});

describe('MowDetailScreen — short-mow guard does not apply to edits', () => {
  it('saves a 30-second edit with no confirmation dialog', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const startedAt = Date.parse('2026-07-20T10:00:00Z');
    mowRepository.getMowById.mockResolvedValue(
      mow({ startedAt, endedAt: startedAt + 30 * 1000, durationSeconds: 30 }),
    );

    const tree = await renderDetail();
    // Touch the notes so the save produces a real patch.
    await act(async () => {
      tree.root.findByProps({ accessibilityLabel: 'Mow notes' }).props.onChangeText('great');
    });
    await act(async () => {
      tree.root.findByProps({ label: 'Save changes' }).props.onPress();
    });

    // The sub-floor duration must not trigger the timer-flow confirmation.
    expect(alert).not.toHaveBeenCalled();
    expect(mowRepository.update).toHaveBeenCalledWith('mow-1', { notes: 'great' });
    alert.mockRestore();
  });
});
