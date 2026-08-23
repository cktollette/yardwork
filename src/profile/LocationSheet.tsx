import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Button from '../components/Button';
import ChipRow from '../components/ChipRow';
import { propertyRepository } from '../mow/asyncStorageRepositories';
import type { Property } from '../mow/models';
import { colors, radii, spacing, typography } from '../theme';
import CountryPicker from './CountryPicker';
import {
  LOCATION_FIELD_MAX,
  USDA_ZONES,
  normalizeLocationPatch,
  resolveCountryName,
} from './location';

/**
 * The single sheet for the Property's disclosed location: city + region (text),
 * country (bundled searchable picker), and USDA hardiness zone (chip row). Save
 * normalizes (trim/cap; blank -> undefined; invalid code/zone dropped) and writes
 * through the property repo's write-queue (D-052). Mounted only while open, so it
 * seeds from the current property each time; Cancel/back writes nothing.
 */
export default function LocationSheet({
  property,
  onClose,
  onSaved,
}: {
  property: Property;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [city, setCity] = useState(property.locationCity ?? '');
  const [region, setRegion] = useState(property.locationRegion ?? '');
  const [country, setCountry] = useState<string | undefined>(property.locationCountry);
  const [zone, setZone] = useState<string | undefined>(property.hardinessZone);
  const [pickingCountry, setPickingCountry] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await propertyRepository.updateLocation(
        property.id,
        normalizeLocationPatch({
          locationCity: city,
          locationRegion: region,
          locationCountry: country,
          hardinessZone: zone,
        }),
      );
      onSaved();
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Location</Text>

          <View style={styles.field}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              maxLength={LOCATION_FIELD_MAX}
              placeholder="City"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
              accessibilityLabel="City"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>State / Region</Text>
            <TextInput
              style={styles.input}
              value={region}
              onChangeText={setRegion}
              maxLength={LOCATION_FIELD_MAX}
              placeholder="State / Region"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
              accessibilityLabel="State / Region"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Country</Text>
            <View style={styles.countryRow}>
              <Pressable
                onPress={() => setPickingCountry(true)}
                accessibilityRole="button"
                accessibilityLabel="Select country"
                style={[styles.input, styles.countryValue]}
              >
                <Text style={country ? styles.inputValue : styles.inputPlaceholder}>
                  {resolveCountryName(country) ?? 'Select country'}
                </Text>
              </Pressable>
              {country && (
                <Pressable
                  onPress={() => setCountry(undefined)}
                  accessibilityRole="button"
                  accessibilityLabel="Clear country"
                  hitSlop={8}
                >
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>USDA hardiness zone</Text>
            <ChipRow
              options={USDA_ZONES}
              selected={zone}
              onChange={setZone}
              clearable
              disabled={saving}
              accessibilityLabel={(z) => `Zone ${z}`}
            />
          </View>

          <Button label={saving ? 'Saving…' : 'Save'} variant="primary" fullWidth onPress={save} />
          <Button label="Cancel" variant="pill" fullWidth onPress={onClose} disabled={saving} />
        </ScrollView>
      </View>

      {pickingCountry && (
        <CountryPicker
          selectedCode={country}
          onSelect={(code) => {
            setCountry(code);
            setPickingCountry(false);
          }}
          onClose={() => setPickingCountry(false)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '90%',
  },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: typography.heading, fontWeight: '700', color: colors.ink },
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputValue: { fontSize: typography.body, color: colors.ink },
  inputPlaceholder: { fontSize: typography.body, color: colors.textMuted },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  countryValue: { flex: 1 },
  clear: { fontSize: typography.body, color: colors.primary, fontWeight: '600' },
});
