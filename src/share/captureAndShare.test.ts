import { captureAndShare } from './captureAndShare';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-file-system', () => {
  const mockDelete = jest.fn();
  return {
    File: jest.fn().mockImplementation(() => ({ delete: mockDelete })),
    mockDelete,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { captureRef } = require('react-native-view-shot');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sharing = require('expo-sharing');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { File, mockDelete } = require('expo-file-system');

const URI = 'file:///tmp/card.png';
const ref = { current: {} } as never; // captureRef is mocked, so the ref is opaque

beforeEach(() => {
  jest.clearAllMocks();
  Sharing.isAvailableAsync.mockResolvedValue(true);
  Sharing.shareAsync.mockResolvedValue(undefined);
});

describe('captureAndShare', () => {
  it('captures, hands the captured URI to the share sheet, then deletes it', async () => {
    captureRef.mockResolvedValue(URI);

    await captureAndShare(ref);

    expect(captureRef).toHaveBeenCalledWith(
      ref,
      expect.objectContaining({ format: 'png', width: 1080, height: 1080 }),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      URI,
      expect.objectContaining({ mimeType: 'image/png' }),
    );
    expect(File).toHaveBeenCalledWith(URI);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('still deletes the temp file when sharing rejects (cancel/error), never throws', async () => {
    captureRef.mockResolvedValue(URI);
    Sharing.shareAsync.mockRejectedValue(new Error('share failed'));

    await expect(captureAndShare(ref)).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('does not share and leaks nothing when the capture fails', async () => {
    captureRef.mockRejectedValue(new Error('capture failed'));

    await expect(captureAndShare(ref)).resolves.toBeUndefined();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(File).not.toHaveBeenCalled(); // no URI => nothing to clean up
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('cleans up the captured file even when sharing is unavailable', async () => {
    captureRef.mockResolvedValue(URI);
    Sharing.isAvailableAsync.mockResolvedValue(false);

    await captureAndShare(ref);

    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
