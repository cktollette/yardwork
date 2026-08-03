import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import type { RootStackParamList } from '../mow/navigation';
import { hasLawn } from '../lawn/prompts';
import { deriveStats, MIN_MOWS_FOR_AVERAGES, type Stats } from './deriveStats';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

function weeks(n: number): string {
  return `${n} ${n === 1 ? 'week' : 'weeks'}`;
}

/** One label/value line. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

/** A locked section: shows the unlock hint in place of the gated stats. */
function LockedHint({ text }: { text: string }) {
  return <Text style={styles.hint}>{text}</Text>;
}

export default function StatsScreen({ navigation }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [property, setProperty] = useState<Property | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        mowRepository.listMows(),
        propertyRepository.getOrCreateDefault(),
      ]).then(([mows, prop]) => {
        if (!active) return;
        setProperty(prop);
        // The lawn area (once drawn) unlocks the area-based stats; until then
        // it's null and those stats stay gated behind "Draw your lawn".
        setStats(
          deriveStats(mows, { areaSqFt: prop.areaSqFt ?? null, now: Date.now() }),
        );
      });
      return () => {
        active = false;
      };
    }, []),
  );

  // First read in flight: render nothing rather than a flash of empty stats.
  if (stats === null || property === null) return <View style={styles.container} />;

  const lawnDrawn = hasLawn(property.boundary);

  const averagesLocked = stats.avgDaysBetweenMows === null;
  const remainingForAverages = Math.max(0, MIN_MOWS_FOR_AVERAGES - stats.lifetimeMows);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lawn</Text>
        {lawnDrawn ? (
          <>
            <StatRow
              label="Area"
              value={`${Math.round(property.areaSqFt as number).toLocaleString()} sq ft`}
            />
            <Pressable
              onPress={() =>
                navigation.navigate('LawnDraw', {
                  propertyId: property.id,
                  mode: 'edit',
                })
              }
              accessibilityRole="button"
            >
              <Text style={styles.lawnLink}>Edit lawn</Text>
            </Pressable>
          </>
        ) : (
          <>
            <LockedHint text="Draw your lawn to unlock area & efficiency stats" />
            <Pressable
              onPress={() =>
                navigation.navigate('LawnDraw', {
                  propertyId: property.id,
                  mode: 'create',
                })
              }
              style={({ pressed }) => [styles.lawnCta, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.lawnCtaText}>Draw your lawn</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lifetime</Text>
        <StatRow label="Mows" value={String(stats.lifetimeMows)} />
        <StatRow label="Time" value={`${stats.lifetimeHours.toFixed(1)} h`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cadence</Text>
        {averagesLocked ? (
          <LockedHint
            text={`Log ${remainingForAverages} more mow${
              remainingForAverages === 1 ? '' : 's'
            } to unlock averages`}
          />
        ) : (
          <>
            <StatRow
              label="Avg days between mows"
              value={(stats.avgDaysBetweenMows as number).toFixed(1)}
            />
            <StatRow
              label="Mows / week (30d)"
              value={(stats.avgMowsPerWeek30d as number).toFixed(1)}
            />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Streaks</Text>
        <StatRow label="Current" value={weeks(stats.currentStreakWeeks)} />
        <StatRow label="Longest" value={weeks(stats.longestStreakWeeks)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Efficiency</Text>
        {stats.sqFtPerMinute === null ? (
          <LockedHint text="Draw your lawn to unlock efficiency" />
        ) : (
          <>
            <StatRow
              label="Area mowed"
              value={`${Math.round(stats.lifetimeAreaSqFt as number).toLocaleString()} sq ft`}
            />
            <StatRow
              label="Efficiency"
              value={`${Math.round(stats.sqFtPerMinute).toLocaleString()} sq ft/min`}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 16,
    color: '#374151',
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  lawnLink: {
    fontSize: 15,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 2,
  },
  lawnCta: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#16a34a',
  },
  lawnCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
