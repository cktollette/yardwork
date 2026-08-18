# Cloudflare Pages Functions (getklippa.com)

Serverless request handlers for the getklippa.com site (static assets live in `site/`). They sit at the repository root, not in `site/`, because the Cloudflare Pages project uses an empty Root directory (repo root) with build output `site/`, and Pages resolves the `functions/` directory relative to the Root directory. Endpoint: `POST /api/subscribe` (`api/subscribe.js`); shared, non-routed helpers live in `_lib/` (the leading underscore keeps Pages from routing them).

Local dev from the repo root: `npx wrangler pages dev site --kv SUBSCRIBERS --binding TURNSTILE_SECRET=<test-secret>`.
