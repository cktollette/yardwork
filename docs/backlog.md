# Feature Backlog

> Re-exported snapshot from Notion (source of truth). Grouped by version.

## v0

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| Basic stats screen | Track | Shipped | M | Yes | Concept Doc | Avg mows/week; days between; sqft/min; lifetime totals. |
| Lawn polygon draw (satellite) | Track | Shipped | M | Yes | Concept Doc | One-time onboarding. Unlocks area/patterns/discharge/savings. Make skippable; prompt at mow #3. [Decision: No GPS route tracing; use polygon draw instead] |
| Location-centered draw camera | Track | Shipped | M | Yes | Claude Project | Draw screen opens at hardcoded Frisco default. Real users must pan across North Texas to find their house, which breaks the 60-second onboarding claim in the concept doc. Needs expo-location, when-in-use permission, NSLocationWhenInUseUsageDescription in app.json, native rebuild. Prompt on create-mode mount, not app launch. Falls back to default center silently if denied. Pulled from v0.5 into v0 on device evidence |
| Mow log (what happened) | Track | Shipped | M | Yes | Concept Doc | The record itself: date/duration/area/tasks/photos. |
| Mow timer (start/stop) | Track | Shipped | S | Yes | Concept Doc | Core atomic action. The heartbeat of the whole app. |
| Streak | Track | Shipped | S | Yes | Concept Doc | Consecutive-week logging. Cheap retention mechanic. |

## v0.5

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| edit/delete a logged mow | Track | Shipped | S | Yes | Concept Doc |  |
| Equipment garage | Track | Shipped | M | Yes | Concept Doc | Track engine hours + maintenance intervals. Affiliate channel. Share-card identity flex. |
| Equipment model optional | Track | Shipped | S | Yes | Kent | shipped with build 8, PR #30. Note: "Tester-reported onboarding friction; brand + type sufficient (D-053) |
| Grass Type per Zone/Yard | Track | Shipped | S | Yes | Kent |  |
| Height of cut (HOC) logging | Track | Shipped | S | Yes | Concept Doc | Per-mow setting. Feeds cadence recommendations. |
| Minimum-duration guard on mow save | Track | Shipped | S | Yes | Claude Project |  |
| MowList/MowDetail card restyle | Track | Shipped | S | Yes | Kent | Make it look similar to grint rounds in profile |
| Native datetime picker on MowDetail | Track | Shipped | S | No | Claude Project | Replaces text-field date/time editing. Requires @react-native-community/datetimepicker → native module → dev-client rebuild. Batch with the next rebuild-forcing feature. |
| Steps + distance (HealthKit/Google Fit) | Track | Shipped | M | Yes | Concept Doc | Auto-captured during session. Also derives calories burned per mow (needs body weight — pull from HealthKit if available, otherwise prompt once). Feeds avg calories per mow as a derived stat. |
| Tools used per mow | Track | Shipped | S | Yes | Kent | Which mower/trimmer/edger/blower. Feeds share card. |
| Weather at mow time | Track | Shipped | S | Yes | Concept Doc | API call stamped on the mow record. |
| Bags / clippings volume | Track | Idea | S | Yes | Concept Doc | Manual entry. |
| Before/after photos | Track | Idea | S | Yes | Concept Doc | Highest-engagement content type downstream. |
| Camera-interaction tracking for late GPS refine (manual-pan tradeoff) |  | Spec'd | S | Yes | Claude Project |  |
| Disable Mapbox telemetry (telemetryEnabled(false)) | Track | Idea | S | Yes | Claude Project |  |
| Tasks on Mow | Track | Idea | M | Yes | Concept Doc |  |

## v1

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| Multi-zone polygons | Track | Shipped | M | Yes | Claude Project |  |
| Activity Feed (friend’s mow cards) | Community | Idea | L | Yes | Kent | Grint screenshots attached as design ref |
| Cadence recommendations (GDD) | Guide | Idea | L | Yes | Concept Doc | Growing Degree Days + grass type predicts when to mow. Most defensible Guide feature. |
| Calories per mow | Track | Idea | S | Yes | Kent |  |
| Friends notifications | Community | Idea | L | Yes | Kent | Requires a social graph that does not exist. D-005 makes Property the primitive; there is no user-follows-user relationship anywhere in the model. Adding one is a schema decision on the scale of D-005, not a feature build. Also needs mutual friend requests, live mow-in-progress presence, push infrastructure, and per-user notification prefs. Worthless before density — a notification about a friend mowing means nothing to a user with no friends in the app. Ships with the community wave, not before. |
| Grass Growing Zone on profile | Community | Idea | M | Yes | Cameron |  |
| Lawn Journals feed | Community | Idea | L | Yes | Concept Doc | Persistent per-property thread; every mow auto-posts a card. The feed unit. |
| Live mows (friends currently mowing) | Community | Idea | M | Yes | Kent | needs supabase presenece |
| Per-mow zone selection | Track | Idea | M | Yes | Kent | Default all zones, no mandatory save-time decision |
| Profile page (Grint-style: stats row, shortcuts, garage summary) | Community | Idea | M | No | Kent | Grint-style: stats row, shortcuts, garage summary |
| Reactions (no free-text) | Community | Idea | M | Yes | Concept Doc | Curated response set only. See Decision D-001. [Decision: No free-text comments at launch] |
| Smart checklists (recurring + conditional) | Guide | Idea | M | Yes | Concept Doc | Standing tasks + rules (rain-in-48h suppresses fertilizer; long gap raises HOC). |
| Spotify listening stats | Track | Idea | M | Yes | Concept Doc | Songs during the mow window. Fun share-card element. |
| StatRing → SVG (progress arcs) | Prove | Idea | S | No | Kent | The circled-stat component, your version of The Grint's Score/Putts circles |
| Temp on mow card | Prove | Idea | S | Yes | Kent |  |
| Tools/most-used-tool stat | Prove | Idea | S | Yes | Kent |  |
| Treatment calendar (fert/weed/fungus) | Guide | Idea | L | Yes | Friend | Year-round program. Structural fix for seasonality. Runs even when grass isn't growing. |

## v1.5

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| AI coach (RAG over extension content) | Guide | Idea | XL | Yes | Concept Doc | Claude/GPT + turf-guide corpus. See Decision D-003. [Decision: No specialized SLM; use RAG over turf-extension content] |
| Badges & achievements | Community | Idea | M | Yes | Concept Doc | Skew toward effort badges over rarity badges. |
| Camera overlay for consistent photos | Track | Idea | M | Yes | Friend | Ghost overlay + tilt/compass lock. Makes transformation posts good. |
| Clipping-discharge direction | Guide | Idea | M | Yes | Concept Doc | Deterministic geometry given polygon + keep-clean zones. NOT AI. |
| Explore Feed (second swipeable feed) | Community | Idea | M | No | Kent | Activates on regional density. Look at The Grint explore feed |
| Health Connect (Android Compatability) | Track | Idea | M | No | Kent |  |
| Lawn Album (property photo timeline, side-by-side compare) | Track | Idea | M | Yes | Cameron | Ships with camera overlay |
| Mid-edge vertex insertion | Track | Idea | S | Yes | Claude Project |  |
| Pattern planner (stripe/checker/diamond) | Guide | Idea | L | Yes | Concept Doc | Screenshot-bait / marketing engine. Prototype in isolation first. |
| Savings calculator | Prove | Idea | M | Yes | Concept Doc | (local pro rate x mows) - (fuel+amortization+time). Running counter. |
| Year in Review (Wrapped) | Prove | Idea | L | Yes | Concept Doc | November ship. Annual acquisition spike. Include Spotify-Wrapped-style equivalences: total sq ft as football fields, miles walked as recognizable routes, hours as binge-watch equivalents. Lookup table plus division — near zero build cost, high share value. |

## v2

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| Affiliate on equipment/products | Prove | Idea | M | No | Concept Doc | Non-intrusive; high-intent. Revenue without ad-feel. |
| Custom calendar builder w/ templates | Guide | Idea | L | Yes | Friend | Bermuda/North TX/Sprinklers/Beginner -> generated 12-month program. Pro-tier justification. |
| Equipment brand/model catalog + affiliate pairing | Prove | Idea | L | No | Kent |  |
| Equipment-to-mow linkage (which specific mower per mow) | Track | Idea | M | No | Kent |  |
| Fertilizer application calculator | Guide | Idea | S | Yes | Friend | area x rate / analysis. Easy; high-utility; free-tier hook. |
| Lawn of the Month | Community | Idea | M | Yes | Kent | Scoped + plural + categories. Hold until one region has density. |
| Neighbor Mode / crew (logging only) | Community | Idea | M | No | Concept Doc | Log mows for others. Growth loop. NO money. See Decision D-004. [Decision: No escrow / no money between users ever] |
| Product/mineral directory | Guide | Idea | M | Yes | Friend | Build as RAG corpus + affiliate data; surface contextually. Nobody browses a directory. |
| Rain / irrigation tracking | Guide | Idea | M | Yes | Friend | Local rainfall totals or manual rain-gauge input. It rained 1.4 in - skip Tuesday cycle. |
| Regional leaderboards | Community | Idea | L | Yes | Concept Doc | Scoped by climate zone + grass type. Never rank Bermuda vs fescue. |
| Soil sample kit | Prove | Idea | L | No | Friend | Physical kit + affiliate. Generates proprietary soil data = moat. NOT a treatment store. [Decision: Soil sample kits yes; treatment store no] |

## v3

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| Marketplace (equipment/guides resale) | Prove | Idea | XL | No | Concept Doc | Needs liquidity + trust + payments. Density first. |
| Remote consulting (Teladoc for lawn) | Community | Idea | XL | Yes | Friend | Verified experts + payments + ratings. Marketplace by another name. Defer. |

## TBD

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| Discussion forums | Community | Idea | L | No | Friend | Conflicts with D-001 (free-text). Lawn Journals ARE the forum. Revisit v2 earliest. [Decision: No free-text comments at launch] |
| Gardening / landscaping expansion | Out of Scope | Idea | XL | No | Kent | Deliberate LATER not maybe. Post-PMF. See Decision D-006 and North Star Section 4. [Decision: Mowing only; gardening/landscaping is a deliberate later] |

## Never

| Feature | Pillar | Status | Effort | Attaches to Mow | Source | Notes |
|---|---|---|---|---|---|---|
| GPS route tracing | Out of Scope | Killed | L | Yes | Kent | Killed. Phone GPS too inaccurate. Polygon draw instead. See Decision D-002. [Decision: No GPS route tracing; use polygon draw instead] |
| Neighbor mows w/ escrow + verification | Out of Scope | Killed | XL | No | Friend | Different company (money transmission/liability/1099s). See Decision D-004. [Decision: No escrow / no money between users ever] |
| Sprinkler-app control integration | Out of Scope | Killed | M | No | Kent | Cut. Controlling irrigation != the user's mowing pain. (Rain TRACKING kept separately.) |
