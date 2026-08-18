import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import StatRing from '../components/StatRing';
import MowShareCard from './MowShareCard';
import type { ShareCardModel } from './shareCardModel';

const FULL: ShareCardModel = {
  dateLabel: 'Jul 22, 2026',
  durationLabel: '00:30:00',
  tempLabel: '72F',
  toolsLabel: 'Mower, Trimmer',
  areaRing: { value: '5.0k', label: 'sq ft' },
  efficiencyRing: { value: '167', label: 'sq ft/min', progress: 0.5 },
};

function render(model: ShareCardModel): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<MowShareCard model={model} />);
  });
  return tree;
}

const rings = (tree: ReactTestRenderer) => tree.root.findAllByType(StatRing);
const text = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());

describe('MowShareCard', () => {
  it('renders the wordmark, date, and all present fields', () => {
    const json = text(render(FULL));
    expect(json).toContain('Klippa');
    expect(json).toContain('getklippa.com');
    expect(json).toContain('Jul 22, 2026');
    expect(json).toContain('00:30:00');
    expect(json).toContain('72F');
    expect(json).toContain('Mower, Trimmer');
  });

  it('reuses StatRing untouched: area as a full ring, efficiency as a progress ring', () => {
    const found = rings(render(FULL));
    expect(found).toHaveLength(2);
    // Area ring: no progress prop (full ring).
    expect(found[0].props.value).toBe('5.0k');
    expect(found[0].props.progress).toBeUndefined();
    // Efficiency ring: carries the progress prop.
    expect(found[1].props.value).toBe('167');
    expect(found[1].props.progress).toBe(0.5);
  });

  it('omits the tools line when toolsLabel is null', () => {
    const json = text(render({ ...FULL, toolsLabel: null }));
    expect(json).not.toContain('Tools');
    expect(json).toContain('Time'); // other stats remain
  });

  it('omits the temperature line when tempLabel is null', () => {
    const json = text(render({ ...FULL, tempLabel: null }));
    expect(json).not.toContain('Temp');
  });

  it('renders zero rings when both are absent (no area)', () => {
    const tree = render({ ...FULL, areaRing: null, efficiencyRing: null });
    expect(rings(tree)).toHaveLength(0);
    // The card still renders date + duration.
    expect(text(tree)).toContain('Jul 22, 2026');
    expect(text(tree)).toContain('00:30:00');
  });

  it('renders a single ring when only the area ring is present', () => {
    const tree = render({ ...FULL, efficiencyRing: null });
    const found = rings(tree);
    expect(found).toHaveLength(1);
    expect(found[0].props.progress).toBeUndefined();
  });
});
