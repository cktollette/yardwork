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
 * The one-line location/identity string:
 *   [city + region when region present, else city + country name] - Zone X - grass
 * Every segment omits cleanly when its data is absent; an all-absent input yields
 * "". `countryName` is the already-resolved display name (not the code).
 */
export function formatProfileLocationLine(input: {
  city?: string;
  region?: string;
  countryName?: string;
  zone?: string;
  grassType?: string;
}): string {
  const place = (input.region
    ? [input.city, input.region]
    : [input.city, input.countryName]
  )
    .filter((s): s is string => !!s)
    .join(', ');

  return [place, input.zone ? `Zone ${input.zone}` : '', input.grassType]
    .filter((s): s is string => !!s)
    .join(SEGMENT_SEPARATOR);
}
