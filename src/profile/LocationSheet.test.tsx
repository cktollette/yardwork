import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import LocationSheet from './LocationSheet';
import { resolveCountryName } from './location';
import { formatProfileLocationLine, profileDisplayName } from './profileHeader';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

async function renderSheet(property: Property, onSaved = jest.fn(), onClose = jest.fn()) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<LocationSheet property={property} onSaved={onSaved} onClose={onClose} />);
  });
  return { tree, onSaved, onClose };
}
const setText = (t: ReactTestRenderer, label: string, text: string) =>
  act(() => t.root.findByProps({ accessibilityLabel: label }).props.onChangeText(text));
const press = (t: ReactTestRenderer, label: string) =>
  act(() => t.root.findByProps({ accessibilityLabel: label }).props.onPress());
const pressButton = (t: ReactTestRenderer, label: string) =>
  act(() => t.root.findAllByProps({ label }).find((n) => typeof n.props.onPress === 'function')!.props.onPress());

function pickCountry(t: ReactTestRenderer, name: string) {
  press(t, 'Select country'); // open the picker
  setText(t, 'Search countries', name); // filter down so the row renders
  press(t, name); // select -> stores the code
}

/** The header line the Profile would render from a stored property. */
function headerLine(p: Property): string {
  return formatProfileLocationLine({
    city: p.locationCity,
    region: p.locationRegion,
    countryName: resolveCountryName(p.locationCountry),
    zone: p.hardinessZone,
    grassTypes: p.zones.map((z) => z.grassType),
  });
}

it('stores city/region/zone/country (zone as a chip, country as a code) through the repo', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree, onSaved, onClose } = await renderSheet(property);

  setText(tree, 'City', 'Dallas');
  setText(tree, 'State / Region', 'Texas');
  press(tree, 'Zone 8a'); // chip selects
  pickCountry(tree, 'United States');

  await act(async () => pressButton(tree, 'Save'));

  const saved = await propertyRepository.getById(property.id);
  expect(saved).toMatchObject({
    locationCity: 'Dallas',
    locationRegion: 'Texas',
    hardinessZone: '8a',
    locationCountry: 'US', // the code, not the name
  });
  expect(onSaved).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
  // Region present -> country omitted from the line, per the display rule.
  expect(headerLine(saved!)).toBe('Dallas, Texas - Zone 8a');
});

it('Cancel writes nothing', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property);
  setText(tree, 'City', 'Dallas');
  await act(async () => pressButton(tree, 'Cancel'));
  const after = await propertyRepository.getById(property.id);
  expect(after?.locationCity).toBeUndefined();
});

it('fill all, save, then clear all, save -> fields undefined and header shows the fallback name only', async () => {
  const property = await propertyRepository.getOrCreateDefault();

  // Fill everything and save.
  const first = await renderSheet(property);
  setText(first.tree, 'City', 'Dallas');
  setText(first.tree, 'State / Region', 'Texas');
  press(first.tree, 'Zone 8a');
  pickCountry(first.tree, 'United States');
  await act(async () => pressButton(first.tree, 'Save'));

  const filled = (await propertyRepository.getById(property.id))!;
  expect(headerLine(filled)).toBe('Dallas, Texas - Zone 8a');

  // Reopen the sheet (seeds from the filled property) and clear everything.
  const second = await renderSheet(filled);
  setText(second.tree, 'City', '   '); // whitespace-only -> undefined
  setText(second.tree, 'State / Region', '');
  press(second.tree, 'Zone 8a'); // clearable chip: tapping the selected clears it
  press(second.tree, 'Clear country'); // clear the country
  await act(async () => pressButton(second.tree, 'Save'));

  const cleared = (await propertyRepository.getById(property.id))!;
  expect(cleared.locationCity).toBeUndefined();
  expect(cleared.locationRegion).toBeUndefined();
  expect(cleared.locationCountry).toBeUndefined();
  expect(cleared.hardinessZone).toBeUndefined();
  // No dangling separators; header falls back to the name only.
  expect(headerLine(cleared)).toBe('');
  expect(profileDisplayName(cleared)).toBe('My Lawn');
});
