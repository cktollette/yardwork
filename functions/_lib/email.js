// Pure, runtime-free email validation and normalization shared by the
// subscribe Pages Function. Imports nothing from the Cloudflare or DOM globals
// so it unit-tests under jest and bundles unchanged into the Workers runtime.
//
// Deliberately conservative, not full RFC 5322: trim, lowercase, cap the
// length, and require a single local part, one "@", and a dotted domain. That
// catches fat-fingered and obviously junk addresses while staying ASCII-only;
// exhaustive RFC validation rejects nothing a spammer cares about.

// RFC 5321 puts the practical ceiling on a forward path at 254 characters.
export const MAX_EMAIL_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lowercase and trim. Returns '' for any non-string so callers can treat the
// result uniformly (an empty string fails isValidEmail).
export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

// Expects an already-normalized value (see normalizeEmail).
export function isValidEmail(email) {
  return (
    typeof email === 'string' &&
    email.length > 0 &&
    email.length <= MAX_EMAIL_LENGTH &&
    EMAIL_RE.test(email)
  );
}
