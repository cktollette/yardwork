import { isValidEmail, normalizeEmail } from '../_lib/email.js';

// Cloudflare Pages Function: POST /api/subscribe
//
// Progressive enhancement (D-064): the inline submit script sends
// `Accept: application/json` and gets a JSON verdict it renders in place. A
// plain form POST (JS disabled or failed) gets a full, on-brand HTML page
// instead. Same handler, two response shapes.
//
// Bindings (configured in the Cloudflare Pages dashboard, not committed):
//   - SUBSCRIBERS      KV namespace binding
//   - TURNSTILE_SECRET secret environment variable

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_SOURCE = 'getklippa-landing';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Minimal brand-styled page for the no-JS fallback path. Cream background,
// charcoal text, green heading, a link back home. ASCII copy only.
function htmlResponse(status, heading, message) {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Klippa</title>
<link rel="icon" type="image/png" href="/favicon.png">
<style>
  body { margin: 0; background: #F2EDEB; color: #2D2A32;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6; }
  .wrap { max-width: 680px; margin: 0 auto; padding: 64px 20px; text-align: center; }
  h1 { color: #468367; font-size: 1.6rem; margin: 0 0 12px; }
  p { margin: 0 0 24px; }
  a { color: #468367; font-weight: bold; }
</style>
</head>
<body>
  <main class="wrap">
    <h1>${heading}</h1>
    <p>${message}</p>
    <p><a href="/">Back to getklippa.com</a></p>
  </main>
</body>
</html>`;
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');

  const ok = (state) =>
    wantsJson
      ? jsonResponse(200, { ok: true, state })
      : htmlResponse(200, "You're in.", "We'll email you beta invites and build updates. Nothing else.");

  const fail = (httpStatus, error, message) =>
    wantsJson
      ? jsonResponse(httpStatus, { ok: false, error })
      : htmlResponse(httpStatus, 'Something went wrong', message);

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'bad_request', 'We could not read the form. Please go back and try again.');
  }

  // Honeypot: a hidden field no human fills. If it has content, treat it as a
  // bot and return a silent success without writing anything, so we never tip
  // off the bot that it was caught.
  const honeypot = form.get('company');
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return ok('subscribed');
  }

  const email = normalizeEmail(form.get('email'));
  if (!isValidEmail(email)) {
    return fail(400, 'invalid_email', "That email doesn't look right. Give it another look.");
  }

  // Turnstile server-side verification. Fail closed if the secret is missing
  // (a misconfiguration) rather than accept unverified traffic.
  const secret = env.TURNSTILE_SECRET;
  if (!secret) {
    return fail(500, 'server', 'Something went wrong on our end. Try again in a minute.');
  }
  const token = form.get('cf-turnstile-response');
  const verifyBody = new FormData();
  verifyBody.append('secret', secret);
  verifyBody.append('response', typeof token === 'string' ? token : '');
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) verifyBody.append('remoteip', ip);
  let verified = false;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body: verifyBody });
    const data = await res.json();
    verified = data && data.success === true;
  } catch {
    verified = false;
  }
  if (!verified) {
    return fail(403, 'turnstile_failed', "Couldn't verify you're human. Refresh and try again.");
  }

  // Idempotent write keyed by email. A re-signup preserves the original
  // first-seen record and returns success (silent, not an error).
  try {
    const existing = await env.SUBSCRIBERS.get(email);
    if (existing === null) {
      const source = form.get('source');
      const record = {
        ts: new Date().toISOString(),
        source: typeof source === 'string' && source ? source : DEFAULT_SOURCE,
        country: request.cf && request.cf.country ? request.cf.country : null,
        ua: (request.headers.get('user-agent') || '').slice(0, 200),
      };
      await env.SUBSCRIBERS.put(email, JSON.stringify(record));
      return ok('subscribed');
    }
    return ok('already');
  } catch {
    return fail(500, 'server', 'Something went wrong on our end. Try again in a minute.');
  }
}

// Any non-POST method gets 405. Without this, Pages falls through to static
// assets and serves the landing page (200) for a GET to this endpoint. POST is
// still handled by onRequestPost above.
export function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST', 'content-type': 'text/plain; charset=utf-8' },
  });
}
