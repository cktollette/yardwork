import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ShareCardModal from './ShareCardModal';
import type { ShareCardModel } from './shareCardModel';

jest.mock('./captureAndShare', () => ({ captureAndShare: jest.fn().mockResolvedValue(undefined) }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { captureAndShare } = require('./captureAndShare');

const MODEL: ShareCardModel = {
  dateLabel: 'Jul 22, 2026',
  durationLabel: '00:30:00',
  tempLabel: '72F',
  toolsLabel: 'Mower',
  areaRing: { value: '5.0k', label: 'sq ft' },
  efficiencyRing: { value: '167', label: 'sq ft/min', progress: 0.5 },
};

describe('ShareCardModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Share hands off to captureAndShare', async () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<ShareCardModal model={MODEL} onClose={jest.fn()} />);
    });
    await act(async () => {
      tree.root.findByProps({ testID: 'share-confirm' }).props.onPress();
    });
    expect(captureAndShare).toHaveBeenCalledTimes(1);
  });

  it('Close invokes onClose without sharing', () => {
    const onClose = jest.fn();
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<ShareCardModal model={MODEL} onClose={onClose} />);
    });
    act(() => {
      tree.root.findByProps({ testID: 'share-close' }).props.onPress();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(captureAndShare).not.toHaveBeenCalled();
  });
});
