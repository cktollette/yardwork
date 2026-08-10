import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import EquipmentCard from './EquipmentCard';
import type { Equipment } from './models';

function makeEquipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 'eq-1',
    type: 'mower',
    brand: 'Toro',
    model: 'Recycler 22',
    powerSource: 'gas',
    driveType: 'self_propelled',
    catalogId: null,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

function renderJson(node: React.ReactElement): string {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return JSON.stringify(tree.toJSON());
}

describe('EquipmentCard', () => {
  it('shows the display name and the power-source badge', () => {
    const json = renderJson(
      <EquipmentCard equipment={makeEquipment({ nickname: 'Old Reliable' })} />,
    );
    expect(json).toContain('Old Reliable');
    expect(json).toContain('Gas');
  });

  it('falls back to brand + model when there is no nickname', () => {
    const json = renderJson(<EquipmentCard equipment={makeEquipment()} />);
    expect(json).toContain('Toro Recycler 22');
  });

  it('shows a drive-type badge for a mower that has one', () => {
    const json = renderJson(
      <EquipmentCard equipment={makeEquipment({ driveType: 'self_propelled' })} />,
    );
    expect(json).toContain('Self-propelled');
  });

  it('omits the drive-type badge when there is none', () => {
    const json = renderJson(
      <EquipmentCard equipment={makeEquipment({ type: 'blower', driveType: undefined })} />,
    );
    expect(json).not.toContain('Self-propelled');
    expect(json).toContain('Blower');
  });
});
