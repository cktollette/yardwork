import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { generateId } from '../mow/id';
import type { PhotoStore } from './PhotoStore';

/**
 * Local-filesystem PhotoStore: copies picked images into an app-owned directory,
 * downscaled and re-encoded as JPEG. Uses expo-file-system's legacy API for the
 * idempotent `deleteAsync({ idempotent: true })` (a missing file is a no-op) and
 * expo-image-manipulator for the resize/compress.
 */

/** Longest-edge cap in px. Covers a full-screen detail view on a 3x device with
 *  headroom; these render as card thumbnails / detail, not print. */
const MAX_EDGE = 1600;
/** JPEG quality (0..1). 0.7 is a ~10x size cut with no visible thumbnail loss. */
const QUALITY = 0.7;
/** App-owned subdirectory under the document dir. */
const SUBDIR = 'mow-photos';

function storeDir(): string {
  return `${FileSystem.documentDirectory}${SUBDIR}/`;
}

export class FileSystemPhotoStore implements PhotoStore {
  async copyIntoStore(sourceUri: string): Promise<string> {
    // Re-encode: downscale + JPEG compress. The re-encode also STRIPS EXIF,
    // including the GPS tags a camera stamps on a home photo (D-057) — the
    // stored file carries no location metadata.
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_EDGE } }],
      { compress: QUALITY, format: SaveFormat.JPEG },
    );
    // mkdir -p semantics: intermediates:true does not throw when the dir exists.
    await FileSystem.makeDirectoryAsync(storeDir(), { intermediates: true });
    const dest = `${storeDir()}${generateId()}.jpg`;
    // Move the manipulator's temp output into the app dir (it's already a fresh
    // re-encoded file, so a move — not copy — leaves nothing behind).
    await FileSystem.moveAsync({ from: result.uri, to: dest });
    return dest;
  }

  async deleteFile(uri: string | undefined): Promise<void> {
    if (!uri) return; // nothing to delete
    // idempotent:true → a missing file resolves without throwing (D-027 rule).
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
