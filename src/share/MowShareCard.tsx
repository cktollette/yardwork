import { StyleSheet, Text, View } from 'react-native';
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

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function MowShareCard({ model }: { model: ShareCardModel }) {
  const rings = [model.areaRing, model.efficiencyRing].filter(
    (r): r is ShareCardRing => r !== null,
  );

  return (
    <View style={styles.card} testID="share-card">
      <View style={styles.header}>
        <Text style={styles.wordmark}>Klippa</Text>
        <Text style={styles.url}>getklippa.com</Text>
      </View>

      <Text style={styles.date} testID="share-card-date">
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
            />
          )}
        </View>
      )}

      <View style={styles.stats}>
        <StatLine label="Time" value={model.durationLabel} />
        {model.tempLabel !== null && <StatLine label="Temp" value={model.tempLabel} />}
        {model.toolsLabel !== null && <StatLine label="Tools" value={model.toolsLabel} />}
      </View>
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
});
