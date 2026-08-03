-- Lawn polygon columns for the `properties` table.
--
-- DOCUMENTATION / NOT YET RUN. Supabase is not wired up (the app persists to
-- AsyncStorage behind the repository interface). This file records the target
-- remote shape so the eventual AsyncStorage -> Supabase swap is a known
-- migration rather than a rediscovery. It mirrors the on-device model in
-- src/mow/models.ts (Property.boundary / Property.areaSqFt).
--
-- Assumes a `properties` table already exists from an earlier (not-yet-written)
-- migration. `if not exists` keeps this safe to run more than once.

alter table public.properties
  -- Ordered OPEN ring of [longitude, latitude] vertices; the closing edge is
  -- implied. NULL means no lawn polygon has been drawn. One polygon per
  -- property (D-005) — a save replaces the value, never appends.
  add column if not exists boundary jsonb,
  -- Lawn area in square feet, derived from `boundary` on write and stored.
  -- Readers use this column; they never recompute area from `boundary`.
  add column if not exists area_sqft numeric;
