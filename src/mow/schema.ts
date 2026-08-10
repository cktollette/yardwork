import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * On-device persistence schema version.
 *
 * Bump this whenever the shape of persisted data changes. The stamp lets a
 * future branch (Supabase sync, or any model migration) know what shape the
 * local data is in before it reads it — cheap to add now, painful to retrofit.
 */
// v1: mows + properties.
// v2: Property gained `boundary` + `areaSqFt` (lawn polygon). Purely additive —
//     absent fields read as "no polygon", so no data transform is required on
//     upgrade; the bump just records the shape change for future migrations.
// v3: Mow gained optional `hocInches` (height of cut). Purely additive —
//     absent reads as "unset", so no data transform runs on upgrade; the bump
//     just records the shape change.
export const SCHEMA_VERSION = 3;
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
