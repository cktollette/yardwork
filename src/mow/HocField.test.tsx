import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import HocField from './HocField';
import { HOC_GUIDANCE_TITLE } from './hocGuidance';

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

describe('HocField', () => {
  it('shows the Set HOC affordance when unset', () => {
    const tree = render(<HocField value={undefined} onChange={() => {}} />);
    expect(JSON.stringify(tree.toJSON())).toContain('Set HOC');
  });

  it('seeds a default HOC when Set HOC is pressed', () => {
    const onChange = jest.fn();
    const tree = render(<HocField value={undefined} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Set height of cut' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('renders the formatted value when set', () => {
    const tree = render(<HocField value={2.5} onChange={() => {}} />);
    // The value Text carries the formatted HOC as its accessibility label.
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Height of cut 2.5"' }),
    ).toBeTruthy();
  });

  it('steps up and down by a quarter inch', () => {
    const onChange = jest.fn();
    const tree = render(<HocField value={2.5} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Increase height of cut' }).props.onPress();
    });
    expect(onChange).toHaveBeenLastCalledWith(2.75);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Decrease height of cut' }).props.onPress();
    });
    expect(onChange).toHaveBeenLastCalledWith(2.25);
  });

  it('clears back to unset', () => {
    const onChange = jest.fn();
    const tree = render(<HocField value={2.5} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Clear height of cut' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('disables the increase stepper at the maximum', () => {
    const tree = render(<HocField value={4.5} onChange={() => {}} />);
    expect(
      tree.root.findByProps({ accessibilityLabel: 'Increase height of cut' }).props.disabled,
    ).toBe(true);
  });
});

describe('HocField — cut-height info affordance', () => {
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alertSpy.mockRestore());

  it('does not show guidance before the info icon is tapped', () => {
    render(<HocField value={undefined} onChange={() => {}} />);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows the cut-height guidance when the info icon is tapped', () => {
    const tree = render(<HocField value={2.5} onChange={() => {}} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'About height of cut' }).props.onPress();
    });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe(HOC_GUIDANCE_TITLE);
    // The actual educational copy, not just that a call happened.
    expect(body).toContain('vary by brand and model');
    expect(body).toContain('never cut more than ⅓');
  });

  it('tapping the info icon never calls onChange (no disruption to value/seeding)', () => {
    const onChange = jest.fn();
    const tree = render(<HocField value={undefined} onChange={onChange} />);
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'About height of cut' }).props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
