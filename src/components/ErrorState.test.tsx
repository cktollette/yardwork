import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ErrorState from './ErrorState';

function render(onRetry: () => void): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ErrorState onRetry={onRetry} />);
  });
  return tree;
}

it('renders a message and a Retry action', () => {
  const tree = render(jest.fn());
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain("Couldn't load");
  expect(json).toContain('Retry');
});

it('invokes onRetry when Retry is pressed', () => {
  const onRetry = jest.fn();
  const tree = render(onRetry);
  act(() => {
    tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
  });
  expect(onRetry).toHaveBeenCalledTimes(1);
});
