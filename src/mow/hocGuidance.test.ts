import { HOC_GUIDANCE_BODY, HOC_GUIDANCE_TITLE } from './hocGuidance';

describe('HOC guidance copy', () => {
  it('uses the "Height of cut" title', () => {
    expect(HOC_GUIDANCE_TITLE).toBe('Height of cut');
  });

  // Guards the mandated copy verbatim so a future edit can't silently drift it.
  it.each([
    'Typical push-mower deck range: lowest notch ≈ 1–1.5", highest ≈ 3.5–4"',
    'Exact notch heights vary by brand and model — your manual has the real numbers (or measure blade-to-ground on a hard surface)',
    "Rule of thumb: never cut more than ⅓ of the blade height in one mow; if it's been a while, raise the HOC a notch to avoid scalping",
  ])('contains the mandated line verbatim: %s', (line) => {
    expect(HOC_GUIDANCE_BODY).toContain(line);
  });

  it('separates the three lines with blank lines', () => {
    expect(HOC_GUIDANCE_BODY.split('\n\n')).toHaveLength(3);
  });
});
