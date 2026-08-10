import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import EquipmentChips from './EquipmentChips';
import type { Equipment } from './models';

function eq(id: string, overrides: Partial<Equipment> = {}): Equipment {
  return {
    id,
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    catalogId: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

const GARAGE: Equipment[] = [
  eq('a', { nickname: 'Big Green' }),
  eq('b', { type: 'trimmer', brand: 'Stihl', model: 'FS 56' }),
];

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('EquipmentChips', () => {
  it('renders a chip per equipment using its display name', () => {
    const tree = render(
      <EquipmentChips equipment={GARAGE} selectedIds={[]} onToggle={() => {}} />,
    );
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Big Green'); // nickname
    expect(json).toContain('Stihl FS 56'); // brand + model fallback
  });

  it('fires onToggle with the pressed id', () => {
    const onToggle = jest.fn();
    const tree = render(
      <EquipmentChips equipment={GARAGE} selectedIds={[]} onToggle={onToggle} />,
    );
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Big Green' }).props.onPress();
    });
    expect(onToggle).toHaveBeenCalledWith('a');
  });

  it('reflects the selected state', () => {
    const tree = render(
      <EquipmentChips equipment={GARAGE} selectedIds={['a']} onToggle={() => {}} />,
    );
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Big Green' }).props.accessibilityState
        .checked,
    ).toBe(true);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Stihl FS 56' }).props
        .accessibilityState.checked,
    ).toBe(false);
  });
});
