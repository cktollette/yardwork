import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import PhotoSlots, { type PhotoSlot } from './PhotoSlots';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImagePicker = require('expo-image-picker');

function render(node: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(node);
  });
  return tree;
}

/** Press a slot's affordance and then invoke one of the resulting action-sheet buttons. */
async function pressAddThenChoose(
  tree: ReactTestRenderer,
  addLabel: string,
  buttonText: string,
): Promise<void> {
  act(() => {
    tree.root.findByProps({ accessibilityLabel: addLabel }).props.onPress();
  });
  const spy = Alert.alert as jest.Mock;
  const buttons = spy.mock.calls[spy.mock.calls.length - 1][2] as Array<{
    text: string;
    onPress?: () => void | Promise<void>;
  }>;
  const button = buttons.find((b) => b.text === buttonText);
  if (!button) throw new Error(`No action-sheet button "${buttonText}"`);
  await act(async () => {
    await button.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
});

describe('PhotoSlots', () => {
  it('shows an Add affordance for each empty slot', () => {
    const tree = render(<PhotoSlots before={undefined} after={undefined} onChange={() => {}} />);
    expect(tree.root.findByProps({ accessibilityLabel: 'Add before photo' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Add after photo' })).toBeTruthy();
  });

  it('picks from the library and reports the temp URI for that slot', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/lib.jpg' }],
    });
    const onChange = jest.fn<void, [PhotoSlot, string | undefined]>();
    const tree = render(<PhotoSlots before={undefined} after={undefined} onChange={onChange} />);

    await pressAddThenChoose(tree, 'Add before photo', 'Choose from library');

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('before', 'file:///tmp/lib.jpg');
  });

  it('captures from the camera and reports the temp URI', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/cam.jpg' }],
    });
    const onChange = jest.fn();
    const tree = render(<PhotoSlots before={undefined} after={undefined} onChange={onChange} />);

    await pressAddThenChoose(tree, 'Add after photo', 'Take photo');

    expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('after', 'file:///tmp/cam.jpg');
  });

  it('reports nothing when the picker is canceled', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    const onChange = jest.fn();
    const tree = render(<PhotoSlots before={undefined} after={undefined} onChange={onChange} />);

    await pressAddThenChoose(tree, 'Add before photo', 'Choose from library');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not launch or report when permission is denied', async () => {
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const onChange = jest.fn();
    const tree = render(<PhotoSlots before={undefined} after={undefined} onChange={onChange} />);

    await pressAddThenChoose(tree, 'Add before photo', 'Choose from library');

    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a filled slot as a thumbnail and clears it on Remove', () => {
    const onChange = jest.fn();
    const tree = render(
      <PhotoSlots before={'file:///app/mow-photos/b.jpg'} after={undefined} onChange={onChange} />,
    );
    // Thumbnail shows the stored URI…
    expect(tree.root.findByProps({ testID: 'photo-before' }).props.source).toEqual({
      uri: 'file:///app/mow-photos/b.jpg',
    });
    // …and the OTHER slot is still empty.
    expect(tree.root.findByProps({ accessibilityLabel: 'Add after photo' })).toBeTruthy();

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Remove before photo' }).props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('before', undefined);
  });
});
