import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Card from './Card';

describe('Card', () => {
  it('renders its children', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <Card>
          <Text>Inside the card</Text>
        </Card>,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Inside the card');
  });

  it('accepts a style override without dropping children', () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(
        <Card style={{ margin: 8 }}>
          <Text>Styled child</Text>
        </Card>,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Styled child');
  });
});
