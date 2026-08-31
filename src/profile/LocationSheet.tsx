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
import SearchablePicker, { type PickerOption } from './SearchablePicker';
import {
  LOCATION_FIELD_MAX,
  US_STATES,
  USDA_ZONES,
  normalizeLocationPatch,
  resolveCountryName,
  resolveStateName,
} from './location';

/** State picker options: "TX - Texas" shown, "TX" stored; name is searchable too. */
const STATE_OPTIONS: readonly PickerOption[] = US_STATES.map((s) => ({
  code: s.code,
  label: `${s.code} - ${s.name}`,
  keywords: s.name,
}));

/**
 * The single sheet for the Property's disclosed location. Field order is
 * Country -> State/Region -> City. Country defaults to US on a fresh property.
 * Under US the region is a bundled state picker (stores the code, never free
 * text); any other country makes it free-text "Region". Changing the country
 * clears the region (both directions); the city is preserved. Save normalizes and
 * writes through the property repo's write-queue (D-052).
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
  const hasAnyLocation = !!(
    property.locationCity ||
    property.locationRegion ||
    property.locationCountry ||
    property.hardinessZone
  );
  const [city, setCity] = useState(property.locationCity ?? '');
  const [region, setRegion] = useState<string | undefined>(property.locationRegion);
  // Fresh property (no fields yet) defaults to US.
  const [country, setCountry] = useState<string | undefined>(
    property.locationCountry ?? (hasAnyLocation ? undefined : 'US'),
  );
  const [zone, setZone] = useState<string | undefined>(property.hardinessZone);
  const [pickingCountry, setPickingCountry] = useState(false);
  const [pickingState, setPickingState] = useState(false);
  const [saving, setSaving] = useState(false);

  const isUS = country === 'US';

  // Any country change clears the region (US<->other), but keeps the city.
  const changeCountry = (next: string | undefined) => {
    setCountry(next);
    setRegion(undefined);
  };

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
            <Text style={styles.label}>Country</Text>
            <View style={styles.inlineRow}>
              <Pressable
                onPress={() => setPickingCountry(true)}
                accessibilityRole="button"
                accessibilityLabel="Select country"
                style={[styles.input, styles.grow]}
              >
                <Text style={country ? styles.inputValue : styles.inputPlaceholder}>
                  {resolveCountryName(country) ?? 'Select country'}
                </Text>
              </Pressable>
              {country && (
                <Pressable
                  onPress={() => changeCountry(undefined)}
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
            <Text style={styles.label}>{isUS ? 'State' : 'Region'}</Text>
            {isUS ? (
              <View style={styles.inlineRow}>
                <Pressable
                  onPress={() => setPickingState(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Select state"
                  style={[styles.input, styles.grow]}
                >
                  <Text style={region ? styles.inputValue : styles.inputPlaceholder}>
                    {region ? `${region} - ${resolveStateName(region)}` : 'Select state'}
                  </Text>
                </Pressable>
                {region && (
                  <Pressable
                    onPress={() => setRegion(undefined)}
                    accessibilityRole="button"
                    accessibilityLabel="Clear state"
                    hitSlop={8}
                  >
                    <Text style={styles.clear}>Clear</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <TextInput
                style={styles.input}
                value={region ?? ''}
                onChangeText={setRegion}
                maxLength={LOCATION_FIELD_MAX}
                placeholder="Region"
                placeholderTextColor={colors.textMuted}
                editable={!saving}
                accessibilityLabel="Region"
              />
            )}
          </View>

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
            changeCountry(code);
            setPickingCountry(false);
          }}
          onClose={() => setPickingCountry(false)}
        />
      )}
      {pickingState && (
        <SearchablePicker
          options={STATE_OPTIONS}
          selectedCode={region}
          onSelect={(code) => {
            setRegion(code);
            setPickingState(false);
          }}
          onClose={() => setPickingState(false)}
          searchLabel="Search states"
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
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
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grow: { flex: 1 },
  clear: { fontSize: typography.body, color: colors.primary, fontWeight: '600' },
});
