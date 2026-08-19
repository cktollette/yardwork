import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { SHARE_CARD_SIZE } from './MowShareCard';

/**
 * Capture the referenced card view to a PNG and hand it to the native iOS share
 * sheet, then delete the temp file. Cleanup runs on success, cancel, AND error
 * alike (shareAsync resolves on both share and cancel, and any capture/share
 * failure is swallowed to a clean state), so no temp file is ever orphaned and
 * nothing throws back into the UI.
 *
 * Uses the modern expo-file-system File API (not /legacy) for the delete, in
 * line with the direction of chore #43.
 */
export async function captureAndShare(cardRef: RefObject<View | null>): Promise<void> {
  let uri: string | null = null;
  try {
    // Force an exact 1080x1080 PNG regardless of the on-screen preview scale.
    uri = await captureRef(cardRef, {
      format: 'png',
      width: SHARE_CARD_SIZE,
      height: SHARE_CARD_SIZE,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    }
  } catch {
    // Capture or share failed: degrade silently. The finally block cleans up.
  } finally {
    if (uri) {
      try {
        new File(uri).delete();
      } catch {
        // Already gone / not deletable: nothing to clean up.
      }
    }
  }
}
