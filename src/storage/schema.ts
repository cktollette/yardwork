import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * App-level persistence schema registry.
 *
 * The single source of truth for the on-device data shape across ALL domains
 * (mows, properties, equipment, …) — not mow-specific, which is why it lives
 * under src/storage rather than any one feature folder. Every repository stamps
 * and checks this version through ensureSchemaVersion().
 *
 * Bump SCHEMA_VERSION whenever the shape of ANY persisted collection changes,
 * and add a `// vN:` line below noting what changed. The stamp lets a future
 * branch (Supabase sync, or any model migration) know what shape the local data
 * is in before it reads it — cheap to add now, painful to retrofit.
 */
// v1: mows + properties.
// v2: Property gained `boundary` + `areaSqFt` (lawn polygon). Purely additive —
//     absent fields read as "no polygon", so no data transform is required on
//     upgrade; the bump just records the shape change for future migrations.
// v3: Mow gained optional `hocInches` (height of cut). Purely additive —
//     absent reads as "unset", so no data transform runs on upgrade; the bump
//     just records the shape change.
// v4: Equipment collection added (@yardwork/equipment). Purely additive — a
//     brand-new key; existing collections are untouched and older installs
//     simply have no equipment, so no data transform runs on upgrade.
// v5: Mow gained optional `toolTypes` (job types performed: mow/trim/edge/blow,
//     plain enum values — NOT equipment references). Purely additive — absent
//     reads as "no tools", so no data transform runs. (Earlier unreleased builds
//     of this branch briefly used `equipmentIds`; that field is simply ignored.)
// v6: Mow gained optional `weather` (temp/condition/humidity/capturedAt),
//     captured best-effort once at save time. Purely additive — absent reads as
//     "no weather captured", so no data transform runs; older records without
//     the field load cleanly.
// v7: Mow gained optional `activity` (steps/distanceMi/source/capturedAt),
//     captured best-effort from HealthKit for the timer window. Purely additive —
//     absent reads as "no activity captured", so no data transform runs; v6
//     records (with or without weather) load cleanly.
export const SCHEMA_VERSION = 7;
export const SCHEMA_VERSION_KEY = '@yardwork/schema-version';

/**
 * Ensure the schema version is stamped, returning the stored version.
 *
 * First run writes SCHEMA_VERSION and returns it; later runs return whatever
 * is stored. Idempotent and cheap, so repositories call it before every read.
 *
 * FUTURE MIGRATIONS HOOK IN HERE: when `stored < SCHEMA_VERSION`, run the
 * ordered migration steps between them and then re-stamp. There is deliberately
 * no migration logic yet — only the version stamp and this single seam.
 */
export async function ensureSchemaVersion(): Promise<number> {
  const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
  if (raw == null) {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
    return SCHEMA_VERSION;
  }
  const stored = Number(raw);
  return Number.isFinite(stored) ? stored : SCHEMA_VERSION;
}
