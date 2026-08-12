# Experience Log

> Re-exported snapshot from Notion (source of truth). SE-relevant work by session.

## Notion workspace as source of truth

- **Date:** July 21, 2026  
- **SE skills:** Data Modeling, Project Management  

Set up a structured project-management system with relational databases, filtered views for different workflows, and a decision register.

## Decision Log as ADR practice

- **Date:** July 21, 2026  
- **SE skills:** Technical Decision-making  

Maintained an Architecture Decision Record with an explicit reversibility classification, so one-way-door decisions got proportionally more scrutiny than reversible ones.

## Git init → branch → commit → merge → prune, for the seed data

- **Date:** July 21, 2026  
- **SE skills:** Branching, Code Review, Version Control  

Ran a full feature-branch workflow: isolated work on a branch, reviewed the diff before committing, merged via fast-forward, and pruned the merged branch.

## CSVs generated as committed artifacts via Claude Code

- **Date:** July 21, 2026  
- **SE skills:** Reproducibility, Version Control  

Treated data files as version-controlled artifacts with atomic, single-purpose commits rather than ad-hoc manual files.

## Requirements traceability

- **Date:** July 21, 2026  
- **SE skills:** Requirements Traceability  

research→features, features→decisions relations) → "Wired bidirectional traceability so every feature links to its supporting evidence and governing decision

## Initialized the Yardwork repository and walking skeleton

- **Date:** July 21, 2026  
- **SE skills:** Environment Setup, Repo initialization, Toolchain Setup, Version Control, developer documentation, secret hygiene  

scaffolded an Expo/TypeScript app that boots end to end, hardened .gitignore with a live dummy-secret test, created and pushed a public GitHub remote via gh, documented the stack and branch/PR workflow, and added a tracked .env.example template.

## Shipped the first product feature (mow timer) through a full SDLC loop: feature branch, plan review with requested changes, four conventional commits, 11 unit tests, self-reviewed PR

- **Date:** July 21, 2026  
- **SE skills:** Branching, Code Review, test driven design  

I ran a plan-approval gate before implementation, caught a branch-naming convention violation against our own docs, requested an edge-case test for corrupt persisted state during review, and merged with history preserved for bisectability.

## Shipped the mow log through a plan-gated feature branch

- **Date:** July 22, 2026  
- **SE skills:** Dependency inversion, Plan Review, regression testing  
- **Artifacts:** https://github.com/ktollette/yardwork/pull/2  

eviewed and amended the implementation plan pre-code (added schema versioning), adopted react-navigation over a hand-rolled navigator with documented rationale, repository pattern isolating persistence behind interfaces, 21 unit tests, on-device regression verification before PR

## Chose merge-first over stacked PRs when a feature branch depended on an unmerged PR

- **Date:** July 22, 2026  
- **SE skills:** Branch strategy, PR dependency management  

## Started the pure derivation module in parallel while the base PR was in review

- **Date:** July 22, 2026  
- **SE skills:** Decoupling logic from integration points  

## Reviewed and squash-merged PR #3 via GitHub UI (Files changed, line comments, approve, squash + delete branch)

- **Date:** July 22, 2026  
- **SE skills:** Code review workflow  

## Test-first on deriveStats with edge cases (gate boundaries, grace-week ISO streaks, null area)

- **Date:** July 22, 2026  
- **SE skills:** Unit Testing  

## Reconciled a spec (Supabase) against actual codebase state (AsyncStorage + repo pattern) and chose interface-consistent persistence with committed migration SQL

- **Date:** August 3, 2026  
- **SE skills:** Architecture Reconciliation, Requirements Analysis  

Caught a spec-vs-implementation divergence during planning and resolved it through the repository abstraction, committing the intended schema as documentation for the future migration

## Rotated an exposed Mapbox secret token: create replacement → swap → revoke

- **Date:** August 3, 2026  
- **SE skills:** Incident Response, Secrets Management  

Rotated a credential immediately upon exposure using a zero-downtime create-swap-revoke sequence

## Promoted a spike to production code, replacing the one interaction (long-press drag) the spike flagged

- **Date:** August 3, 2026  
- **SE skills:** Risk-driven development  

Used a spike to isolate gesture-interaction risk on a native map SDK before committing to implementation, and the spike's finding directly changed the production approach

## Ran a plan-review gate that produced 3 concrete adjustments (permission-prompt deferral, rebuild sequencing, commit-type correction)

- **Date:** August 3, 2026  
- **SE skills:** Code Review  

Reviewed an implementation plan pre-code and caught a permission-UX issue, a build-sequencing inefficiency, and a commit-convention error

## Issue 2: plan review with amendments, pure-function extraction for testability, native rebuild economics, permission-matrix device verification, agent permission-gate review (intent vs. safety)

- **Date:** August 4, 2026  
- **SE skills:**   

## CI: GitHub Actions quality gate (npm ci / tsc / jest), runtime pinning, local dry-run before push, first-try green

- **Date:** August 4, 2026  
- **SE skills:**   

## branch protection: required status checks on main

- **Date:** August 4, 2026  
- **SE skills:**   

## Edit/delete mow: plan-stage code review (caught a vacuous test assertion and a silent-rounding risk before implementation), interface extension under dependency inversion, idempotent delete design, first PR through branch protection with required + strict status checks, out-of-date-branch resolution without bypass, post-merge smoke test plan (14 cases, clean)

- **Date:** August 4, 2026  
- **SE skills:**   

## Brand clearance and IP filing: trademark knockout search, ITU application pro se (Classes 9/42, ID Manual fill-in-the-blank IDs, translation statement), domain/handle land-grab, brand credential architecture (account-vs-correspondence separation).

- **Date:** August 6, 2026  
- **SE skills:**   

## Release engineering end-to-end: EAS store-signed build + submit, ASC provisioning (app record, least-privilege API key), TestFlight internal/external model, dependency audit for privacy compliance, static-site deploy pipeline (Cloudflare Pages), DNS/redirect ops (negative caching diagnosis), CLI-driven PR review/merge.

- **Date:** August 7, 2026  
- **SE skills:**   

## UI baseline: design-token refactor with review-driven amendments; nav rearchitecture (tab-first + adapter pattern for an interface mismatch); caught and ratified agent scope drift in review; diagnosed native-config drift between stale local prebuild and cloud-generated builds (CNG), scoped defect to disposable artifact.”

- **Date:** August 9, 2026  
- **SE skills:**   

## Four-PR feature session: three additive schema migrations (v3–v5) with back-compat tests; module-boundary refactor (schema registry relocated at the moment the boundary moved); plan-review catches (brand-list drift, vacuous-validation gap, commit-type misuse — feat vs refactor); smoke test escalated to requirements review, producing a pre-merge model pivot (entity references → enum values) that deleted the referential-integrity problem instead of managing it; agent staging accident caught and repaired via local amend before push.

- **Date:** August 10, 2026  
- **SE skills:**   

## Weather at mow save: first network dependency behind a service interface, fire-and-forget capture with write-queue lost-update protection, timestamp-semantics discovery redirecting the recency guard, simulator location testing exposing fallback-vs-centroid paths.

- **Date:** August 10, 2026  
- **SE skills:**   

## Activity capture: New-Arch dependency failure absorbed at the service interface (one-file swap); observability added to silent-null paths surfaced a pedometer-flush race and then a partial-flush defect in consecutive device runs; D-045 revised twice same-session on evidence; edit-during-retry interleaving proven against the real repository

- **Date:** August 11, 2026  
- **SE skills:**   

## Multi-zone: first restructuring migration (idempotent, deterministic ids), single-zone regression pin, ratified mutex scope-drift, chore folded via Closes-linking, camera spec item verified by displaced-location test after the suite couldn't cover it.

- **Date:** August 12, 2026  
- **SE skills:**   

## release blocker caught in pre-ship sim test: malformed stored element met an intolerant migrate-on-read; diagnosed by writing the failing test first, rejected the plausible-wrong fix when it couldn't explain the symptom; hardened reads + permanent chain tests from oldest supported version.

- **Date:** August 12, 2026  
- **SE skills:**   
