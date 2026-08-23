import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radii, spacing, typography } from '../theme';

export type PickerOption = {
  /** The stored value (e.g. an ISO country code or a state code). */
  readonly code: string;
  /** What the row shows (e.g. "Netherlands" or "TX - Texas"). */
  readonly label: string;
  /** Extra text matched by search beyond the label (e.g. a state's full name). */
  readonly keywords?: string;
};

/**
 * Generic fully-bundled searchable picker (no network). Renders `label`s and
 * reports the selected `code`. Shared by the country and US-state pickers.
 */
export default function SearchablePicker({
  options,
  selectedCode,
  onSelect,
  onClose,
  searchLabel,
}: {
  options: readonly PickerOption[];
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  searchLabel: string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.keywords ?? '').toLowerCase().includes(q) ||
          o.code.toLowerCase() === q,
      )
    : options;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder={searchLabel}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel={searchLabel}
          />
          <FlatList
            data={filtered}
            keyExtractor={(o) => o.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.code)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowText}>{item.label}</Text>
                {item.code === selectedCode && <Text style={styles.check}>Selected</Text>}
              </Pressable>
            )}
          />
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '80%',
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  rowText: { fontSize: typography.body, color: colors.ink },
  check: { fontSize: typography.caption, color: colors.primary, fontWeight: '600' },
  close: {
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
