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
// v8: Property restructured from a single `boundary` (+ `areaSqFt`) into a set of
//     named `zones` (multi-zone lawn). This one is NOT purely additive — it is a
//     RESHAPE, so it needs a real transform: the old polygon becomes a single
//     "Lawn" zone with identical vertices and area. The transform (migrateProperty)
//     runs idempotently on every property read in the schema-versioned load path
//     (see src/lawn/migrateProperty.ts). Mow records are untouched by v8.
// v9: Equipment.model became OPTIONAL (was a required string) to remove
//     onboarding friction. Purely additive / backward-compatible — existing
//     records with a model are still valid and untouched; new records may omit
//     it, so no data transform runs on upgrade.
// v10: Zone gained optional `grassType` (curated list, per zone). Purely
//     additive — absent reads as "not set", so no data transform runs; v8/v9
//     zones load cleanly and the v7→v8 migration does not populate it.
// v11: Mow gained optional `clippingBags` (count of clippings bags collected,
//     0–20). Purely additive — absent reads as "not recorded", so no data
//     transform runs on upgrade; older records without the field load cleanly.
// v12: Mow gained optional `beforePhotoUri` / `afterPhotoUri` (app-owned image
//     file URIs; the record stores URIs only, never image data). Purely
//     additive — absent reads as "no photo", so no data transform runs on
//     upgrade; older records without the fields load cleanly.
// v13: Mow.`zoneIds` graduated from reserved to live (per-mow zone selection).
//     Purely additive — absent reads as "the whole lawn" (resolved at read
//     time), so no data transform runs on upgrade; older mows keep no zoneIds
//     and are never backfilled (absence IS the semantic).
export const SCHEMA_VERSION = 13;
export const SCHEMA_VERSION_KEY = '@yardwork/schema-version';

/**
 * Ensure the schema version is stamped at the current version, returning it.
 *
 * Idempotent and cheap, so repositories call it before every read. The stamp is
 * (re)written whenever it is missing, unreadable, or BEHIND the code — a fresh
 * install stamps the current version; a pre-existing install is brought forward.
 *
 * BUG FIXED HERE (migration-chain hang, fix/migration-chain-hang): the previous
 * version READ the stored stamp but, when it was behind, returned it WITHOUT
 * re-stamping. So a pre-existing install's marker stuck at its original version
 * forever even under newer code, and the "run ordered migrations when
 * stored < SCHEMA_VERSION" seam never actually fired. Every per-PR test seeded a
 * single fresh version and read it once, so none ever exercised loading a stored
 * version OLDER than the code — the chain from the oldest supported version was
 * untested until src/storage/migrationChain.test.ts.
 *
 * Data-shape migrations run idempotently ON READ, independent of this marker
 * (e.g. migrateProperty normalizes v7 `boundary` → v8 `zones` on every property
 * read). So the load path is already version-tolerant for the DATA; this
 * function's job is only to keep the marker honest.
 *
 * FUTURE-BUMP CONVENTION: every schema bump must be chain-tested from the OLDEST
 * supported stored version (v7 today), not just from n-1 — see
 * src/storage/migrationChain.test.ts. Any future migration that is gated on the
 * stamp (rather than idempotent-on-read) must PERSIST its data transform before
 * this re-stamp, or add its ordered step here.
 */
export async function ensureSchemaVersion(): Promise<number> {
  const raw = await AsyncStorage.getItem(SCHEMA_VERSION_KEY);
  const stored = raw == null ? null : Number(raw);
  if (stored == null || !Number.isFinite(stored) || stored < SCHEMA_VERSION) {
    await AsyncStorage.setItem(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION));
  }
  return SCHEMA_VERSION;
}
