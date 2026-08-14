import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ZonePicker from './ZonePicker';

const ZONES = [
  { id: 'z1', name: 'Front' },
  { id: 'z2', name: 'Back' },
  { id: 'z3', name: 'Side' },
];

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

function chip(tree: ReactTestRenderer, name: string) {
  return tree.root.findByProps({ accessibilityLabel: name });
}

describe('ZonePicker', () => {
  it('renders a chip per zone, marked checked when selected', () => {
    const tree = render(<ZonePicker zones={ZONES} selectedIds={['z1', 'z2', 'z3']} onToggle={() => {}} />);
    expect(chip(tree, 'Front').props.accessibilityState.checked).toBe(true);
    expect(chip(tree, 'Back').props.accessibilityState.checked).toBe(true);
    expect(chip(tree, 'Side').props.accessibilityState.checked).toBe(true);
  });

  it('toggles a zone by id', () => {
    const onToggle = jest.fn();
    const tree = render(<ZonePicker zones={ZONES} selectedIds={['z1', 'z2', 'z3']} onToggle={onToggle} />);
    act(() => chip(tree, 'Back').props.onPress());
    expect(onToggle).toHaveBeenCalledWith('z2');
  });

  it('disables the last selected chip — a mow can never cover zero zones', () => {
    const onToggle = jest.fn();
    const tree = render(<ZonePicker zones={ZONES} selectedIds={['z1']} onToggle={onToggle} />);
    const last = chip(tree, 'Front');
    expect(last.props.accessibilityState.disabled).toBe(true);
    expect(last.props.disabled).toBe(true);
    // The other (unselected) chips are still enabled and toggle normally.
    expect(chip(tree, 'Back').props.disabled).toBe(false);
    act(() => chip(tree, 'Back').props.onPress());
    expect(onToggle).toHaveBeenCalledWith('z2');
  });
});
