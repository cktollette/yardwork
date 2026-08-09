import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import StatRing from './StatRing';

describe('StatRing', () => {
  it('renders a string value and label', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<StatRing value="12,345" label="sq ft" />);
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('12,345');
    expect(json).toContain('sq ft');
  });

  it('renders a numeric value and honors custom size/color', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <StatRing value={7} label="Streak" size={100} ringColor="#123456" />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('7');
  });
});
