import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { captureAndShare } from './captureAndShare';
import MowShareCard, { SHARE_CARD_SIZE } from './MowShareCard';
import type { ShareCardModel } from './shareCardModel';
import { colors, radii, spacing, typography } from '../theme';

/**
 * Preview-before-share modal: the user sees the exact card, then Share hands it
 * to the native sheet or Close backs out. The on-screen preview is a scaled copy
 * of the card; the capture target is a separate full-size (1080) copy rendered
 * off-screen, so the PNG is full-fidelity regardless of the preview scale.
 *
 * Cancel/failure cleanliness lives in captureAndShare (temp file always deleted,
 * never throws); Close simply dismisses. No stuck modal, no orphaned file.
 */
export default function ShareCardModal({
  model,
  onClose,
}: {
  model: ShareCardModel;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { width } = useWindowDimensions();
  const previewSize = Math.min(width - spacing.xl * 2, 360);
  const scale = previewSize / SHARE_CARD_SIZE;

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await captureAndShare(cardRef);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Share your mow</Text>

          <View style={[styles.previewBox, { width: previewSize, height: previewSize }]}>
            <View style={[styles.previewInner, { transform: [{ scale }] }]}>
              <MowShareCard model={model} />
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={sharing}
              style={[styles.btn, styles.btnGhost]}
              testID="share-close"
              accessibilityRole="button"
            >
              <Text style={styles.btnGhostText}>Close</Text>
            </Pressable>
            <Pressable
              onPress={onShare}
              disabled={sharing}
              style={[styles.btn, styles.btnPrimary, sharing && styles.btnDisabled]}
              testID="share-confirm"
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>{sharing ? 'Sharing...' : 'Share'}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Off-screen full-size capture target (true 1080 layout). */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={cardRef} collapsable={false}>
          <MowShareCard model={model} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.ink,
  },
  previewBox: {
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: 'top left',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnGhostText: { fontSize: typography.body, fontWeight: '600', color: colors.ink },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: typography.body, fontWeight: '700', color: colors.textOnColor },
  btnDisabled: { opacity: 0.5 },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
