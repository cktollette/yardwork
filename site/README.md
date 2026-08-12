# Klippa site

Static tester-recruitment funnel and privacy policy for getklippa.com. The
landing page's primary call to action is the TestFlight join link for the
Dallas beta. Deploys via Cloudflare Pages from the `site/` directory.
Production branch: `main`.

## Assets

Referenced by the pages, kept alongside them in `site/`:

- `favicon.png` — square app icon (favicon + apple-touch-icon), 1024×1024. Also
  used as the interim social share image until a proper card exists.
- `shot-1.png` (stats), `shot-2.png` (mow detail), `shot-3.png` (mow log),
  `shot-4.png` (satellite lawn draw) — iPhone screenshots (portrait). Displayed
  in order: shot-4, shot-1, shot-2, shot-3.

A proper 1200×630 `og.png` social card is a follow-up (tracked as a chore issue);
until then the Open Graph / Twitter tags point at `favicon.png`.
