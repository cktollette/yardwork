// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readdirSync, readFileSync } = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

/**
 * Mow.zoneIds is a RESERVED field (D-036): declared on the model for forward
 * compatibility but never written or read by any code path in this PR. This
 * test enforces that at the source level — the field name may appear ONLY in
 * the model declaration and in this test. If a future feature starts using it,
 * this test is the deliberate gate that must be updated.
 */

const SRC: string = join(process.cwd(), 'src');
const ALLOWED = new Set<string>([
  join(SRC, 'mow', 'models.ts'),
  join(SRC, 'mow', 'zoneIdsReserved.test.ts'),
]);

function walk(dir: string): string[] {
  const entries: Array<{ name: string; isDirectory(): boolean }> = readdirSync(dir, {
    withFileTypes: true,
  });
  return entries.flatMap((entry) => {
    const full: string = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('Mow.zoneIds reserved field (D-036)', () => {
  it('appears only in the model declaration — no code path writes or reads it', () => {
    const offenders = walk(SRC).filter(
      (file) => !ALLOWED.has(file) && (readFileSync(file, 'utf8') as string).includes('zoneIds'),
    );
    expect(offenders).toEqual([]);
  });
});
