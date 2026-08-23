import type { PropertyLocationEdit } from '../mow/repositories';

/**
 * Bundled reference data + pure normalization for the disclosed location fields
 * (v15). No network, no geocoding — the country picker and zone chips select
 * from these lists, and display names resolve from them at render time.
 */

/** City / region free-text cap (trimmed). */
export const LOCATION_FIELD_MAX = 40;

/**
 * ISO 3166-1 alpha-2 code -> English short name. The single source of truth for
 * both the picker options and display-name resolution.
 */
export const COUNTRY_NAMES: Readonly<Record<string, string>> = {
  AF: 'Afghanistan', AX: 'Aland Islands', AL: 'Albania', DZ: 'Algeria',
  AS: 'American Samoa', AD: 'Andorra', AO: 'Angola', AI: 'Anguilla',
  AQ: 'Antarctica', AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia',
  AW: 'Aruba', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas',
  BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados', BY: 'Belarus', BE: 'Belgium',
  BZ: 'Belize', BJ: 'Benin', BM: 'Bermuda', BT: 'Bhutan', BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil',
  IO: 'British Indian Ocean Territory', BN: 'Brunei', BG: 'Bulgaria',
  BF: 'Burkina Faso', BI: 'Burundi', CV: 'Cabo Verde', KH: 'Cambodia',
  CM: 'Cameroon', CA: 'Canada', KY: 'Cayman Islands',
  CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CX: 'Christmas Island', CC: 'Cocos Islands', CO: 'Colombia', KM: 'Comoros',
  CG: 'Congo', CD: 'Congo (DRC)', CK: 'Cook Islands', CR: 'Costa Rica',
  CI: 'Cote d Ivoire', HR: 'Croatia', CU: 'Cuba', CW: 'Curacao', CY: 'Cyprus',
  CZ: 'Czechia', DK: 'Denmark', DJ: 'Djibouti', DM: 'Dominica',
  DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador',
  GQ: 'Equatorial Guinea', ER: 'Eritrea', EE: 'Estonia', SZ: 'Eswatini',
  ET: 'Ethiopia', FK: 'Falkland Islands', FO: 'Faroe Islands', FJ: 'Fiji',
  FI: 'Finland', FR: 'France', GF: 'French Guiana', PF: 'French Polynesia',
  GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
  GI: 'Gibraltar', GR: 'Greece', GL: 'Greenland', GD: 'Grenada',
  GP: 'Guadeloupe', GU: 'Guam', GT: 'Guatemala', GG: 'Guernsey', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras',
  HK: 'Hong Kong', HU: 'Hungary', IS: 'Iceland', IN: 'India', ID: 'Indonesia',
  IR: 'Iran', IQ: 'Iraq', IE: 'Ireland', IM: 'Isle of Man', IL: 'Israel',
  IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JE: 'Jersey', JO: 'Jordan',
  KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho',
  LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania',
  LU: 'Luxembourg', MO: 'Macao', MG: 'Madagascar', MW: 'Malawi',
  MY: 'Malaysia', MV: 'Maldives', ML: 'Mali', MT: 'Malta',
  MH: 'Marshall Islands', MQ: 'Martinique', MR: 'Mauritania', MU: 'Mauritius',
  YT: 'Mayotte', MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco',
  MN: 'Mongolia', ME: 'Montenegro', MS: 'Montserrat', MA: 'Morocco',
  MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia', NR: 'Nauru', NP: 'Nepal',
  NL: 'Netherlands', NC: 'New Caledonia', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', NU: 'Niue', NF: 'Norfolk Island',
  KP: 'North Korea', MK: 'North Macedonia', MP: 'Northern Mariana Islands',
  NO: 'Norway', OM: 'Oman', PK: 'Pakistan', PW: 'Palau', PS: 'Palestine',
  PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PN: 'Pitcairn', PL: 'Poland', PT: 'Portugal',
  PR: 'Puerto Rico', QA: 'Qatar', RE: 'Reunion', RO: 'Romania', RU: 'Russia',
  RW: 'Rwanda', BL: 'Saint Barthelemy', SH: 'Saint Helena',
  KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia', MF: 'Saint Martin',
  PM: 'Saint Pierre and Miquelon', VC: 'Saint Vincent and the Grenadines',
  WS: 'Samoa', SM: 'San Marino', ST: 'Sao Tome and Principe',
  SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SC: 'Seychelles',
  SL: 'Sierra Leone', SG: 'Singapore', SX: 'Sint Maarten', SK: 'Slovakia',
  SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
  GS: 'South Georgia', KR: 'South Korea', SS: 'South Sudan', ES: 'Spain',
  LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname', SE: 'Sweden',
  CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TK: 'Tokelau',
  TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey',
  TM: 'Turkmenistan', TC: 'Turks and Caicos Islands', TV: 'Tuvalu',
  UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VU: 'Vanuatu', VA: 'Vatican City', VE: 'Venezuela', VN: 'Vietnam',
  VG: 'Virgin Islands (British)', VI: 'Virgin Islands (US)',
  WF: 'Wallis and Futuna', EH: 'Western Sahara', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe',
};

/** Picker options: alpha-2 code + display name, sorted by name. */
export const COUNTRIES: readonly { readonly code: string; readonly name: string }[] =
  Object.entries(COUNTRY_NAMES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

/** Resolve an alpha-2 code to its display name, or undefined if unknown. */
export function resolveCountryName(code: string | undefined): string | undefined {
  return code ? COUNTRY_NAMES[code] : undefined;
}

/** True for a value present in the bundled country list. */
export function isCountryCode(code: string | undefined): boolean {
  return code != null && code in COUNTRY_NAMES;
}

/** USDA hardiness zones 1a..13b, the chip-row options (never free text). */
export const USDA_ZONES: readonly string[] = Array.from({ length: 13 }, (_, i) => [
  `${i + 1}a`,
  `${i + 1}b`,
]).flat();

const ZONE_SET = new Set(USDA_ZONES);

/** True for a value present in the bundled hardiness-zone list. */
export function isHardinessZone(zone: string | undefined): boolean {
  return zone != null && ZONE_SET.has(zone);
}

/** Trim, cap to LOCATION_FIELD_MAX, and collapse empty/whitespace-only to undefined. */
export function normalizeLocationField(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  return trimmed.slice(0, LOCATION_FIELD_MAX);
}

/**
 * Raw sheet input -> a normalized patch. City/region are trimmed/capped and
 * collapse to undefined when blank (never persisted as ""); country/zone are
 * kept only when they match the bundled lists, else undefined. All four keys are
 * always present so a cleared field clears in storage.
 */
export function normalizeLocationPatch(input: {
  locationCity?: string;
  locationRegion?: string;
  locationCountry?: string;
  hardinessZone?: string;
}): PropertyLocationEdit {
  return {
    locationCity: normalizeLocationField(input.locationCity),
    locationRegion: normalizeLocationField(input.locationRegion),
    locationCountry: isCountryCode(input.locationCountry)
      ? input.locationCountry
      : undefined,
    hardinessZone: isHardinessZone(input.hardinessZone)
      ? input.hardinessZone
      : undefined,
  };
}
