import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CountryPicker from './CountryPicker';

function render(onSelect = jest.fn(), onClose = jest.fn()): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<CountryPicker onSelect={onSelect} onClose={onClose} />);
  });
  return tree;
}
const search = (t: ReactTestRenderer, text: string) =>
  act(() => t.root.findByProps({ accessibilityLabel: 'Search countries' }).props.onChangeText(text));
const json = (t: ReactTestRenderer) => JSON.stringify(t.toJSON());

it('renders display names and filters by search', () => {
  const t = render();
  search(t, 'united');
  const shown = json(t);
  expect(shown).toContain('United States');
  expect(shown).toContain('United Kingdom');
  expect(shown).not.toContain('Netherlands');
});

it('selecting a row reports the ISO alpha-2 code, not the name', () => {
  const onSelect = jest.fn();
  const t = render(onSelect);
  search(t, 'Netherlands'); // filter down so the row is rendered
  act(() => t.root.findByProps({ accessibilityLabel: 'Netherlands' }).props.onPress());
  expect(onSelect).toHaveBeenCalledWith('NL');
});

it('matches an exact code query too', () => {
  const t = render();
  search(t, 'us');
  expect(json(t)).toContain('United States');
});
