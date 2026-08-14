import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

/** The minimal zone shape the picker needs. */
export type PickerZone = { id: string; name: string };

type Props = {
  /** The property's zones (render one chip each). */
  zones: PickerZone[];
  /** Currently-selected zone ids. */
  selectedIds: string[];
  onToggle: (zoneId: string) => void;
  disabled?: boolean;
};

/**
 * Multi-select zone chips for "which zones did this mow cover" — modeled on
 * ToolTypePicker (the multi-select chip pattern; ChipRow is single-select).
 * All zones selected = the whole lawn (the save/edit flow collapses that to an
 * absent zoneIds; see models.ts).
 *
 * Minimum-one invariant: the last remaining selected chip is disabled, so a mow
 * can never cover zero zones. Prevention at the source — no empty state, no
 * save-time error (D-031: no friction at save). Single-zone lawns don't render
 * this at all; that suppression lives in the screens.
 */
export default function ZonePicker({ zones, selectedIds, onToggle, disabled = false }: Props) {
  const chosen = new Set(selectedIds);
  return (
    <View style={styles.row} accessibilityLabel="Zones covered">
      {zones.map((zone) => {
        const isSelected = chosen.has(zone.id);
        // Can't deselect the only selected zone — keeps at least one.
        const locked = isSelected && selectedIds.length === 1;
        const isDisabled = disabled || locked;
        return (
          <Pressable
            key={zone.id}
            onPress={() => onToggle(zone.id)}
            disabled={isDisabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled: isDisabled }}
            accessibilityLabel={zone.name}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.pressed,
              isDisabled && styles.disabled,
            ]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{zone.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  label: { fontSize: typography.bodySmall, color: colors.ink, fontWeight: '600' },
  labelSelected: { color: colors.textOnColor },
});
