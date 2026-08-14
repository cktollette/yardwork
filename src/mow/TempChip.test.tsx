import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import TempChip from './TempChip';

describe('TempChip', () => {
  it('renders the formatted temperature with its unit', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<TempChip tempF={72} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('72°F');
  });

  it('renders a 0°F reading (not dropped as falsy)', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<TempChip tempF={0} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('0°F');
  });
});
