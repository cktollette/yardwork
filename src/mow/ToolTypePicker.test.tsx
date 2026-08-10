import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ToolTypePicker from './ToolTypePicker';

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('ToolTypePicker', () => {
  it('renders the four fixed job-type chips', () => {
    const tree = render(<ToolTypePicker selected={[]} onToggle={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    for (const label of ['Mow', 'Trim', 'Edge', 'Blow']) {
      expect(json).toContain(label);
    }
  });

  it('fires onToggle with the enum value of the pressed chip', () => {
    const onToggle = jest.fn();
    const tree = render(<ToolTypePicker selected={[]} onToggle={onToggle} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Trim' }).props.onPress();
    });
    expect(onToggle).toHaveBeenCalledWith('trimmer');
  });

  it('reflects the selected state', () => {
    const tree = render(<ToolTypePicker selected={['mower']} onToggle={() => {}} />);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Mow' }).props.accessibilityState.checked,
    ).toBe(true);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Blow' }).props.accessibilityState.checked,
    ).toBe(false);
  });
});
