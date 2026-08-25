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
  backgroundPhotoUri: null,
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

  it('area as a full ring, efficiency as a progress ring, both at card-scale sizing', () => {
    const found = rings(render(FULL));
    expect(found).toHaveLength(2);
    // Area ring: no progress prop (full ring).
    expect(found[0].props.value).toBe('5.0k');
    expect(found[0].props.progress).toBeUndefined();
    // Efficiency ring: carries the progress prop.
    expect(found[1].props.value).toBe('167');
    expect(found[1].props.progress).toBe(0.5);
    // Both rings are sized for the 1080 canvas (finding 1: app defaults were tiny).
    for (const r of found) {
      expect(r.props.size).toBe(360);
      expect(r.props.valueFontSize).toBe(120);
      expect(r.props.labelFontSize).toBe(42);
      expect(r.props.strokeWidth).toBe(18);
      expect(r.props.gap).toBe(16);
    }
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

const PHOTO_URI = 'file:///app/mow-photos/after-abc.jpg';
const byTestId = (tree: ReactTestRenderer, id: string) =>
  tree.root.findAll((n) => !!n.props && n.props.testID === id);

describe('MowShareCard — after-photo background variant', () => {
  it('renders the after photo full-bleed (cover) under a scrim, with light stats and the wordmark', () => {
    const tree = render({ ...FULL, backgroundPhotoUri: PHOTO_URI });

    const img = tree.root.findByProps({ testID: 'share-card-photo' });
    // The stored (downscaled, EXIF-stripped) after slot — never a camera-roll original.
    expect(img.props.source).toEqual({ uri: PHOTO_URI });
    // cover center-crops a non-square source onto the square canvas.
    expect(img.props.resizeMode).toBe('cover');
    expect(byTestId(tree, 'share-card-scrim').length).toBeGreaterThan(0);

    const json = text(tree);
    expect(json).toContain('Klippa'); // wordmark still present (bottom-anchored)
    expect(json).toContain('167'); // stats still render
    // Rings switch to light text over the photo.
    expect(rings(tree)[0].props.valueColor).toBe('#FFFFFF');
  });

  it('renders no photo/scrim and the default dark layout when there is no after photo', () => {
    const tree = render(FULL); // backgroundPhotoUri: null

    expect(byTestId(tree, 'share-card-photo')).toHaveLength(0);
    expect(byTestId(tree, 'share-card-scrim')).toHaveLength(0);
    // Default rings keep the dark default (no light override).
    expect(rings(tree)[0].props.valueColor).toBeUndefined();
    // Current content intact.
    const json = text(tree);
    expect(json).toContain('Klippa');
    expect(json).toContain('Jul 22, 2026');
  });
});
