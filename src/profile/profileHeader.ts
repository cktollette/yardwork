import type { Property } from '../mow/models';

/**
 * Pure formatting for the Profile header. ASCII only — segments join with
 * " - " (hyphen, spaces), never an interpunct or other non-ASCII (pinned by test).
 */

/** Join between header/subtitle segments. Plain ASCII. */
export const SEGMENT_SEPARATOR = ' - ';

/** Display name: the property nickname, else "My Lawn". No name-editing flow. */
export function profileDisplayName(property: Pick<Property, 'name'> | null): string {
  const name = property?.name?.trim();
  return name && name.length > 0 ? name : 'My Lawn';
}

/**
 * The grass segment, derived from the deduped set of zone grass types (in zone
 * order): one distinct type renders as-is, two distinct render "A + B", three or
 * more render "Mixed", zero yields no segment. ASCII only (" + ").
 */
export function grassSegment(grassTypes: readonly (string | undefined)[]): string | undefined {
  const distinct: string[] = [];
  for (const g of grassTypes) {
    if (g && !distinct.includes(g)) distinct.push(g);
  }
  if (distinct.length === 0) return undefined;
  if (distinct.length === 1) return distinct[0];
  if (distinct.length === 2) return `${distinct[0]} + ${distinct[1]}`;
  return 'Mixed';
}

/**
 * The one-line location/identity string:
 *   [city + region when region present, else city + country name] - Zone X - grass
 * Every segment omits cleanly when its data is absent; an all-absent input yields
 * "". `countryName` is the already-resolved display name (not the code); `grassTypes`
 * is every zone's grass type (deduped into one segment by grassSegment).
 */
export function formatProfileLocationLine(input: {
  city?: string;
  region?: string;
  countryName?: string;
  zone?: string;
  grassTypes?: readonly (string | undefined)[];
}): string {
  const place = (input.region
    ? [input.city, input.region]
    : [input.city, input.countryName]
  )
    .filter((s): s is string => !!s)
    .join(', ');

  return [place, input.zone ? `Zone ${input.zone}` : '', grassSegment(input.grassTypes ?? [])]
    .filter((s): s is string => !!s)
    .join(SEGMENT_SEPARATOR);
}
