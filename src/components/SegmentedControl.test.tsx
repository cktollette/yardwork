import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import SegmentedControl, { type SegmentOption } from './SegmentedControl';

const OPTIONS: SegmentOption<'gas' | 'battery' | 'corded'>[] = [
  { value: 'gas', label: 'Gas' },
  { value: 'battery', label: 'Battery' },
  { value: 'corded', label: 'Corded' },
];

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('SegmentedControl', () => {
  it('renders a label for every option', () => {
    const tree = render(
      <SegmentedControl options={OPTIONS} value={undefined} onChange={() => {}} />,
    );
    const json = JSON.stringify(tree.toJSON());
    for (const o of OPTIONS) expect(json).toContain(o.label);
  });

  it('calls onChange with the pressed value', () => {
    const onChange = jest.fn();
    const tree = render(
      <SegmentedControl options={OPTIONS} value="gas" onChange={onChange} />,
    );
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Battery' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('battery');
  });

  it('marks the selected option', () => {
    const tree = render(
      <SegmentedControl options={OPTIONS} value="corded" onChange={() => {}} />,
    );
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Corded' }).props.accessibilityState
        .selected,
    ).toBe(true);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Gas' }).props.accessibilityState
        .selected,
    ).toBe(false);
  });
});
