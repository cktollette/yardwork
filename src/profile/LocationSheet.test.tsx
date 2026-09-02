import { Alert } from 'react-native';
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
  act(() =>
    t.root.findAllByProps({ label }).find((n) => typeof n.props.onPress === 'function')!.props.onPress(),
  );
const json = (t: ReactTestRenderer) => JSON.stringify(t.toJSON());
const has = (t: ReactTestRenderer, label: string) =>
  t.root.findAllByProps({ accessibilityLabel: label }).length > 0;

function pickCountry(t: ReactTestRenderer, name: string) {
  press(t, 'Select country');
  setText(t, 'Search countries', name);
  press(t, name); // row accessibilityLabel is the country name
}
function pickState(t: ReactTestRenderer, rowLabel: string, search: string) {
  press(t, 'Select state');
  setText(t, 'Search states', search);
  press(t, rowLabel); // row accessibilityLabel is "TX - Texas"
}
function headerLine(p: Property): string {
  return formatProfileLocationLine({
    city: p.locationCity,
    region: p.locationRegion,
    countryName: resolveCountryName(p.locationCountry),
    zone: p.hardinessZone,
    grassTypes: p.zones.map((z) => z.grassType),
  });
}

it('field order is Country -> State/Region -> City, and country defaults to US on empty', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property);
  const shown = json(tree);
  expect(shown.indexOf('"Country"')).toBeLessThan(shown.indexOf('"Select state"'));
  expect(shown.indexOf('"Select state"')).toBeLessThan(shown.indexOf('"City"'));
  // US default: country pre-filled, region is the state picker (not free text).
  expect(shown).toContain('United States');
  expect(has(tree, 'Select state')).toBe(true);
  expect(has(tree, 'Region')).toBe(false);
});

it('under US, the region is a state picker that stores the code (never free text)', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property); // US default

  pickState(tree, 'TX - Texas', 'Texas');
  setText(tree, 'City', 'Dallas');
  await act(async () => pressButton(tree, 'Save'));

  const saved = (await propertyRepository.getById(property.id))!;
  expect(saved).toMatchObject({ locationCountry: 'US', locationRegion: 'TX', locationCity: 'Dallas' });
  expect(headerLine(saved)).toBe('Dallas, TX'); // header shows the code
});

it('under a non-US country, the region is free text and persists as typed', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property);

  pickCountry(tree, 'Germany'); // changes country -> region becomes free text
  expect(has(tree, 'Region')).toBe(true);
  expect(has(tree, 'Select state')).toBe(false);
  setText(tree, 'Region', 'Bayern');
  setText(tree, 'City', 'Munich');
  await act(async () => pressButton(tree, 'Save'));

  const saved = (await propertyRepository.getById(property.id))!;
  expect(saved).toMatchObject({ locationCountry: 'DE', locationRegion: 'Bayern', locationCity: 'Munich' });
});

it('changing the country clears the region (both directions) but keeps the city', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property); // US default

  setText(tree, 'City', 'Dallas');
  pickState(tree, 'TX - Texas', 'Texas');
  // US -> other: region cleared, city kept.
  pickCountry(tree, 'Germany');
  expect(has(tree, 'Region')).toBe(true);
  setText(tree, 'Region', 'Bayern');
  // other -> US: region cleared again (state picker back to "Select state").
  pickCountry(tree, 'United States');
  await act(async () => pressButton(tree, 'Save'));

  const saved = (await propertyRepository.getById(property.id))!;
  expect(saved.locationCountry).toBe('US');
  expect(saved.locationRegion).toBeUndefined(); // cleared by the country switch
  expect(saved.locationCity).toBe('Dallas'); // preserved throughout
});

it('Cancel writes nothing', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const { tree } = await renderSheet(property);
  setText(tree, 'City', 'Dallas');
  await act(async () => pressButton(tree, 'Cancel'));
  const after = await propertyRepository.getById(property.id);
  expect(after?.locationCity).toBeUndefined();
});

it('clearing everything leaves fields undefined and the header shows the fallback name', async () => {
  const property = await propertyRepository.getOrCreateDefault();

  const first = await renderSheet(property);
  pickState(first.tree, 'TX - Texas', 'Texas');
  setText(first.tree, 'City', 'Dallas');
  await act(async () => pressButton(first.tree, 'Save'));
  const filled = (await propertyRepository.getById(property.id))!;
  expect(headerLine(filled)).toBe('Dallas, TX');

  const second = await renderSheet(filled);
  setText(second.tree, 'City', '   ');
  press(second.tree, 'Clear state');
  press(second.tree, 'Clear country'); // country cleared -> also clears region
  await act(async () => pressButton(second.tree, 'Save'));

  const cleared = (await propertyRepository.getById(property.id))!;
  expect(cleared.locationCity).toBeUndefined();
  expect(cleared.locationRegion).toBeUndefined();
  expect(cleared.locationCountry).toBeUndefined();
  expect(headerLine(cleared)).toBe('');
  expect(profileDisplayName(cleared)).toBe('My Lawn');
});

it('surfaces a save failure via Alert and keeps the sheet open (never silent)', async () => {
  const property = await propertyRepository.getOrCreateDefault();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const updateSpy = jest
    .spyOn(propertyRepository, 'updateLocation')
    .mockRejectedValueOnce(new Error('disk full'));

  const { tree, onSaved, onClose } = await renderSheet(property);
  setText(tree, 'City', 'Dallas');
  await act(async () => pressButton(tree, 'Save'));

  // The failure is surfaced, not swallowed.
  expect(alertSpy).toHaveBeenCalledWith("Couldn't save location", 'Please try again.');
  // Sheet stays open; no success side effects fired.
  expect(onSaved).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
  expect(has(tree, 'City')).toBe(true);
  // And it is interactive again (not stuck on "Saving…").
  expect(json(tree)).not.toContain('Saving');

  updateSpy.mockRestore();
  alertSpy.mockRestore();
});
