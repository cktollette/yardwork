/**
 * Fixed educational copy for the Height-of-cut info affordance.
 *
 * Deliberately NOT a notch→inches lookup table. Testers asked for one, and we
 * rejected it: notch heights vary by brand and model, so a universal table would
 * be confidently wrong — a domain-credibility failure. This gives durable
 * guidance instead. Kept as a constant in one place so future Guide-pillar copy
 * edits touch a single file, never inline JSX.
 */

export const HOC_GUIDANCE_TITLE = 'Height of cut';

/** The three guidance lines, verbatim, separated by blank lines for the alert. */
export const HOC_GUIDANCE_BODY = [
  'Typical push-mower deck range: lowest notch ≈ 1–1.5", highest ≈ 3.5–4"',
  'Exact notch heights vary by brand and model — your manual has the real numbers (or measure blade-to-ground on a hard surface)',
  "Rule of thumb: never cut more than ⅓ of the blade height in one mow; if it's been a while, raise the HOC a notch to avoid scalping",
].join('\n\n');
