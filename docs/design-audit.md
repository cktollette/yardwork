# Phase 0 — Design Audit

> Read-only discovery pass over the app UI layer (`src/`, excluding `site/`). No app
> code was changed; this document is the only artifact. North star: Strava
> (confidence, restraint, motion with intent, data as celebration, premium feel).
> Secondary: The Grint.

Token system audited against `src/theme/`:
- **colors** (`colors.ts`): `ink` `#2D2A32`, `primary` `#468367`, `primaryMuted` `#639376`, `sand` `#D6D1B1`, `cream` `#F2EDEB`, `surface` `#FFFFFF`, `textSecondary` `#57545C`, `textMuted` `#8B888F`, `border` `#E2DDD5`, `destructive` `#B4534B`, `warning` `#C08A3E`, `textOnColor` `#FFFFFF`.
- **spacing** (`spacing.ts`): `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`.
- **radii** (`spacing.ts`): `sm 6 · md 10 · lg 12 · pill 999`.
- **typography** (`typography.ts`): `caption 13 · bodySmall 15 · body 16 · title 18 · titleLarge 20 · heading 22 · display 72`.

**Headline: the token layer is healthy. The design-system layer is not.** Color/spacing/type
discipline is excellent — nearly every screen pulls from tokens. The real debt is
structural: no scrim/shadow tokens, a handful of ad-hoc buttons that bypass the shared
`Button`, ~9 near-duplicate component clusters, weak primary-action hierarchy on several
screens, and a **universal missing error state** (every list loader falls through to a
permanent blank screen on repository rejection).

---

## Phase 0 baseline metrics

| Metric | Count |
|---|---|
| **Token violations** (in-scope, excluding intentional map chrome / D-070 canvas) | **11 sites** across 7 files |
| — of which are the same missing **scrim/overlay token** | 4 sites |
| — of which are the same missing **shadow/elevation token** | 2 sites |
| **Screens with ambiguous / absent primary action** | **5** (Home, Profile, Log, Statistics, LawnDraw) — +3 mild (Timer running-state, In-Progress banner, SearchablePicker) |
| **Screens missing a designed error state** (blank-screen fall-through on load failure) | **6** (Home, Profile, Statistics, Log, LawnHome, Garage) + 1 silent save-error swallow (LocationSheet) + 1 missing empty state (SearchablePicker) |
| **Duplicate-component clusters** (consolidation candidates) | **9** |

Every finding below is tagged **S / M / L** effort.

---

## 1. Token inventory

Design tokens live in `src/theme/` (`colors.ts`, `spacing.ts`, `typography.ts`, barrel `index.ts`).
Adoption is strong; the violations cluster into two missing-token classes (scrim, shadow) plus a few one-off magic numbers.

### 1a. Real violations (in scope)

| File | Line | Violation | Token it should use |
|---|---|---|---|
| `src/profile/LocationSheet.tsx` | 225 | `backgroundColor: 'rgba(0,0,0,0.4)'` backdrop | **new `colors.scrim`** (does not exist yet) |
| `src/profile/SearchablePicker.tsx` | 89 | `backgroundColor: 'rgba(0,0,0,0.4)'` backdrop | **new `colors.scrim`** |
| `src/mow/FirstMowSheet.tsx` | 57 | `backgroundColor: 'rgba(0,0,0,0.4)'` backdrop | **new `colors.scrim`** |
| `src/share/ShareCardModal.tsx` | 95 | `backgroundColor: 'rgba(45, 42, 50, 0.6)'` charcoal scrim (≈ `ink` at 60%) | **new `colors.scrim`** — note this one differs from the other three (charcoal vs black), so a shared token would also fix an inconsistency |
| `src/navigation/RootTabs.tsx` | 152–155 | `shadowColor: '#000'` + `shadowOpacity 0.2`, `shadowRadius 6`, `shadowOffset {0,2}`, `elevation 6` (center MOW button) | **new `shadows.*` / `elevation` token** (none exists) |
| `src/mow/MowInProgressBanner.tsx` | 105–109 | `shadowColor: '#000'` + shadow/elevation magic numbers | **new `shadows.*` token** |
| `src/mow/MowInProgressBanner.tsx` | 112 | pip `width: 8, height: 8, borderRadius: 4` | `spacing.sm` (8) / half → radius needs a `radii.xs`-style value; currently off-scale |
| `src/mow/FirstMowSheet.tsx` | 75–77 | step badge `width: 28, height: 28, borderRadius: 14` | off-scale magic numbers (circle geometry); no token |
| `src/mow/ToolBadges.tsx` | 39 | `paddingVertical: 2` | `spacing.xs` (4) — every sibling chip uses `spacing.xs`; this is the lone outlier |
| `src/stats/StatsScreen.tsx` | 230, 256 | `marginBottom: 2`, `marginTop: 2` | off-scale magic (< `spacing.xs`); tighten to a token or `xs` |
| `src/components/StatRing.tsx` | 34, 37, 57, 117 | `DEFAULT_SIZE 72`, `DEFAULT_STROKE_WIDTH 6`, default `gap 6`, `wrap.gap 6` | off-scale defaults (`6` not in scale); documented + caller-overridable, so **low priority** |

**Effort:** the four scrims + two shadows collapse into **two new tokens** (`colors.scrim`, a `shadows` map) — **S** once the tokens exist. The one-off geometry magics (FirstMowSheet badge, banner pip, StatRing defaults) are **S** each and partly legitimate.

### 1b. Systemic off-scale value (consistent, low priority)

`letterSpacing: 1` recurs across ~10 files (Home, Profile, Stats, LawnHome, Garage,
EquipmentForm, EquipmentCard, HocField, BagsField, PhotoSlots, RootTabs). It is **consistent**
but off any scale — there is no `letterSpacing` token. Candidate: add one token (e.g.
`typography.tracking = 1`). **S**, cosmetic.

### 1c. Intentional — do NOT flag (noted for completeness)

- `src/share/MowShareCard.tsx` — all large font sizes (`84/56/40/30`) and big spacing
  (`paddingHorizontal 80`, `gap 72`, ring constants `360/120/42/18/16`, on-photo whites
  `#FFFFFF` / `rgba(255,255,255,*)`) are the fixed **1080×1080 share canvas** (**D-070**).
  Code comment at `MowShareCard.tsx:148–150` documents this. Correct as-is.
- `src/lawn/LawnDrawScreen.tsx` — full-screen Mapbox editor map chrome: `container` `#000`
  (784), scrims `rgba(0,0,0,0.6)` (824, 873), `btnIdle` `rgba(255,255,255,0.92)` (918),
  and touch-target geometry (`handle` 18×18 r9, `firstHandle` 22×22 r11, `handleHit`
  padding 10, PanResponder threshold, hitSlops). These are off-scale **by necessity** for a
  translucent map overlay and are commented as such. Treat as intentional map-chrome; a few
  raw absolute-position offsets (`insets.top + 8/52`, `insets.bottom + 16`, `minWidth 60/84`,
  `lineWidth 3`, `fillOpacity 0.35`) are borderline but justified for absolute-positioned overlays.
- `#000` as a `shadowColor` is a platform convention; the *token* gap (no shadow token) is the
  real finding, not the black itself.

---

## 2. Screen census

12 routed screens + 4 modals/sheets + 1 floating overlay. Nav map from `App.tsx` (root stack)
and `src/navigation/RootTabs.tsx` (tabs: Home · Profile · **MOW** center-action · Log · Lawn).

| Screen (file) | Primary action | Dominant? | Competing same-weight elements | Verdict |
|---|---|---|---|---|
| **Home** `home/HomeScreen.tsx` | *(none in populated state)* — read-only dashboard of 3 cards (101–138); only tap target is the "Last mow" card (111) | ✗ | 1 (card press) | **Ambiguous** — the true "Mow" action lives off-screen (center tab). Empty state (65–85) nails it: one primary "Log your first mow" (75). |
| **Profile** `profile/ProfileScreen.tsx` | *(none)* — navigation hub: 4 equal-weight `SectionRow`s (144–163) + location edit (102–120) | ✗ | 4+ rows at identical weight | **Ambiguous by design** (nav hub). Location edit is a low-contrast pencil (114), not a button. |
| **Log** `mow/MowListScreen.tsx` | *(none)* — list of rows → detail (55–80) | ✗ | rows equal (intended) | **Ambiguous where a new user lands**: empty state (37–46) has **no CTA** — the natural action (start a mow) is absent here. |
| **Statistics** `stats/StatsScreen.tsx` | Conditional: "Draw your lawn" (112) when no lawn; **none** when drawn ("Manage zones" is a text link, 100–107) | ▲ partial | mutually exclusive | **Ambiguous in drawn state** — no dominant action, read-only rows + a quiet text link. |
| **LawnDraw** `lawn/LawnDrawScreen.tsx` | "Save lawn" / "Done" (703 / 707) | ▲ color only | 3 equal-geometry buttons per state + top-bar Cancel/Remove | **Weak primacy** — primary differentiated by green fill only, same size/position as Undo/Redraw. |
| **Timer** `mow/MowTimerScreen.tsx` | Idle: "Start" (173) — clear. Running: green Pause/Resume (185) vs outline "Finalize" (193) | ▲ (idle) / ✗ (running) | 2 co-equal buttons when running | **Mild** — the eye-catching green control only *toggles momentum*; the flow-advancing "Finalize" is the quieter outline. Comment (183–184) acknowledges the split. |
| **Save Mow** `mow/SaveMowScreen.tsx` | "Save" (272) primary + "Discard" (280) pill | ✓ | clean 2-tier | **Clear** — reference hierarchy for the app. |
| **Mow Detail** `mow/MowDetailScreen.tsx` | "Save changes" (411) full-width primary | ✓ | Delete (419, text-red) below; Share link in header (270) | **Clear.** |
| **Garage** `equipment/GarageScreen.tsx` | "Add equipment" (40) full-width primary | ✓ | none | **Clear.** |
| **Equipment Form** `equipment/EquipmentFormScreen.tsx` | "Save equipment" (238) primary | ✓ | Delete (247, text-red) subordinate | **Clear.** |
| **Lawn Home** `lawn/LawnHomeScreen.tsx` | "Draw your lawn" / "Add zone" (192 / 184) primary | ✓ | "Equipment garage" pill (196) subordinate; ZoneRow has co-equal Retrace/Delete (73/81) | **Clear per state**; minor ambiguity inside each ZoneRow. |
| **LocationSheet** `profile/LocationSheet.tsx` | "Save" (193) primary + "Cancel" (194) pill | ✓ | form fields above read as inputs | **Clear** — cleanest modal hierarchy. |
| **FirstMowSheet** `mow/FirstMowSheet.tsx` | "Got it" (42) primary | ✓ | none | **Clear.** |
| **SearchablePicker / CountryPicker** `profile/SearchablePicker.tsx` | Select a row (68–77) | ✗ | "Close" is a low-weight text link (79) | **Mild** — acceptable for the pattern; no dominant control. |
| **ShareCardModal** `share/ShareCardModal.tsx` | "Share" primary (59–78) | ✓ | ghost secondary alongside | **Clear.** |
| **In-Progress Banner** `mow/MowInProgressBanner.tsx` | Reopen Timer (whole-bar press, 67) vs "Finish" pill (80) | ▲ nested | 2 nested targets | **Mild** — the salient "Finish" advances; the bar's own reopen intent has no visible affordance (typical mini-player tradeoff). |

**Flagged ambiguous/absent primary action: 5** (Home, Profile, Log, Statistics, LawnDraw),
plus 3 mild (Timer running-state, In-Progress banner, SearchablePicker). The pattern:
data-dense read-only screens with no celebratory dominant action — the opposite of the
Strava "one big action / data as reward" north star.

---

## 3. Consistency findings

| # | Finding | Where | Effort |
|---|---|---|---|
| 3.1 | **Three different destructive-action treatments** for the same job: inline text link (LawnHome ZoneRow `81`), text-only red pill (EquipmentForm Delete `288–293`; MowDetail Delete `464–470`), and the shared filled `Button variant="destructive"` (`Button.tsx:63`, currently **unused anywhere**). | LawnHome, EquipmentForm, MowDetail, Button | **M** |
| 3.2 | **Four+ ad-hoc buttons bypass shared `Button`**: MowTimer Start/Pause/Finalize (`172–201`), LawnDraw control bar (`654–708`), ShareCardModal btns (`59–78`, styles `128–138`), MowDetail/EquipmentForm Delete. The shared `Button` lacks the **outline/secondary** variant these need (Timer "Finalize", LawnDraw toggles) — a real gap driving the divergence. | Timer, LawnDraw, ShareCardModal, MowDetail, EquipmentForm | **M** |
| 3.3 | **Header treatment split**: Profile uses a **custom in-body header** (`100–121`); Home/Stats/Log/Garage/EquipmentForm/Timer/SaveMow/MowDetail use the **native nav header**; LawnDraw is `headerShown:false` custom map chrome. Profile's divergence is defensible but inconsistent. | Profile vs rest | **S** |
| 3.4 | **`StatsScreen` reimplements `Card` inline** (`section` style `217–224` = `surface` + `border 1` + `radii.lg` + padding — identical to `Card.tsx:21–25`) across 7 sections instead of using `<Card>`. Same hand-rolled card idiom recurs in MowList rows (`111–118`), LawnDraw `resultsCard` (`883–890`), FirstMowSheet sheet (`61–66`). | Stats, MowList, LawnDraw, FirstMowSheet | **M** |
| 3.5 | **Elevation is inconsistent**: only `RootTabs` (center button) and `MowInProgressBanner` use shadows; `Card` and every surface elsewhere are flat/border-only. The flatness is a coherent restraint choice — but the two shadowed elements are the *only* elevated things and use ad-hoc `#000` shadows. Decide: flat everywhere, or a real elevation token. | RootTabs, Banner, Card | **S** (decision) |
| 3.6 | **Pressed-opacity inconsistency**: `0.7` (Home 214, Profile 205), `0.6` (SearchablePicker 113), `0.8` (Timer 262). Same interaction, three values. | multiple | **S** |
| 3.7 | **Hint/placeholder color inconsistency**: Profile distance hint uses `colors.textSecondary` (194); Stats hints use `colors.textMuted` (249). Stats hint is also the only `fontStyle:'italic'` in the app (250). | Profile vs Stats | **S** |
| 3.8 | **Loading state is uniformly a blank cream `<View>`** (flash-avoidance) on Home (62), Profile (78), Stats (83), Log (34), LawnHome (158), Garage (36), MowDetail (283), EquipmentForm (142) — *only* LawnDraw shows a real `ActivityIndicator` (503). Consistent, but not a *designed* loading state (no skeleton/spinner). | all list/data screens | **M** (if we want skeletons) |
| 3.9 | **Corner radii are well-tokenized** — one genuine consistency win. Cards `radii.lg`, pills/chips `radii.pill` across the board. Only off-token radii are LawnDraw map handles (9/11, intentional) and FirstMowSheet badge (14). | — | ✓ |

---

## 4. State coverage

Legend: **✓ Designed** · **○ Blank (intentional flash-avoidance, not a designed affordance)** · **✗ Absent (falls through to blank/silent)** · **— N/A**.

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Home | ✓ (65–85, CTA) | ○ (62) | **✗** — `Promise.all().then()` at 47–54, no `.catch` → permanent blank |
| Profile | ✓ partial (location 116–119; section subtitles) | ○ (78) | **✗** — 60–69, no `.catch` |
| Statistics | ✓ (109–123 + D-011 unlock hints) | ○ (83) | **✗** — 57–75, no `.catch` |
| Log (MowList) | ✓ but **no CTA** (37–46) | ○ (34) | **✗** — `listMows()` 25–27, no `.catch` |
| Lawn Home | ✓ (186–194, CTA) | ○ (158) | **✗** — 101, no `.catch` |
| Garage | ✓ (47–53, "No equipment yet") | ○ (36) | **✗** — 26, no `.catch` |
| Mow Detail | — | ○ (283) | ✓ not-found (285–294) + `Alert` on save/delete (163/172/228/246) |
| Equipment Form | — (form) | ○ (142) | ✓ not-found (144–153) + `Alert` (88/117/135) |
| Save Mow | — (draft) | — (seeds inline) | ✓ `Alert` (170) + disables buttons |
| Timer | ✓ idle "Ready to mow" (163/172) | — (restores from storage) | — |
| LawnDraw | — (map is canvas; status pill guides) | ✓ `ActivityIndicator` (500–506) | ✓ `Alert` save/remove (428/465) + inline geocode error (618–622) |
| LocationSheet | — (form) | ✓ "Saving…" + disables (66/193) | **✗ silent** — `catch {}` swallows save failure (91–93), no user-visible error |
| SearchablePicker | **✗** — no `ListEmptyComponent`; empty search renders nothing (63–78) | — | — |
| FirstMowSheet / Banner / ShareCardModal | — (static/overlay) | — | — |

**The dominant gap: error state.** Six data screens (Home, Profile, Statistics, Log, LawnHome,
Garage) share the identical failure mode — a rejected repository read leaves state `null`
forever, rendering the intentional loading-blank *permanently*. There is no retry, no message.
LocationSheet additionally swallows write errors silently. SearchablePicker lacks a
"No results" empty state. **This is the single highest-leverage fix in the audit** and is
largely one shared pattern (a `useAsyncResource`-style hook or a shared `<ScreenState>` wrapper
with loading/error/empty branches). **M** for the shared primitive, **S** per screen to adopt.

Note: the "loading = blank" choice is deliberate (flash-avoidance) and *consistent*; whether it
should become a designed skeleton is a Phase 3 decision, not a bug.

---

## 5. Component duplication

Nine consolidation clusters. Shared components today: `Button`, `Card`, `ChipRow`,
`SegmentedControl`, `StatRing` (`src/components/`).

| # | Cluster | Members (with styling evidence) | Proposed primitive | Effort |
|---|---|---|---|---|
| 5.1 | **Static display pill / badge** | `HocChip` (23–34) ≡ `TempChip` (24–35) **byte-identical** (`spacing.sm`/`spacing.xs`, `radii.pill`, `colors.sand`, caption-bold tabular); `ToolBadges` (35–45, only diff `paddingVertical: 2`); `EquipmentCard` local `Badge` (14–20). | `<Chip static>` / `<Badge>` (a non-interactive `ChipRow` sibling) | **M** |
| 5.2 | **Selectable pill (multi/single)** | `ToolTypePicker` chip (60–81) ≈ `ZonePicker` chip (61–73) **near-identical**; both ≈ `SegmentedControl` `segment` (69–90). Diff is only select semantics (Set vs id-list vs single) + selected fill (`primary` vs `ChipRow`'s `sand`). | one parameterized chip: `mode: single|multi`, `selectedFill: sand|primary` — subsumes ChipRow, SegmentedControl, ToolTypePicker, ZonePicker | **L** |
| 5.3 | **Stepper field** | `HocField` stepper (117–155) ≈ `BagsField` stepper (104–142) — 44×44 pill steppers, `stepperDisabled` 0.4, `value` minWidth 64 tabular, `clear`, `setButton` copy-pasted; diffs are HocField's info affordance + BagsField's seed-on-tap. | `<StepperField>` | **M** |
| 5.4 | **Bottom-sheet scaffold** | `SearchablePicker` (89–97) ≈ `ShareCardModal` (93–105) ≈ `LocationSheet` (225–230) ≈ `FirstMowSheet` (57–66) — backdrop + `borderTopLeftRadius/Right: radii.lg` sheet, `justifyContent: flex-end`. Backdrops disagree (`rgba(0,0,0,0.4)` vs charcoal) — see 1a. | `<BottomSheet>` | **M** |
| 5.5 | **Hand-rolled Card** | `StatsScreen.section` (217–224), `MowList` row (111–118), `LawnDraw.resultsCard` (883–890), `FirstMowSheet` sheet (61–66) all replicate `Card`'s surface+border+`radii.lg`. | use existing `<Card>` | **M** |
| 5.6 | **Text field** | `LocationSheet.input` (241–249) ≡ `SearchablePicker.search` (98–105); `EquipmentForm` inputs (279–287, ×3); `MowDetail`/`SaveMow` `notesInput` (453–461 / 315–324); `LawnHome` zone input (234–242, underline variant). | `<TextField>` | **M** |
| 5.7 | **Eyebrow / overline label** | uppercase + `letterSpacing:1` + caption + `textSecondary` duplicated in Home `cardLabel` (178–184), Profile `cardLabel` (185–191), Stats `sectionTitle` (225–231), LawnHome (215–221, 252–257), Garage (91–96), EquipmentForm (273–278), EquipmentCard (61–67). | `<Eyebrow>` / `<SectionLabel>` | **S** |
| 5.8 | **List row** | 4 distinct implementations: Profile `SectionRow` (27–50, title+subtitle+chevron), Stats `StatRow` (36–43, label/value), SearchablePicker row (67–77), LawnDraw `resultRow` (891–896, border-bottom). | `<ListRow>` (leading/label/value/trailing slots) | **M** |
| 5.9 | **Button variants** | Shared `Button` has `primary`/`pill`/`destructive` (all filled/text pill). Missing: **outline/secondary** (Timer "Finalize" `251–255`, LawnDraw toggles, HocField/BagsField `setButton`, ShareCardModal ghost) and a **light/text destructive** (MowDetail/EquipmentForm Delete). Center MOW button (RootTabs) and Banner "Finish" are legitimately bespoke (elevated circle / compact bar). | extend `Button` with `secondary` + `destructiveText` variants, then migrate the ad-hoc buttons | **M** |

*Non-component dup (util):* `formatElapsed` is byte-identical in `MowTimerScreen` (38–44) and
`MowInProgressBanner` (16–22) — extract to `src/mow/format.ts`. **S**.

---

## Proposed phase plan

Sequenced so structural primitives land before per-screen restyles. Sizes are estimated PRs.

### Phase 1 — Token compliance (**~2 PRs**)
- **PR 1.1 (S):** Add missing tokens — `colors.scrim`, a `shadows`/`elevation` map, optional
  `typography.tracking`. Migrate the 4 scrims (§1a) and 2 shadows to them.
- **PR 1.2 (S):** Sweep remaining one-off magics — ToolBadges `paddingVertical` (→`spacing.xs`),
  StatsScreen `margin: 2`, FirstMowSheet badge geometry, StatRing off-scale defaults, pressed-opacity
  unification (§3.6). Leaves LawnDraw map chrome and the D-070 canvas untouched (intentional).

### Phase 2 — Hierarchy fixes (**~3 PRs**)
- **PR 2.1 (M):** Extend `Button` with `secondary` (outline) + `destructiveText` variants; migrate
  the ad-hoc buttons in Timer, LawnDraw, ShareCardModal, MowDetail/EquipmentForm Delete (§3.1, §3.2, §5.9).
- **PR 2.2 (M):** Give Home (populated) and Statistics (drawn) a dominant action / clearer
  celebratory hierarchy; add a CTA to the Log empty state (§2). Reconcile header treatment (§3.3).
- **PR 2.3 (S):** Resolve elevation decision (§3.5) — flat-everywhere or elevation token applied
  consistently; fix hint color/italic drift (§3.7).

### Phase 3 — State coverage (**~2 PRs**)
- **PR 3.1 (M):** Shared async-resource/`<ScreenState>` primitive with loading/error/empty branches;
  wire the 6 blank-on-error screens (Home, Profile, Statistics, Log, LawnHome, Garage) to it. Fix
  LocationSheet silent save-error and SearchablePicker empty state (§4).
- **PR 3.2 (M, optional):** Upgrade the intentional loading-blanks to designed skeletons if desired (§3.8).

### Phase 4 — Per-screen restyles + design-system extraction (**~5–6 PRs**)
- **PR 4.1 (M):** `<Chip static>`/`<Badge>` (§5.1) + unify selectable-chip family (§5.2).
- **PR 4.2 (M):** `<BottomSheet>` scaffold (§5.4) + `<TextField>` (§5.6).
- **PR 4.3 (S):** `<Eyebrow>` label (§5.7); migrate hand-rolled Cards to `<Card>` (§5.5).
- **PR 4.4 (M):** `<StepperField>` (§5.3) + `<ListRow>` (§5.8).
- **PR 4.5–4.6 (M each):** Screen-by-screen Strava restyle passes (Home dashboard as celebration,
  Timer as hero, Profile/Stats data-as-reward), consuming the primitives above.

**Rough total: ~12–13 PRs.** Phases 1 and 3 are the highest leverage per unit effort (Phase 1
is nearly mechanical; Phase 3 removes a real failure mode). Phase 4 is where the premium feel is won.

---

*Phase 0 complete. This is discovery only — no implementation proposed here is approved. Per
D-010, implementation begins only on explicit go.*
