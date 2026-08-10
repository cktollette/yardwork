import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import HocChip from './HocChip';

describe('HocChip', () => {
  it('renders the formatted height of cut', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<HocChip value={2.5} />);
    });
    expect(JSON.stringify(tree.toJSON())).toContain('2.5');
  });

  it('trims a whole-number height', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<HocChip value={3} />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('3');
    expect(json).not.toContain('3.0');
  });
});
