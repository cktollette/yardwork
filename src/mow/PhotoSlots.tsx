import { useCallback } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, radii, spacing, typography } from '../theme';

/** The two fixed slots (D-057) — not a list. */
export type PhotoSlot = 'before' | 'after';

type Props = {
  before: string | undefined;
  after: string | undefined;
  /** Set a slot to a freshly-picked source URI, or clear it with `undefined`. */
  onChange: (slot: PhotoSlot, uri: string | undefined) => void;
  disabled?: boolean;
};

const LABELS: Record<PhotoSlot, string> = { before: 'Before', after: 'After' };

/**
 * Launch the camera or library for one slot. Returns the picked SOURCE (temp)
 * URI, or undefined when the user cancels or denies permission. The temp URI is
 * copied into app-owned storage by the repository at save time — this component
 * never touches the file store.
 */
async function pickImage(source: 'camera' | 'library'): Promise<string | undefined> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      source === 'camera' ? 'Camera access needed' : 'Photo access needed',
      'Enable access in Settings to add a photo.',
    );
    return undefined;
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return undefined;
  return result.assets[0].uri;
}

/**
 * Two optional before/after photo slots for a mow. Empty slots show an "Add"
 * affordance (camera or library); filled slots show a thumbnail that can be
 * replaced (tap) or removed. Value/persistence live in the repository + the
 * PhotoStore; this is presentation + picker orchestration only.
 */
export default function PhotoSlots({ before, after, onChange, disabled = false }: Props) {
  const pickInto = useCallback(
    (slot: PhotoSlot) => {
      Alert.alert(`${LABELS[slot]} photo`, undefined, [
        {
          text: 'Take photo',
          onPress: async () => {
            const uri = await pickImage('camera');
            if (uri) onChange(slot, uri);
          },
        },
        {
          text: 'Choose from library',
          onPress: async () => {
            const uri = await pickImage('library');
            if (uri) onChange(slot, uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [onChange],
  );

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>Photos (optional)</Text>
      <View style={styles.row}>
        {(['before', 'after'] as PhotoSlot[]).map((slot) => {
          const uri = slot === 'before' ? before : after;
          return (
            <View key={slot} style={styles.slot}>
              <Text style={styles.slotLabel}>{LABELS[slot]}</Text>
              {uri ? (
                <View>
                  <Pressable
                    onPress={() => pickInto(slot)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Replace ${slot} photo`}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.thumb}
                      accessibilityLabel={`${slot} photo`}
                      testID={`photo-${slot}`}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => onChange(slot, undefined)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${slot} photo`}
                    style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                  >
                    <Text style={styles.removeLabel}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => pickInto(slot)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${slot} photo`}
                  style={({ pressed }) => [styles.add, pressed && styles.pressed]}
                >
                  <Text style={styles.addLabel}>Add photo</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  fieldLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  slot: { flex: 1, gap: spacing.xs },
  slotLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  add: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { fontSize: typography.bodySmall, color: colors.ink, fontWeight: '600' },
  remove: { paddingVertical: spacing.xs, alignItems: 'center' },
  removeLabel: { fontSize: typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
