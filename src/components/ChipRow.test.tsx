import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ChipRow from './ChipRow';

const OPTIONS = ['Bermuda', 'Zoysia', 'Fescue'] as const;

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('ChipRow', () => {
  it('renders every option and marks the selected one', () => {
    const tree = render(
      <ChipRow options={OPTIONS} selected="Zoysia" onChange={jest.fn()} />,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Bermuda');
    expect(json).toContain('Zoysia');
    expect(json).toContain('Fescue');
    expect(tree.root.findByProps({ accessibilityLabel: 'Zoysia' }).props.accessibilityState)
      .toEqual({ selected: true });
    expect(tree.root.findByProps({ accessibilityLabel: 'Bermuda' }).props.accessibilityState)
      .toEqual({ selected: false });
  });

  it('selects an unselected chip on tap', () => {
    const onChange = jest.fn();
    const tree = render(<ChipRow options={OPTIONS} selected={undefined} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Fescue' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('Fescue');
  });

  it('clears the selected chip on tap when clearable', () => {
    const onChange = jest.fn();
    const tree = render(
      <ChipRow options={OPTIONS} selected="Zoysia" onChange={onChange} clearable />,
    );
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Zoysia' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('re-selects (does not clear) the selected chip when not clearable', () => {
    const onChange = jest.fn();
    const tree = render(<ChipRow options={OPTIONS} selected="Zoysia" onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Zoysia' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('Zoysia');
  });

  it('applies a custom accessibility label per chip', () => {
    const tree = render(
      <ChipRow
        options={OPTIONS}
        selected={undefined}
        onChange={jest.fn()}
        accessibilityLabel={(v) => `Grass ${v}`}
      />,
    );
    expect(tree.root.findByProps({ accessibilityLabel: 'Grass Bermuda' })).toBeTruthy();
  });
});
