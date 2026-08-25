import { Image, StyleSheet, Text, View } from 'react-native';
import StatRing from '../components/StatRing';
import { colors } from '../theme';
import type { ShareCardModel, ShareCardRing } from './shareCardModel';

/**
 * The branded 1:1 stats card rendered to an image for sharing. Pure and
 * presentational: it renders the view-model from buildShareCardModel and nothing
 * else. Fixed pixel size so the capture is deterministic across devices; the
 * preview scales this down to fit the screen. Reuses StatRing with card-scale
 * typography (the app-default fonts were illegibly small at 1080).
 *
 * Two variants: the default cream card, and a PHOTO variant when the mow has an
 * after photo (the stored, downscaled, EXIF-stripped slot, D-057) rendered as the
 * full-bleed background under a scrim with light text. In the photo variant the
 * wordmark + URL are bottom-anchored (ad-hero framing); the no-photo variant is
 * unchanged (wordmark top).
 *
 * Copy is ASCII-only by rule (no degree sign / em dash / non-ASCII separators).
 */

/** The card's fixed edge in pixels (square, social-ready). */
export const SHARE_CARD_SIZE = 1080;

// Card-scale ring geometry, tuned for legibility on the 1080 canvas (the
// StatRing app defaults are 300/18/13/6/6). Kept as constants for one-place
// tuning during the render smoke.
const RING_SIZE = 360;
const RING_VALUE_FONT_SIZE = 120;
const RING_LABEL_FONT_SIZE = 42;
const RING_STROKE_WIDTH = 18;
const RING_GAP = 16;

// Solid uniform scrim over the after photo. A gradient would leave the CENTER
// rings illegible over a busy photo, so the whole card is dimmed. One-place
// tunable during the smoke (0.35 vs 0.45 judged by eye on the rendered card).
const SCRIM_OPACITY = 0.35;

// Light-on-photo palette.
const ON_PHOTO_TEXT = '#FFFFFF';
const ON_PHOTO_SECONDARY = 'rgba(255,255,255,0.85)';
const ON_PHOTO_BORDER = 'rgba(255,255,255,0.35)';

function StatLine({ label, value, light }: { label: string; value: string; light: boolean }) {
  return (
    <View style={[styles.statLine, light && { borderTopColor: ON_PHOTO_BORDER }]}>
      <Text style={[styles.statLabel, light && styles.onPhotoSecondary]}>{label}</Text>
      <Text style={[styles.statValue, light && styles.onPhotoText]}>{value}</Text>
    </View>
  );
}

export default function MowShareCard({ model }: { model: ShareCardModel }) {
  const rings = [model.areaRing, model.efficiencyRing].filter(
    (r): r is ShareCardRing => r !== null,
  );
  const hasPhoto = model.backgroundPhotoUri !== null;

  const wordmark = (
    <View style={styles.header}>
      <Text style={[styles.wordmark, hasPhoto && styles.onPhotoText]}>Klippa</Text>
      <Text style={[styles.url, hasPhoto && styles.onPhotoSecondary]}>getklippa.com</Text>
    </View>
  );

  const body = (
    <>
      <Text style={[styles.date, hasPhoto && styles.onPhotoText]} testID="share-card-date">
        {model.dateLabel}
      </Text>

      {rings.length > 0 && (
        <View style={styles.rings}>
          {model.areaRing && (
            <StatRing
              value={model.areaRing.value}
              label={model.areaRing.label}
              size={RING_SIZE}
              valueFontSize={RING_VALUE_FONT_SIZE}
              labelFontSize={RING_LABEL_FONT_SIZE}
              strokeWidth={RING_STROKE_WIDTH}
              gap={RING_GAP}
              valueColor={hasPhoto ? ON_PHOTO_TEXT : undefined}
              labelColor={hasPhoto ? ON_PHOTO_SECONDARY : undefined}
            />
          )}
          {model.efficiencyRing && (
            <StatRing
              value={model.efficiencyRing.value}
              label={model.efficiencyRing.label}
              progress={model.efficiencyRing.progress}
              size={RING_SIZE}
              valueFontSize={RING_VALUE_FONT_SIZE}
              labelFontSize={RING_LABEL_FONT_SIZE}
              strokeWidth={RING_STROKE_WIDTH}
              gap={RING_GAP}
              valueColor={hasPhoto ? ON_PHOTO_TEXT : undefined}
              labelColor={hasPhoto ? ON_PHOTO_SECONDARY : undefined}
            />
          )}
        </View>
      )}

      <View style={styles.stats}>
        <StatLine label="Time" value={model.durationLabel} light={hasPhoto} />
        {model.tempLabel !== null && <StatLine label="Temp" value={model.tempLabel} light={hasPhoto} />}
        {model.toolsLabel !== null && <StatLine label="Tools" value={model.toolsLabel} light={hasPhoto} />}
      </View>
    </>
  );

  return (
    <View style={styles.card} testID="share-card">
      {hasPhoto && (
        <>
          {/* Full-bleed background; cover center-crops a non-square source onto
              the square canvas. */}
          <Image
            source={{ uri: model.backgroundPhotoUri as string }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            testID="share-card-photo"
          />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${SCRIM_OPACITY})` }]}
            testID="share-card-scrim"
          />
        </>
      )}

      {hasPhoto ? (
        // Photo variant: content grouped at the top, wordmark bottom-anchored.
        <>
          <View style={styles.photoBody}>{body}</View>
          {wordmark}
        </>
      ) : (
        // Default variant: unchanged (wordmark top).
        <>
          {wordmark}
          {body}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed-size social card. Not app chrome, so geometry is explicit px, not the
  // spacing scale.
  card: {
    width: SHARE_CARD_SIZE,
    height: SHARE_CARD_SIZE,
    backgroundColor: colors.cream,
    paddingHorizontal: 80,
    paddingVertical: 72,
    justifyContent: 'space-between',
  },
  photoBody: { gap: 56 },
  header: { alignItems: 'center' },
  wordmark: { fontSize: 84, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  url: { fontSize: 30, fontWeight: '600', color: colors.textSecondary, marginTop: 6 },
  date: { fontSize: 56, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  rings: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 72,
  },
  stats: { gap: 20 },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: colors.sand,
    paddingTop: 18,
  },
  statLabel: { fontSize: 40, fontWeight: '600', color: colors.textSecondary },
  statValue: { fontSize: 40, fontWeight: '700', color: colors.ink },
  onPhotoText: { color: ON_PHOTO_TEXT },
  onPhotoSecondary: { color: ON_PHOTO_SECONDARY },
});
