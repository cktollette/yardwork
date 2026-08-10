import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Button, { type ButtonVariant } from './Button';

const VARIANTS: ButtonVariant[] = ['primary', 'pill', 'destructive'];

describe('Button', () => {
  it('renders its label for each variant', () => {
    for (const variant of VARIANTS) {
      let tree!: ReactTestRenderer;
      act(() => {
        tree = create(
          <Button label={`Go ${variant}`} variant={variant} onPress={() => {}} />,
        );
      });
      expect(JSON.stringify(tree.toJSON())).toContain(`Go ${variant}`);
    }
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<Button label="Tap" variant="primary" onPress={onPress} />);
    });
    act(() => {
      tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('marks the pressable disabled when disabled', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <Button label="Nope" variant="primary" disabled onPress={() => {}} />,
      );
    });
    expect(
      tree.root.findByProps({ accessibilityRole: 'button' }).props.disabled,
    ).toBe(true);
  });
});
