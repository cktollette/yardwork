# Decision Log

> Re-exported snapshot from Notion (source of truth). Sorted by D-number.

## D-001 — No free-text comments at launch

- **Date:** July 1, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Backlog refs:** Discussion forums, Reactions (no free-text)  
- **Revisit on:** After v1.5 community has real density in one region  

**Rationale:** Negativity kills vertical social apps in the comment field. Ship reactions plus a curated response set only. Establish norms first; open free-text later. You can always add text; you can never un-poison a community.

## D-002 — No GPS route tracing; use polygon draw instead

- **Date:** July 1, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Backlog refs:** GPS route tracing, Lawn polygon draw (satellite)  
- **Revisit on:** Only if RTK-grade phone accuracy becomes cheap  

**Rationale:** Phone GPS is accurate to roughly 3-5m and useless for tracing a residential lawn perimeter; traces look like scribbles and destroy trust on day one. User draws lawn polygon once on a satellite map. One-time ~60s unlocks area, pattern, discharge, savings.

## D-003 — No specialized SLM; use RAG over turf-extension content

- **Date:** July 1, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Backlog refs:** AI coach (RAG over extension content)  
- **Revisit on:** 100k+ users  

**Rationale:** A lawn-specific fine-tuned model is a research project that consumes the build budget and underperforms a frontier model. Use Claude/GPT plus RAG over university extension turf guides. The corpus is the moat, not the model.

## D-004 — No escrow / no money between users ever

- **Date:** July 21, 2026  
- **Decided by:** Kent  
- **Reversibility:** One-way door  
- **Backlog refs:** Neighbor mows w/ escrow + verification, Neighbor Mode / crew (logging only)  
- **Revisit on:** Not planned. Would require a deliberate strategy change.  

**Rationale:** Neighbor-mows-with-escrow is a different company: money transmission, disputes, insurance, background checks, 1099s. A marketplace cold-start stacked on a social cold-start. Neighbor Mode stays logging-only. Users Venmo each other; we stay out.

## D-005 — Property is the account primitive not User

- **Date:** July 21, 2026  
- **Decided by:** Kent  
- **Reversibility:** One-way door  
- **Revisit on:** Never (get it right up front)  

**Rationale:** Model the property, not the person. User has many Properties, each has many Mows. Gives multi-property and I-also-mow-my-moms-lawn behavior free. Retrofitting after launch is a painful migration. The one true one-way door in v0.

## D-006 — Mowing only; gardening/landscaping is a deliberate later

- **Date:** July 1, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Backlog refs:** Gardening / landscaping expansion  
- **Revisit on:** After product-market fit in mowing  

**Rationale:** Vertical communities win by being aggressively narrow first: Strava = cycling, The Grint = golf. Gardening is post-PMF, not a v1 maybe. Documented so it stops being a distraction.

## D-007 — Soil sample kits yes; treatment store no

- **Date:** July 1, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Backlog refs:** Soil sample kit  
- **Revisit on:** Post-v2 monetization review  

**Rationale:** Soil kit is cheap, high-margin, and generates proprietary data we own: soil profile leads to better recs leads to moat. Selling treatments = inventory plus shipping = becoming Sunday. Kit plus affiliate links, not a store.

## D-008 — Solo build for now; structured re-entry path for co-founder

- **Date:** July 20, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** When co-founder has bandwidth OR before any equity is discussed  

**Rationale:** Co-founder lacks bandwidth currently. Solo lowers coordination cost to zero during validation. Keep Notion and Project structure co-founder-ready. Do NOT do equity/LLC paperwork yet; revisit when he formally joins.

## D-009 — Stack: Expo + Supabase + Mapbox + RevenueCat

- **Date:** July 20, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Revisit on:** If a specific limit is hit  

**Rationale:** Expo = one codebase iOS+Android, solo-buildable. Supabase = Postgres plus auth plus storage plus realtime, no backend to operate. Mapbox = satellite tiles plus polygon plus pattern rendering. RevenueCat = cross-platform IAP without receipt validation. Weather via OpenWeather/Tomorrow.io.

## D-010 — addendum squash-merge to main as the standing convention (now 2-for-2)

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:**   

**Rationale:** 

## D-010 — Development method: Explore-Plan-Implement-Commit feature branches self-review PRs

- **Date:** July 20, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** Ongoing  

**Rationale:** Deliberately practicing real SDLC for the Solutions Engineer job search. Git before code; feature branch per backlog item; propose plan before implementing; open a PR to myself, review the diff, merge. Solo but structured like a team.

## D-011 — Repo is public from day one

- **Date:** July 21, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** build-in-public narrative + job-search portfolio value outweigh early-messy-commit exposure.

## D-011 — Timestamp-based timing, never tick accumulation

- **Date:** July 21, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Revisit on:** Never  

**Rationale:** This is an architectural invariant future features depend on, so it belongs in the log, not just the commit message. optionally fold in "no pause button in v0" as a note on D-011 or the backlog row rather than its own entry.

## D-011 — Gate stats behind data minimums instead of showing sparse/null values

- **Date:** July 22, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** If unlock hints test poorly with the initial users  

**Rationale:** With <3 mows, averages are meaningless and the screen looks
broken — fatal during the 50-user validation window. Gate averages behind
3+ mows and efficiency (sqft/min) behind polygon existence; gated stats
render as unlock hints ("Log 1 more mow to unlock averages"). Turns sparse
data into a progression mechanic. Reusable pattern: any derived stat with
a data dependency gets a gate + hint, not a null.

## D-011 — Custom dev client (exit Expo Go) forced by Mapbox native SDK

- **Date:** July 22, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Revisit on:** Never  

**Rationale:** 

## D-012 — react-navigation native-stack over hand-rolled navigation

- **Date:** July 22, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Revisit on:** Never  

**Rationale:** ecosystem standard, platform back behavior free, additive per-screen cost

## D-012 — grace-week rule

- **Date:** July 22, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** mpty current ISO week doesn't break a streak; a mow in it counts immediately.

## D-013 — Repository pattern for persistence; AsyncStorage now, Supabase swaps in behind the interface

- **Date:** July 22, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-014 — AsyncStorage-now for polygon persistence via repository interface; migration SQL committed as documentation. Reversibility: Easy. Revisit: the Supabase wiring branch.

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** the Supabase wiring branch  

**Rationale:** 

## D-014 — Repo transferred to cktollette; history preserved, not rewritten.

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  
- **Revisit on:** Never  

**Rationale:** Repo lived under ktollette (personal account joined to the
HashiCorp org). Transferred to cktollette. Chose GitHub transfer over
clone-and-push to preserve PRs #1-#4 and their review comments. Explicitly
rejected git filter-repo: rewriting history would change every SHA and
break the commit-to-PR links that make this a credible SDLC portfolio
artifact. Cosmetic attribution on four squash-merge commits is not worth
that cost. SSH host aliases (github-work / github-personal) isolate
credentials between the two accounts.

## D-015 — PanResponder + MarkerView over react-native-gesture-handler (no new native dep, no extra rebuild)

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** If gesture bugs surface on physical device  

**Rationale:** 

## D-015 — Bundle identifier stays com.ktollette.yardwork

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** One-way door  
- **Revisit on:** Never  

**Rationale:** Users never see the bundle identifier. It does not need to
match the eventual marketing name (Instagram still ships as
com.burbn.instagram). Rejected renaming to com.cktollette.yardwork and
rejected a reverse-domain form, since no domain is owned yet and
http://thecutclub.com/ is taken. Changing it would have cost a dev client rebuild
for zero user-facing benefit.

## D-016 — eas-cli not a project dependency

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** Never  

**Rationale:** Installed as a devDependency for reproducibility; its
transitive @expo/require-utils requires typescript ^5.x, conflicting with
the declared 6.0.3. The lockfile never recorded the nested 5.9.3, so
npm ci failed in the cloud while npm install passed locally. Removed.
eas.json's cli.version constrains the CLI version on both sides without
requiring local installation. Also pinned jest-expo to exact 57.0.2 to
resolve a separate peer conflict with react-native's exact
@react-native/jest-preset pin.

## D-017 — Sequencing: users before backend

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** After the 50-user validation test, or when cross-device
sync is needed for the community layer  

**Rationale:** All five v0 features work against AsyncStorage via the
repository pattern (D-013). None require a network. The one real argument
for Supabase now is measurement, but that justifies instrumentation, not
auth plus a three-repository migration. Per North Star §3, the metric is
mows logged, not code shipped. Roughly five weeks of clean Bermuda growth
remain before seasonal decline contaminates the validation data.

## D-018 — Nav back-swipe disabled for all of draw mode, not just during a drag

- **Date:** August 3, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** If a bottom sheet or tab swipe adds a third recognizer  

**Rationale:** Physical-device testing surfaced two gesture recognizers
stealing an in-progress vertex drag: the map's native pan and
@react-navigation/native-stack's interactive pop (D-012). Map pan is fixed
drag-scoped via scrollEnabled. The nav gesture cannot be: when the thumb's
contact patch overlaps the edge band, the pop recognizer claims the touch
before onPanResponderGrant fires, so a drag-start toggle never runs.
Scoping gestureEnabled to draw mode removes the race instead of trying to
out-time it. Safe because Save and Cancel are both visible exits. Cleanup
on unmount prevents leaking a disabled swipe-back app-wide

## D-026 — Controlled camera:

- **Date:** August 4, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** cameraCenter is deliberately-written state (edit-load, location-resolve), never derived from live vertices. Prevents camera-snap-per-tap. Same decision class as D-014

## D-026 — Edit/delete pulled forward from v0.5 into post-v0

- **Date:** August 4, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** Not needed. Shipped  

**Rationale:** Real users will fat-finger logs during the 50-user validation window, and one garbage record poisons the derived stats that feed the North Star metric (mows logged, and the trust that makes people keep logging). Edit/delete is data-quality protection for the validation test itself, not feature scope creep. Shipped as PR #12 before recruiting begins.

## D-026 — Name: Klippa selected over The Cut Club / The Turf Club

- **Date:** August 6, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  

**Rationale:** DIY knockout clean (no US federal registration; Dutch Klippa rebranded to Doxis; IKEA conflict was a false memory — their sofa is KLIPPAN). Formal attorney clearance skipped; ITU examination serves as conflict detector.

## D-027 — Hard delete, not soft delete

- **Date:** August 4, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  
- **Revisit on:** The Supabase sync branch — sync protocols often want tombstones to propagate deletes across devices. Decide then, behind the repository interface (D-013), so screens don't change either way.  

**Rationale:** Soft delete (deletedAt tombstone) buys undo and sync-conflict resolution; undo is out of scope and there is no sync. The cost is that every read path (list, stats, streak) must filter tombstones forever, and a missed filter is a silent stats bug — exactly the data-quality failure this feature exists to prevent. With local-only AsyncStorage, tombstones protect nothing. Delete is idempotent (missing id is a no-op) to absorb double-tap races on the confirm dialog.

## D-027 — Domain: http://getklippa.com/ primary over http://klippaapp.com/ (typo/speech seam in the double-a)

- **Date:** August 6, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** http://klippaapp.com/ bought as 301 redirect

## D-028 — candidate: TestFlight uses the existing production profile

- **Date:** August 7, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** no separate preview profile. Same store-signed artifact promotes TestFlight → App Store

## D-029 — candidate: App Store listing name "Klippa Lawn Society"

- **Date:** August 7, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** tandalone "Klippa" taken; descriptor adopted as identity, unpunctuated.

## D-030 — candidate: Site hosted as static HTML in the app repo (site/)

- **Date:** August 7, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** eployed via Cloudflare Pages, zero JS, auto-deploy on merge.

## D-031 — HOC entered at save time with last-value seeding; no pre-mow setup screen

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Every screen before the timer is an abandonment point; seeding makes the field near-zero-cost.

## D-034 — Equipment is a standalone top-level entity in its own collection

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Not linked from Mow; linkage deliberately separate.

## D-035 — driveType is mower-only, enforced by normalization, not the type system

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-036 — Equipment catalog descoped: freeform brand/model + type-aware brand chips; nullable catalogId reserved in schema

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Revisit: v2, paired with affiliate work (a catalog is an affiliate asset; that's when it earns its maintenance cost).

## D-037 — Mow records job types performed (toolTypes enum), not equipment references

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Job history immune to garage deletions; equipment-to-mow linkage descoped. Revisit: when Garage gains maintenance tracking. (Supersedes the withdrawn dangling-reference design — 038/039 numbers freed for reuse.)

## D-038 — Weather provider: OpenWeather free tier

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Chosen over http://tomorrow.io/; GDD (v1) gets its own integration decision later. Feature not yet built; decision stands for next session.

## D-040 — Fire-and-forget weather capture; save path carries zero network.

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-041 — Write-queue serialization over optimistic versioning for repository mutations

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Revisit at supabase sync

## D-042 — Weather is capture-only provenance: never editable, never backfilled

- **Date:** August 10, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-043 — HealthKit sole activity source; wearables via aggregation

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-044 — Window guard (≥60s real timer window), not clock guard

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-045 — Bounded retry activity capture (save/+2m/+5m, no daemon); an attempt counts only when both metrics are present — partials retry, never attach. Revised twice same-session on device evidence

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-046 — Read-only HealthKit posture enforced in build config (amended)

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Attempted read-only HealthKit plist posture: LIFO config plugin (one commit), then the library's declared false option — both defeated by ASC upload validation, which scans binary API references, not calls. Final state: NSHealthUpdateUsageDescription present with wording stating the app never writes ("required by a library the app includes but is never used"). Lesson: plist purity is bounded by what your dependencies compile in; the honest usage string is the actual control surface

## D-047 — kingstinct library over react-native-health (New Arch); swap contained to one file by the service interface

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-048 — Tech debt tracked as GitHub issues, not backlog rows

- **Date:** August 11, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Product features live in the Notion backlog; code-hygiene chores (refactors, deprecations, diagnostics) are GitHub issues labeled chore, attached to the repo they describe. Rationale: chores belong with the codebase and close opportunistically inside feature PRs touching the same files; keeping them out of the backlog keeps it purely product-shaped. First two issues created from PR #25's session. Revisit: if the issue list rots unworked, collapse back to one list.

## D-049 — Lawn is a set of named zones; area = sum; single polygon migrated to zones[0] with deterministic id.

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Costly  

**Rationale:** 

## D-050 — Mows zone-ignorant; zoneIds reserved for per-mow selection

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-051 — Weather centroid pools all zone vertices

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-052 — Property repo gains the write-queue mutex (ratified drift); convention: all repositories serialize mutations

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-054 — Grass type is a per-zone optional attribute from a curated chip list; the future GDD input, never computed from in this PR

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** 

## D-056 — Storage reads tolerate malformed elements (drop + dev-log), never throw; startup load failures surface an error state, never hang

- **Date:** August 12, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** Chain-test convention — every schema bump tests from the oldest supported version; documented at the seam.

## D-064 — Amends D-030: email capture is the site's one JS island; the rest stays zero-JS

- **Date:** August 18, 2026  
- **Decided by:** Kent  
- **Reversibility:** Easy  

**Rationale:** D-030 committed the marketing site to zero JS. The early-access
email form needs Cloudflare Turnstile for spam defense, and Turnstile is
client-side JavaScript by nature (it loads a vendor script and injects the
response token), so strict zero-JS is not achievable for this feature no matter
how submit is handled. Given that, we also accept a small progressive-enhancement
submit script (Option B) so the form shows inline success/error state without a
full-page navigation; the plain form POST still works if that script fails,
falling back to an HTML response from the Pages Function. The exception is scoped
to the signup section only. Every other page and section remains zero-JS.

## Unnumbered (need D-numbers assigned in Notion)

### Map centering on user location pulled from v0.5 into v0

- **Date:** August 3, 2026  
- **Reversibility:** Easy  

**Rationale:** Device testing showed the hardcoded Frisco default makes the concept doc's 60-second onboarding claim false for real users.

### Node runtime pinned via .nvmrc as single source of truth for local + CI

- **Date:** August 4, 2026  
- **Reversibility:** Easy  
