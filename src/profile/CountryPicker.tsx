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
import { COUNTRIES } from './location';
import { colors, radii, spacing, typography } from '../theme';

/**
 * Searchable, fully-bundled country picker (no network). Renders display names;
 * `onSelect` reports the ISO 3166-1 alpha-2 CODE, which is what gets stored.
 */
export default function CountryPicker({
  selectedCode,
  onSelect,
  onClose,
}: {
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const filtered = q
    ? COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
      )
    : COUNTRIES;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel="Search countries"
          />
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item.code)}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Text style={styles.rowText}>{item.name}</Text>
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
