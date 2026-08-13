jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///tmp/manip.jpg', width: 1600, height: 1200 }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
jest.mock('../mow/id', () => ({ generateId: jest.fn(() => 'gen-id-1') }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSystem = require('expo-file-system/legacy');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { manipulateAsync } = require('expo-image-manipulator');
import { FileSystemPhotoStore } from './FileSystemPhotoStore';

beforeEach(() => jest.clearAllMocks());

describe('FileSystemPhotoStore.copyIntoStore', () => {
  it('downscales + JPEG-compresses the source (re-encode strips EXIF)', async () => {
    await new FileSystemPhotoStore().copyIntoStore('file:///picker/tmp.jpg');
    expect(manipulateAsync).toHaveBeenCalledWith(
      'file:///picker/tmp.jpg',
      [{ resize: { width: 1600 } }],
      { compress: 0.7, format: 'jpeg' },
    );
  });

  it('ensures the app-owned dir exists (idempotent mkdir -p)', async () => {
    await new FileSystemPhotoStore().copyIntoStore('file:///picker/tmp.jpg');
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('file:///doc/mow-photos/', {
      intermediates: true,
    });
  });

  it('moves the re-encoded file into the app dir and returns its stable URI', async () => {
    const uri = await new FileSystemPhotoStore().copyIntoStore('file:///picker/tmp.jpg');
    expect(FileSystem.moveAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/manip.jpg',
      to: 'file:///doc/mow-photos/gen-id-1.jpg',
    });
    expect(uri).toBe('file:///doc/mow-photos/gen-id-1.jpg');
  });
});

describe('FileSystemPhotoStore.deleteFile', () => {
  it('deletes with idempotent:true so a missing file never throws', async () => {
    await new FileSystemPhotoStore().deleteFile('file:///doc/mow-photos/x.jpg');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///doc/mow-photos/x.jpg', {
      idempotent: true,
    });
  });

  it('is a no-op for an empty or undefined URI (never calls deleteAsync)', async () => {
    await new FileSystemPhotoStore().deleteFile(undefined);
    await new FileSystemPhotoStore().deleteFile('');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
