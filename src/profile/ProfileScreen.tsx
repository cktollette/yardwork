import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import StatRing from '../components/StatRing';
import { equipmentRepository } from '../equipment/asyncStorageRepositories';
import { coveredAreaSqFt, totalAreaSqFt } from '../lawn/zones';
import { mowRepository, propertyRepository } from '../mow/asyncStorageRepositories';
import type { Mow, Property } from '../mow/models';
import type { RootTabScreenProps } from '../mow/navigation';
import { deriveStats } from '../stats/deriveStats';
import { colors, radii, spacing, typography } from '../theme';
import LocationSheet from './LocationSheet';
import PencilIcon from './PencilIcon';
import { resolveCountryName } from './location';
import { formatProfileLocationLine, profileDisplayName } from './profileHeader';
import {
  garageSubtitle,
  mowsSubtitle,
  myLawnSubtitle,
  statisticsSubtitle,
} from './sections';

type Props = RootTabScreenProps<'Profile'>;

/** A Strava-style tappable section row with a live subtitle. */
function SectionRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>{'>'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const [property, setProperty] = useState<Property | null>(null);
  const [mows, setMows] = useState<Mow[] | null>(null);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    let active = true;
    Promise.all([
      propertyRepository.getOrCreateDefault(),
      mowRepository.listMows(),
      equipmentRepository.list(),
    ]).then(([prop, loadedMows, equipment]) => {
      if (!active) return;
      setProperty(prop);
      setMows(loadedMows);
      setEquipmentCount(equipment.length);
    });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(load);

  // First read in flight: render nothing rather than flash the fallback state.
  if (property === null || mows === null) return <View style={styles.container} />;

  const displayName = profileDisplayName(property);
  const locationLine = formatProfileLocationLine({
    city: property.locationCity,
    region: property.locationRegion,
    countryName: resolveCountryName(property.locationCountry),
    zone: property.hardinessZone,
    grassTypes: property.zones.map((z) => z.grassType),
  });

  const totalArea = totalAreaSqFt(property.zones);
  const areaSqFt = totalArea > 0 ? totalArea : null;
  const stats = deriveStats(
    mows.map((m) => ({ ...m, coveredAreaSqFt: coveredAreaSqFt(m.zoneIds, property.zones) })),
    { areaSqFt, now: Date.now() },
  );
  const lastMowStartedAt = mows.length > 0 ? mows[0].startedAt : null; // newest-first

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header: name + tappable location/identity line. */}
      <View style={styles.header}>
        <Text style={styles.name}>{displayName}</Text>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit location"
          style={({ pressed }) => pressed && styles.pressed}
        >
          {locationLine ? (
            // The line wraps (no numberOfLines cap); a muted pencil icon trails it
            // inside the same tap target. (The ASCII rule governs text strings, not
            // vector icons.)
            <View style={styles.locationRow}>
              <Text style={styles.location}>{locationLine}</Text>
              <PencilIcon />
            </View>
          ) : (
            // No fields yet: a discoverable placeholder row in the same slot.
            <Text style={styles.locationEmpty}>Add location</Text>
          )}
        </Pressable>
      </View>

      {/* Stats block — reuses deriveStats; distance is gated on activity data. */}
      <Card>
        <Text style={styles.cardLabel}>Stats</Text>
        <View style={styles.rings}>
          <StatRing value={stats.lifetimeMows} label="mows" />
          <StatRing value={stats.lifetimeHours.toFixed(1)} label="hours" />
          <StatRing value={stats.currentStreakWeeks} label="streak" />
          {stats.lifetimeDistanceMi !== null ? (
            <StatRing value={stats.lifetimeDistanceMi.toFixed(1)} label="miles" />
          ) : null}
        </View>
        {stats.lifetimeDistanceMi === null && (
          <Text style={styles.hint}>
            Mow with your phone or watch on you to track distance.
          </Text>
        )}
        {/* Mow Trend Chart slot (future) — intentionally left empty this branch. */}
      </Card>

      {/* Sections list. */}
      <Card>
        <SectionRow
          title="Statistics"
          subtitle={statisticsSubtitle(stats)}
          onPress={() => navigation.navigate('Statistics')}
        />
        <SectionRow
          title="Mows"
          subtitle={mowsSubtitle(lastMowStartedAt, Date.now())}
          onPress={() => navigation.navigate('Log')}
        />
        <SectionRow
          title="My Lawn"
          subtitle={myLawnSubtitle(property.zones.length, totalArea)}
          onPress={() => navigation.navigate('Lawn')}
        />
        <SectionRow
          title="Garage"
          subtitle={garageSubtitle(equipmentCount)}
          onPress={() => navigation.navigate('Garage')}
        />
      </Card>

      {sheetOpen && (
        <LocationSheet
          property={property}
          onClose={() => setSheetOpen(false)}
          onSaved={load}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.xs },
  name: { fontSize: typography.titleLarge, fontWeight: '700', color: colors.ink },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  location: { flex: 1, fontSize: typography.body, color: colors.textSecondary },
  locationEmpty: { fontSize: typography.body, color: colors.primary },
  cardLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  rings: { flexDirection: 'row', justifyContent: 'space-around' },
  hint: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.7 },
  rowText: { gap: spacing.xs },
  rowTitle: { fontSize: typography.body, fontWeight: '600', color: colors.ink },
  rowSubtitle: { fontSize: typography.bodySmall, color: colors.textSecondary },
  chevron: { fontSize: typography.heading, color: colors.textMuted },
});
