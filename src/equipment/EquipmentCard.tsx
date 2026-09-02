import { Pressable, StyleSheet, Text, View } from 'react-native';
import Card from '../components/Card';
import { colors, radii, spacing, typography } from '../theme';
import { driveTypeLabel, equipmentTypeLabel, powerSourceLabel } from './catalog';
import { displayName } from './equipment';
import type { Equipment } from './models';

type Props = {
  equipment: Equipment;
  onPress?: () => void;
};

/** A small pill badge for one equipment attribute. */
function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

/**
 * One equipment item: its display name (nickname, else brand+model), the type,
 * and attribute badges (power source always; drive type when set — mowers only).
 * Wrapped in the shared Card; pressable when an onPress is provided.
 */
export default function EquipmentCard({ equipment, onPress }: Props) {
  const body = (
    <Card>
      <Text style={styles.name}>{displayName(equipment)}</Text>
      <Text style={styles.type}>{equipmentTypeLabel(equipment.type)}</Text>
      <View style={styles.badges}>
        <Badge text={powerSourceLabel(equipment.powerSource)} />
        {equipment.driveType != null ? (
          <Badge text={driveTypeLabel(equipment.driveType)} />
        ) : null}
      </View>
    </Card>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={displayName(equipment)}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.ink,
  },
  type: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
});
