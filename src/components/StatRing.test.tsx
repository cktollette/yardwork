import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import StatRing from './StatRing';

// Mirror the component's fixed geometry so the expected arc math is derived,
// not magic numbers. (DEFAULT_SIZE 72, STROKE_WIDTH 6.)
const SIZE = 72;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

// The svg mock renders each element as a host View that forwards props; grab the
// single host node (string type) carrying the testID and read geometry off it.
function hostByTestId(tree: ReactTestRenderer, testID: string) {
  return tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props && n.props.testID === testID,
  );
}
function arc(tree: ReactTestRenderer) {
  const nodes = hostByTestId(tree, 'statring-arc');
  expect(nodes).toHaveLength(1);
  return nodes[0];
}

describe('StatRing', () => {
  it('renders a string value and label', () => {
    const tree = render(<StatRing value="12,345" label="sq ft" />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('12,345');
    expect(json).toContain('sq ft');
  });

  it('renders a numeric value and honors custom size/color', () => {
    const tree = render(
      <StatRing value={7} label="Streak" size={100} ringColor="#123456" />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('7');
    // ringColor threads through to the arc stroke.
    expect(arc(tree).props.stroke).toBe('#123456');
  });

  describe('arc geometry', () => {
    it('0% leaves the arc fully unfilled (offset = full circumference)', () => {
      const a = arc(render(<StatRing value={0} label="p" progress={0} />));
      expect(a.props.strokeDasharray).toBeCloseTo(CIRC, 5);
      expect(a.props.strokeDashoffset).toBeCloseTo(CIRC, 5);
    });

    it('50% offsets by half the circumference', () => {
      const a = arc(render(<StatRing value={50} label="p" progress={0.5} />));
      expect(a.props.strokeDashoffset).toBeCloseTo(CIRC / 2, 5);
    });

    it('100% fills the ring (offset = 0)', () => {
      const a = arc(render(<StatRing value={100} label="p" progress={1} />));
      expect(a.props.strokeDashoffset).toBeCloseTo(0, 5);
    });

    it('over 100% clamps to a full ring (offset = 0)', () => {
      const a = arc(render(<StatRing value={150} label="p" progress={1.5} />));
      expect(a.props.strokeDashoffset).toBeCloseTo(0, 5);
    });

    it('negative progress clamps to empty (offset = full circumference)', () => {
      const a = arc(render(<StatRing value={0} label="p" progress={-0.5} />));
      expect(a.props.strokeDashoffset).toBeCloseTo(CIRC, 5);
    });

    it('draws a track only when progress is provided', () => {
      const withProgress = render(<StatRing value={50} label="p" progress={0.5} />);
      expect(hostByTestId(withProgress, 'statring-track')).toHaveLength(1);

      const without = render(<StatRing value={5} label="mows" />);
      expect(hostByTestId(without, 'statring-track')).toHaveLength(0);
      // No progress => a full ring (offset 0).
      expect(arc(without).props.strokeDashoffset).toBeCloseTo(0, 5);
    });
  });
});
