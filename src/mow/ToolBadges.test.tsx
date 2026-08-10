import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ToolBadges from './ToolBadges';

function renderJson(node: React.ReactElement): string {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return JSON.stringify(tree.toJSON());
}

describe('ToolBadges', () => {
  it('renders a short-label pill per type', () => {
    const json = renderJson(<ToolBadges types={['mower', 'trimmer', 'blower']} />);
    expect(json).toContain('Mow');
    expect(json).toContain('Trim');
    expect(json).toContain('Blow');
  });

  it('renders nothing when there are no types', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<ToolBadges types={[]} />);
    });
    expect(tree.toJSON()).toBeNull();
  });
});
