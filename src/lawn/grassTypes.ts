/**
 * The curated list of grass types a user can tag a zone with.
 *
 * A short, common-in-North-America set with "Other" as the escape valve so the
 * chip row never becomes a wall of options. `Zone.grassType` is a plain string
 * (not a union) — these are the offered chips, not a hard constraint. Optional
 * everywhere. A future GDD (growing-degree-day) cadence feature will read this;
 * nothing computes from it today.
 */
export const GRASS_TYPES = [
  'Bermuda',
  'Zoysia',
  'St. Augustine',
  'Fescue',
  'Buffalo',
  'Centipede',
  'Kentucky Bluegrass',
  'Ryegrass',
  'Other',
] as const;
