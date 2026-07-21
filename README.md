# Yardwork
The Grint for people who mow their own lawn. See North Star and Concept Doc in Notion.

## Stack
- **Expo (React Native)** — one codebase, iOS + Android.
- **Supabase** — Postgres, auth, storage, realtime (no backend to operate).
- **Mapbox** — satellite tiles, lawn polygon draw, pattern rendering.
- **RevenueCat** — cross-platform in-app purchases / subscriptions.
- **Weather via OpenWeather / Tomorrow.io** — conditions stamped on each mow.

## Development workflow
- Short-lived `feat/`, `fix/`, `chore/`, `docs/` branches off `main` — one per backlog item.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- Open a PR into `main`, self-review the diff, then merge and delete the branch.
- `main` is always deployable.
