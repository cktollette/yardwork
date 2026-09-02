import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Svg, { LinearGradient, Path, Polygon } from 'react-native-svg';
import Wordmark from './Wordmark';

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('Wordmark', () => {
  it('defaults to the gradient variant: defines the six letterform gradients and fills letters from them', () => {
    const tree = render(<Wordmark />);

    // One dereferenced LinearGradient per letterform (no xlink inheritance).
    const grads = tree.root.findAllByType(LinearGradient);
    expect(grads).toHaveLength(6);
    // Direction preserved: x1 (light) on the right (~1080), x2 (dark) on the left.
    for (const g of grads) {
      expect(g.props.x1).toBeGreaterThan(g.props.x2);
    }

    // Letterforms (3 polygons + 3 paths) reference the gradients by url().
    const polys = tree.root.findAllByType(Polygon);
    expect(polys).toHaveLength(3);
    for (const p of polys) {
      expect(p.props.fill).toMatch(/^url\(#wm-grad-\d\)$/);
    }
    // The three letter paths are gradient-filled; the tagline paths are solid dark.
    const paths = tree.root.findAllByType(Path);
    const gradientPaths = paths.filter((p) => /^url\(/.test(p.props.fill));
    const solidPaths = paths.filter((p) => p.props.fill === '#2e5e43');
    expect(gradientPaths).toHaveLength(3);
    expect(solidPaths.length).toBeGreaterThan(0); // the tagline glyphs
  });

  it('white variant: no gradients, every shape filled white', () => {
    const tree = render(<Wordmark variant="white" />);

    expect(tree.root.findAllByType(LinearGradient)).toHaveLength(0);
    for (const p of tree.root.findAllByType(Polygon)) {
      expect(p.props.fill).toBe('#fff');
    }
    for (const p of tree.root.findAllByType(Path)) {
      expect(p.props.fill).toBe('#fff');
    }
  });

  it('is labelled "Klippa" for accessibility and forwards testID and width-derived height', () => {
    const tree = render(<Wordmark width={520} testID="wm" />);
    const svg = tree.root.findByType(Svg);
    expect(svg.props.testID).toBe('wm');
    expect(svg.props.accessibilityLabel).toBe('Klippa');
    expect(svg.props.width).toBe(520);
    // Height derives from the 1080:258 aspect ratio.
    expect(svg.props.height).toBeCloseTo((520 * 258) / 1080, 5);
  });
});
