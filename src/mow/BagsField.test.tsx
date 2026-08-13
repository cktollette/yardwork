import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import BagsField from './BagsField';

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('BagsField', () => {
  it('shows the Add bags affordance when unset', () => {
    const tree = render(<BagsField value={undefined} onChange={() => {}} />);
    expect(JSON.stringify(tree.toJSON())).toContain('Add bags');
  });

  it('seeds BAGS_DEFAULT (1) on tap when no seed is given', () => {
    const onChange = jest.fn();
    const tree = render(<BagsField value={undefined} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('seeds the provided seed value on tap', () => {
    const onChange = jest.fn();
    const tree = render(<BagsField value={undefined} seed={4} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('seeds 0 on tap when the seed is 0 (nullish, not falsy)', () => {
    const onChange = jest.fn();
    const tree = render(<BagsField value={undefined} seed={0} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Add clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('renders the count and its label when set', () => {
    const tree = render(<BagsField value={3} onChange={() => {}} />);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Clippings bags 3 bags' }),
    ).toBeTruthy();
  });

  it('steps up and down by one bag', () => {
    const onChange = jest.fn();
    const tree = render(<BagsField value={3} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Increase clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenLastCalledWith(4);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Decrease clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it('clears back to unset', () => {
    const onChange = jest.fn();
    const tree = render(<BagsField value={3} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Clear clippings bags' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('disables the decrease stepper at zero (floor), leaving increase enabled', () => {
    const tree = render(<BagsField value={0} onChange={() => {}} />);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Decrease clippings bags' }).props.disabled,
    ).toBe(true);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Increase clippings bags' }).props.disabled,
    ).toBe(false);
  });

  it('disables the increase stepper at the maximum', () => {
    const tree = render(<BagsField value={20} onChange={() => {}} />);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Increase clippings bags' }).props.disabled,
    ).toBe(true);
  });
});
