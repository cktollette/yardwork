import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '../theme';

type Props = {
  value: string | number;
  label: string;
  size?: number;
  /** Arc / ring color (the filled portion). */
  ringColor?: string;
  /**
   * Progress as a fraction 0..1. Omit for a full ring (the historical
   * behavior). Values outside the range are clamped, so >1 renders a full ring
   * and <0 renders an empty one. When provided, an unfilled track is drawn
   * behind the arc.
   */
  progress?: number;
  /** Unfilled-track color, only shown when `progress` is provided. */
  trackColor?: string;
  /** Value font size. Defaults to the app ring size; the share card scales it up. */
  valueFontSize?: number;
  /** Label font size. Defaults to the app ring size; the share card scales it up. */
  labelFontSize?: number;
  /** Arc stroke width. Defaults to the app ring weight; the card scales it up. */
  strokeWidth?: number;
  /** Gap between the ring and its label. Defaults to the app spacing. */
  gap?: number;
};

const DEFAULT_SIZE = 72;
// Default stroke: matches the Grint-style arc weight and keeps arc geometry
// deterministic for the render tests. Overridable via `strokeWidth`.
const DEFAULT_STROKE_WIDTH = 6;

/**
 * Circular stat display: a value centered inside a colored ring, with a label
 * beneath. Rendered as an SVG arc (react-native-svg) so it can show partial
 * progress. With no `progress` it draws a full ring, matching the original
 * bordered-circle look it replaces; with `progress` it fills clockwise from the
 * top over an unfilled track.
 */
export default function StatRing({
  value,
  label,
  size = DEFAULT_SIZE,
  ringColor = colors.primary,
  progress,
  trackColor = colors.sand,
  valueFontSize = typography.title,
  labelFontSize = typography.caption,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  gap = 6,
}: Props) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const hasProgress = typeof progress === 'number';
  const fraction = hasProgress ? Math.max(0, Math.min(1, progress as number)) : 1;
  const dashOffset = circumference * (1 - fraction);

  return (
    <View style={[styles.wrap, { gap }]}>
      <View style={{ width: size, height: size }}>
        {/* Arcs start at 3 o'clock in SVG; rotate the whole canvas -90deg so
            progress fills from the top. The value overlay is a sibling, so it
            stays upright. */}
        <Svg
          width={size}
          height={size}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {hasProgress && (
            <Circle
              testID="statring-track"
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={strokeWidth}
            />
          )}
          <Circle
            testID="statring-arc"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={[styles.value, { fontSize: valueFontSize }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      <Text style={[styles.label, { fontSize: labelFontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
});
