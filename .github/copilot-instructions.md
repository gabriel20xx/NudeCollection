# AI Coding Agent Instructions (NudeCollection Monorepo)

> Purpose: Give an AI agent just enough high–value context (architecture, workflows, conventions) to make correct, idiomatic changes quickly without rediscovering patterns. Keep this file short, specific, and living.

### Agent Decision Escalation Policy (Sept 2025 Immediate Addendum)
When the user responds with directive language such as "Proceed", "Continue", "Go ahead", or otherwise grants open-ended authorization, the agent MUST select and implement the objectively best end-to-end solution even if it requires substantial refactors, multi-file migrations, schema changes, or broad architectural consolidation. Do NOT artificially constrain scope to incremental edits when a clearly superior holistic change is evident. Criteria for "best" include: long-term maintainability, elimination of duplicated logic, alignment with existing shared abstractions (`NudeShared`), performance/scalability improvements, and reduction of future cognitive load. The agent should:
1. Expand the active TODO plan to cover all logically necessary refactors (and small adjacent fixes) uncovered while implementing the requested change.
2. Prefer replacing fragile or partially duplicated code with unified shared modules rather than patching symptoms locally.
3. Perform additive migrations (never destructive rewrites of historical migration files) to evolve data structures safely.
4. Add or extend scenario tests to cover new or refactored behavior in the same change.
5. Document any new cross-cutting conventions in this file (single edit) instead of scattering README stubs.
6. Only defer extremely large or risky follow-ons if they would exceed a single reasonable PR; list them explicitly as NEXT STEPS with rationale.

Assume authorization persists until the user explicitly narrows scope. Silence or further "Proceed" directives should trigger completion of any earlier enumerated optional improvements that remain safe and beneficial.

## 1. Monorepo Layout & Roles
```
NudeAdmin/   Admin dashboard (EJS + Express) – moderation, analytics, user + media management
NudeFlow/    Consumer / streaming style app (media browsing, viewing)
NudeForge/   Generation / creation side (workflows, model invocations, generation stats)
NudeShared/  Shared server modules (db/auth/logger/cache helpers), theme.css, client utilities, consolidated tests
NodeDocker/  Container scaffolding (entrypoints, Dockerfiles)
media/, input/, output/  Media artefact roots (served / transformed)
database/    SQLite file fallback (PostgreSQL preferred when DATABASE_URL present)
```
All three apps import from `NudeShared/server/index.js` and mount `/shared` static for unified assets.

### Node Modules Placement Policy (Sept 2025 Addendum)
Node dependency directories (`node_modules`) must exist ONLY inside the four project package roots: `NudeAdmin/`, `NudeFlow/`, `NudeForge/`, and `NudeShared/`. Do NOT create or commit a `node_modules` directory at the monorepo root or inside any other top-level folders (e.g., `media/`, `copy/`, `output/`, `NodeDocker/`). If a tooling action or mistaken install generates a rogue `node_modules` elsewhere, delete it immediately. This keeps install scope isolated, avoids accidental cross-package resolution quirks, and reduces repository bloat. Update `.gitignore` to defensively ignore unexpected `node_modules` paths outside the sanctioned four if new tooling is introduced.

### README Placement Policy (Sept 2025 Addendum)
Authoritative README files are permitted ONLY at:
1. Monorepo root (high-level overview)
2. Top-level package roots: `NudeAdmin/`, `NudeFlow/`, `NudeForge/`, `NudeShared/`

Prohibited:
- Additional README (or variant: README.txt / README.markdown / readme.md) files in nested subdirectories (e.g., inside `src/`, `server/`, `client/`, `routes/`, feature folders, or asset directories).
- Auto-generated READMEs for scripts, tests, or ephemeral tooling.

Agent / Contributor Rules:
- When documenting a new feature, extend the closest existing allowed README instead of creating a new one elsewhere.
- If detailed docs are required, create a `docs/` directory at the monorepo root with focused markdown files and link them from an allowed README (do NOT add README.md inside `docs/`).
- Remove or merge any stray README files discovered outside the sanctioned locations during unrelated changes (treat as hygiene).
- Do not create placeholder README stubs for future work—track via issues or TODO comments instead.

Rationale: Prevents documentation sprawl, reduces outdated fragments, and keeps core entry points authoritative for new contributors.

## 2. Runtime & Stack
- Pure ESM ("type": "module") across packages; use `import` only.
- Express + EJS (no React/Vue). Client interactivity = vanilla JS in templates.
- DB abstraction (`NudeShared/server/db/db.js`): chooses Postgres (pg) if available else SQLite (better-sqlite3). Always code against a minimal SQL superset supported by both.
- Migrations: `NudeShared/server/db/migrate.js` – idempotent, additive only. Add new tables/indexes there; never destructive edits in-place.

## 3. Shared Conventions
- Central styling: `NudeShared/client/theme.css` (design tokens, utilities, button variants, responsive rules). NEVER restyle core tokens inside app CSS; extend with utility classes.
- Strive to reuse existing unified utility classes before adding new ones; when a new style repeats twice, promote it to a single reusable class (keep `theme.css` lean—actively remove or consolidate obsolete utilities rather than accreting bloat).
- Tests: All new tests live under `NudeShared/test/**`. Spin up the relevant app inside the test (see existing `adminMediaEngagementCountsViews.test.mjs`). Do not add per-app test folders.
- IMPORTANT: Absolutely all automated tests (past + future) belong only under `NudeShared/test/` – never recreate `test/` folders in `NudeAdmin`, `NudeFlow`, or `NudeForge`.
- Metrics aggregation (likes/saves/views/downloads) performed server-side; return shape: `{ mediaKey: { likes, saves, views, downloads } }` – preserve field order when extending for diff-friendly output.
- Engagement endpoints expect POST with `{ keys: [] }`. Batch queries; never loop N+1 fetches from client.
- Admin UI patterns: fetch bulk data once, cache counts locally (`lastCounts`) and client-side sort without additional round-trips.
- Sorting persistence: Use `localStorage` keys prefixed with `adminMedia` or `adminUsers` (existing: `adminMediaSort`). Keep naming stable.
- Bulk actions: POST single endpoint with `{ action, ids, ...extra }` rather than multiple per-item requests.
- Overlay + live region UX: Use the shared `NudeShared/client/overlay.js` utility (`NCOverlay.createOverlayController`) instead of per-page ad-hoc implementations; tests should assert presence of required aria-live regions for new admin pages.
	- Overlay controller accessibility (Sept 2025): supports options `{ focusSelector, restoreFocus=true, escToClose=true, trapFocus=true, showDelay }`. On show it assigns `role="dialog"` and `aria-modal="true"` (if not already set), moves focus to `focusSelector` (or first focusable), traps Tab navigation within the overlay when `trapFocus` is true, restores the previously focused element on hide when `restoreFocus` is true, and closes on `Escape` when `escToClose` is enabled. A `destroy()` method removes the key listener if a page performs manual lifecycle cleanup. Extend tests to assert at least initial focus behavior for new overlays; avoid separate micro tests for each keyboard path—fold critical assertions into existing scenario files.
	- Sept 2025: NudeFlow registers an explicit fallback route `GET /shared/overlay.js` (serves `NudeShared/client/overlay.js` with `application/javascript`) before mounting the generic shared static candidates. Reason: production instance emitted a 404 + `text/html` for the overlay script, preventing the tags overlay from initializing. A focused test `flowSharedOverlayScriptServed.test.mjs` enforces: 200 status, JavaScript MIME, and presence of the `createOverlayController` symbol. If future critical shared scripts exhibit similar brittleness under the candidate mounting chain, replicate this pattern (explicit route + serving test) to harden first-paint dependencies.

### 3.1 Testing & Planning Policy (Consolidated – Sept 2025 Revision)
The project now favors a lean set of comprehensive “core smoke + scenario” tests over a large number of single‑purpose micro tests.

Guiding Principles:
1. Coverage over Count: Aim for broad behavioral coverage of critical paths (auth, routing, health/readiness, media navigation, tagging, generation workflows, admin metrics) inside a small curated suite.
2. Minimize File Sprawl: Prefer adding assertions into an existing relevant smoke/scenario test file when expanding a covered area instead of creating a brand new file.
3. Cohesive Scenarios: Each retained test file should exercise an end‑to‑end slice (e.g., “Admin metrics & tag analytics smoke”, “Flow browsing + overlay + tagging smoke”, “Forge generation & upload-copy smoke”, “Shared auth + profile + playlists smoke”, “DB & migration smoke”).
4. Additive Assertions: When a new feature is introduced, extend the nearest scenario test unless it would materially bloat or obscure intent—only then create a new scenario file.
5. Prune Redundancy: Remove superseded micro tests once equivalent or stronger assertions exist in a consolidated scenario.

Requirements:
- All automated tests remain centralized under `NudeShared/test/**` (no per-app test folders elsewhere).
- New endpoints or behaviors MUST be represented in at least one scenario/smoke test covering the happy path (and a key failure edge if critical), but NOT necessarily its own dedicated file.
- Maintain fast runtime: the full suite should remain performant (target < ~30s local run on typical dev hardware). Consolidate setup where practical.
- Planning: Still produce a concise todo list for multi-step changes (one in-progress item at a time) but avoid over-fragmenting tasks for trivial adjustments.
- Accessibility: For new dynamic UI regions (overlays, live updates) ensure at least one scenario test asserts ARIA/live region presence—can be merged into an existing UI smoke test.

Deprecations (Historical Policy Superseded):
- The strict “one test file per feature” rule is retired.
- Micro tests that only verify a single static DOM element or trivial redirect should be merged or removed once their logic is covered by a broader scenario.

Migration Path (In Progress):
- Legacy focused tests will be incrementally removed after equivalent assertions land in consolidated scenario files. Until removal, duplication is acceptable but scheduled for pruning.

Documentation & Updates:
- When consolidating tests, update this file if the categorization of scenario files changes (e.g., adding a new core scenario domain).
- Clearly comment scenario test sections to keep them navigable despite broader scope.

Exceptions:
- Highly sensitive logic (security/auth edge cases, data migrations with destructive potential) may still justify a dedicated narrow test file if embedding would materially complicate a scenario test.

Outcome Goal: A smaller, faster, still trustworthy test suite that reduces maintenance overhead and cognitive load while retaining confidence in core system behavior.

#### 3.1.1 Canonical Scenario / Smoke Test Set (Post-Pruning Snapshot)
Retained high-value scenario + smoke files (representative slices):
- `NudeShared/test/smoke/coreSmoke.test.mjs` – Flow core (health, overlay presence, playlists auth guard, legacy redirects, anonymous like UI affordance).
- `NudeShared/test/smoke/adminForgeSmoke.test.mjs` – Admin & Forge baseline availability (health + minimal auth gate / dashboard reachability).
- Generation & Upload: `forgeGenerationRoutes.test.mjs`, `forgeUploadCopy.test.mjs`, `forgeUploadCopySelection.test.mjs` (critical generation + immediate copy workflow contracts).
- Tag System: `flowMediaTagAdd.test.mjs`, `flowMediaTagVote.test.mjs`, plus admin tag analytics (cooccurrence, coverage, recency, suggestions, typo candidates) tests.
- Admin Metrics & Media Actions: `adminMediaEngagementCounts*.test.mjs`, `adminMediaActions*.test.mjs`, `adminStats*.test.mjs`, taxonomy / category soft-null & audit tests.
- Auth/Profile: `auth.test.mjs`, `authLoginEdgeCases.test.mjs`, `profile/*.test.mjs`, `shared/profileAnonymous.test.mjs` (shared anonymous contract), `shared/sharedLogoutRedirect.test.mjs`.
- Playlists: `playlists.test.mjs`, `playlistEdges.test.mjs`, `playlistReorderInvalid.test.mjs`.
- Thumbnails & Caching: `sharedThumbnailsUnified.test.mjs`, `sharedThumbnailDedup.test.mjs`, Forge caching matrix/etag tests.
- Infrastructure / Reliability: `db.test.mjs`, `httpHelpers.test.mjs`, `backpressure.test.mjs`, `logger.test.mjs`.

Removed micro tests (now superseded by the above):
- Flow overlay/button/script-order duplicates: `flowHomeTagsOverlayStructure`, `flowHomeTagsOverlayScriptsOrder`, `flowHomeHasTagsOverlayButton`, `flowTagsOverlayButton`, `flowTagsOverlayOpens`, `flowSharedOverlayScriptServed`.
- Flow playlists unauth variants & floating controls absence: `flowPlaylistsUnauthLoginButton`, `flowPlaylistsUnauthSingleLoginButton`, `flowPlaylistsUnauthCentered`, `flowPlaylistsNoFloatingControls`.
- Flow legacy route & minor UI: `flowCategoriesRedirect`, `flowHomeAnonymousLikeFallback`, `flowOverlayButtonsOffset`, `flowHomeTimerPanelToggle` (structural UI elements now indirectly validated in core smoke + retained feature tests).
- Forge static/style/theme/thumbnail fine-grained checks: `forgeStyleCss`, `forgeThemeCss`, `forgeThumbnailFallback`, `forgeThumbsEphemeral`, `forgeThumbsMissing`, `forgeProgressUI` (core generation + caching + unified thumbnail tests cover functionality risk surface).

Coverage Mapping (Deleted → Replaced by):
- Overlay structure/button/script order → Assertions inside `coreSmoke.test.mjs` (single holistic overlay presence & script inclusion) and retained `flowHomeTagUi.test.mjs` for dynamic tag UI.
- Playlists unauth guard/button variants → Single guard assertion consolidated in `coreSmoke.test.mjs`; playlist functionality in `playlists.test.mjs` & edges file.
- Categories redirect → Covered by consolidated redirect assertion in `coreSmoke.test.mjs` (legacy removal regression signal maintained).
- Anonymous like fallback & floating controls persistence → Basic like button presence + fullscreen persistence retained in `flowFullscreenControlsPersist.test.mjs`.
- Forge style/theme assets → Basic app health + generation route tests; issues with CSS serving would surface via layout-dependent tag scripts or failing generation pages in `forgeGenerationRoutes.test.mjs`.
- Forge thumbnail edge permutations → Unified thumbnail behavior & dedup: `sharedThumbnailsUnified.test.mjs`, `sharedThumbnailDedup.test.mjs`; fallback logic implicitly exercised via generation / shared flows. (If future regressions arise, reintroduce a single focused fallback scenario test.)

Rationale Notes:
- Preference for eliminating multiple DOM shape/style assertions when a single presence + happy-path interaction suffices to detect regressions that would materially impact users.
- Thumbnail & asset serving failures typically cascade into generation failures (already covered), reducing need for independent micro probes.
- Removed tests were pure structural duplicates offering low incremental fault detection value relative to maintenance and runtime cost.

Future Additions Policy:
- New feature → extend nearest scenario test; only create a new file if combined scope would materially obscure intent or push runtime significantly (>10%).
- Before adding a new test file, confirm similar assertions are not already achievable with a few lines inside an existing scenario.
- If a deleted area (e.g., thumbnail fallback specifics) exhibits a regression not caught by current suite, reintroduce ONE lean scenario covering the functional output rather than multiple stylistic/assertion variants.

Feature Removal / Deprecation Policy:
- Temporary Test Artifacts Policy:
- Any test that creates temporary files or directories (e.g., generated images, copied uploads, mkdtemp folders, simulated thumbnails) MUST remove them before the test finishes. Prefer using a shared helper that tracks created paths and performs cleanup in a `finally` block.
- Do not rely solely on global post-run cleanup for correctness; per-test cleanup keeps the workspace lean and prevents accidental persistence when a single test is run in isolation.
- If a test intentionally leaves an artefact for a later test, refactor instead to seed via a helper or fixture; cross-test filesystem coupling is prohibited.
- Add new temp directories to `NudeShared/scripts/clean-test-artifacts.mjs` only if they represent systematic multi-test artefacts; single-test scratch paths should be ephemeral and self-deleting.
- ALL temporary files a test creates (including those placed inside existing shared directories like `copy/`, `output/`, `input/`, `media/`, or any `NudeShared/tmp-*` / mkdtemp path) MUST be explicitly cleaned up by that test before it ends; do NOT depend on post-suite or global cleanup to remove them.
- When a feature (endpoint, route, UI element, workflow, schema field) is removed or formally deprecated (and no longer user‑reachable), purge ALL associated tests in the same change set. Do not leave disabled, skipped, or legacy-named test files lingering—delete them outright.
- Update the canonical scenario list above (and any coverage mapping) in the same commit so future contributors do not resurrect removed tests.
- Remove ONLY the tests whose purpose was to validate the removed behavior; retain tests that still exercise shared infrastructure (e.g., auth, migration, generic helpers) even if they previously touched the feature.
- If a feature is in a staged deprecation (soft-disabled behind a flag) keep one minimal test validating the flagged fallback path until the final removal commit; at final removal, delete that test.
- Never comment out assertions—deletion + documentation update is the required path to avoid suite drift and false confidence.

Audit Trail:
- This section should be updated whenever a pruning wave completes or new canonical scenario file is introduced to keep contributors aligned and avoid accidental reintroduction of micro tests.

Residual Artifact Reporting (Post-Suite):
- The `globalPostCleanup.mjs` script now emits a JSON object including `residual` arrays for `output/`, `input/`, and `copy/` directory contents after the suite.
- Treat unexpected persistent files in these arrays as a signal that a test failed to perform per-test cleanup; fix the offending test rather than extending global deletion logic.
- If a fixture must persist (rare), commit it explicitly to the repository (so it appears in baseline snapshots) and document its purpose inline in the corresponding test.

## 4. Logging & Observability
- Use `Logger.info('DOMAIN', 'Message', meta)` – domain tokens ALL CAPS (e.g., `MEDIA`, `AUTH`, `MIGRATE`).
- Cache policy introspection endpoint: `/__cache-policy` registered per app via shared helper. Respect optional `REQUIRE_CACHE_POLICY_AUTH` gate.
- Prefer adding lightweight, domain-scoped log lines over verbose generic traces.
- Client: log each meaningful UI action (bulk apply, sort change, media toggle, user update) via `console.info('[ACTION]', details)` or the shared `clientLogger` wrapper—avoid silent state changes (helps test triage).
- Server: emit a single structured log per high-level action (bulk media action, user role change, generation event) using the shared `Logger` domains.
- Never introduce a parallel notification system—always use the shared toast/notification utilities in `NudeShared/client`.
- Health & Readiness (Sept 2025 Hardening): `applyStandardAppHardening` now injects `/healthz` (lightweight liveness) and `/ready` (DB connectivity + migration heuristic) unless already defined. A legacy `/health` path is aliased (302 redirect) to `/healthz` automatically when not present so external monitors may update gradually. Readiness performs a `SELECT 1` and checks for presence of a canonical table (`users`) to decide whether migrations should run (best‑effort + idempotent). If the check or migrations fail it returns 503. Existing app‑local `/health` JSON routes may be simplified/removed after dashboards switch to `/healthz`. Tests allow `[200,503]` for `/ready` to avoid flakiness during transient DB init errors but expect 200 under normal conditions.
 - Session Factory (Oct 2025): Use `createStandardSessionMiddleware` from `NudeShared/server/middleware/sessionFactory.js` in all apps instead of bespoke `express-session` setup. It:
	 - Auto-selects Postgres store (connect-pg-simple) when `DATABASE_URL` present, else memory.
	 - Provides an in-memory fallback if `express-session` isn't installed (tests / slim envs) with a single WARN (non-prod).
	 - Standardizes cookie attributes: `httpOnly`, `sameSite=lax`, 7‑day `maxAge` (override via `maxAgeMs`).
	 - Supports dynamic `secure` upgrade when request is HTTPS (leave `secureOverride` undefined) or forced secure with `secureOverride:true`.
	 - Accepts options: `{ serviceName, secret, cookieName, domain, maxAgeMs, enablePgStore, secureOverride }`.
	 - MUST be mounted after body parsers if route handlers rely on parsed bodies for auth flows (current auth routes expect JSON body so ensure `express.json()` precedes or rely on delayed auth mounting when using `applySharedBase` with `mountAuth:false`).
	 - Replaces previous ad-hoc session initialization blocks in `NudeAdmin/src/app.js`, `NudeFlow/src/app.js`, and `NudeForge/src/app.js` (do not reintroduce inline session config). New services must adopt this factory.
	 - Test: `sessionCookieConsistency.test.mjs` enforces cross-app cookie alignment—extend if adding attributes.

## 5. Adding Schema / Data Features
1. Extend `migrate.js` with new table (CREATE TABLE IF NOT EXISTS ...). Include minimal indexes.
2. Reflect usage in feature-specific route file (`NudeShared/server/api/*Routes.js` or app-local route).
3. Add aggregation to existing multi-metric endpoints if logically grouped (e.g., extend engagement counts rather than adding a sibling endpoint).
4. Add a focused test seeding minimal rows + asserting new field presence.

### 5.1 Categories → Tags Migration (Phased Plan)
- Legacy single `category` column on `media` retained (read-only) purely for backward compatibility.
- `media_tags(media_id, tag, created_at, UNIQUE(media_id, tag))` enables multi-tag classification.
- Bulk actions: `add_tags`, `remove_tags`, `replace_tags` (input normalized: lowercase, trimmed, deduped, max 40 chars).
- Listing endpoint (`/api/admin/media`) returns `tags: []`; query params: `tag` (comma/space separated ANY-match by default) and optional `tagMode=all` for intersection filtering.
- UI: Tag pills with inline remove; per-row add & replace; bulk input re-used for tag actions; accessible overlay + live region integrated.
- Backfill: Migration inserts lowercase copy of any non-empty legacy `category` into `media_tags` if absent (idempotent, safe on repeat runs).
- Legacy route support: `/admin/media` now 302 redirects to `/media` (tests & old links).
- Flow legacy categories UI fully removed: `/categories` now returns a 301 redirect to `/` (home) and dynamic `/:categoryName` handler deleted. Client now relies purely on tag-based filtering mechanisms.
- Deprecation phases:
	1. (Done) Add `media_tags` + backfill + UI/API parity.
	2. (Current) Monitor usage; forbid new writes to `category` outside migrations (avoid adding set_category actions beyond legacy necessity).
	3. (Implemented – guarded) Soft-null migration behind `ENABLE_SOFT_NULL_CATEGORY=1` env flag: re-runs safe backfill, archives distinct legacy categories to `media_legacy_category_backup`, then NULLs `media.category` values.
	4. (Future major) Remove `category` column via new additive migration (never rewrite historical migration blocks). Provide temporary view or backup table for audit.
- Removal Preconditions: Zero search hits / telemetry for `media.category` in external consumers; tag tests stable; no API responses rely on `category`.
 - Operational Note: To exercise Phase 3 in tests or staging, set `ENABLE_SOFT_NULL_CATEGORY=1` before migrations run. Leave unset in production until external dependency audit is complete.

#### New Supporting Tooling & Endpoints
- Audit endpoint: `GET /api/admin/schema/category-usage` → `{ remaining, top: [{ category, count }] }` (top limited to 10). Used to verify soft-null effectiveness & readiness for column removal.
- Tag suggestions endpoint: `GET /api/admin/media/tags/suggestions?limit=20` → frequency ranked `{ tags:[{ tag, uses }] }` (default 20, max 200). Client uses for autocomplete / quick add UI.
- Tag mode toggle: Admin media page now persists ANY vs ALL tag intersection filtering in `localStorage` key `adminMediaTagMode`. Query param `tagMode=all` triggers intersection; absent or `any` is default.
- Simulation script: `node NudeShared/scripts/simulate-category-removal.mjs` emits single-line JSON summary `{ preRemaining, postSoftNullRemaining, tagSample:[...], ok, notes, error }` to validate readiness & surface anomalies without destructive changes. Tests parse this directly.
- Tag co-occurrence endpoint: `GET /api/admin/media/tags/cooccurrence?limit=50` → `{ pairs:[{ a, b, count, jaccard, lift }], cached? }` pairs sorted by descending count then alphabetical tie-breaker. Supports exploratory analytics for taxonomy cleanup. Supports `?nocache=1` bypass (otherwise 60s in-memory TTL cache).
- Tag coverage endpoint: `GET /api/admin/media/tags/coverage?min=1&limit=2000&full=0` → `{ total, withMin, percent, distribution:[{ tagCount, items }], topUntaggedSample:[...], min, limit, full }` summarizing tagging completeness. `limit` defaults 2000 (max 10000). `full=1` disables limit (use sparingly).
- Tag typo candidates endpoint: `GET /api/admin/media/tags/typo-candidates?distance=2&max=50&minUses=1` → `{ groups:[{ normalized, variants:[{ tag, uses }], size }] }` using Levenshtein distance (<=3 clamp). Helps surface near-duplicate tags for normalization.
- Tag recency endpoint: `GET /api/admin/media/tags/recency?limit=50` → `{ tags:[{ tag, uses, firstUsed, lastUsed, spanDays, ageDays }] }` ordered by recent usage.
- Public tag suggestions endpoint (Flow): `GET /api/tags/suggestions?limit=50` (default 50, max 200) → `{ tags:[{ tag, uses }], cached? }`. Read-only for user-facing discovery; 60s in-process cache; unauthenticated access permitted. Client (Flow `tags.js` + home overlay) now consumes this instead of admin-only endpoint.
- Taxonomy report script: `node NudeShared/scripts/taxonomy-report.mjs --json` → consolidated JSON: `{ remainingCategories, topTags[], pairCardinality, coverage{...} }` (uses same 2000 media coverage sample).
- Endpoint caching: suggestions & cooccurrence endpoints cached in-process for 60s unless `?nocache=1` specified. Response includes `cached:true` on cache hits.

#### 5.1.1 Tags Overlay UX Hardening (Sept 2025)
- Consolidated Flow home tags overlay logic: `home-tags-overlay.js` exclusively manages opening + loading using the shared `NCOverlay` controller. Duplicate inline overlay implementations inside `loading.js` were removed to prevent race conditions.
- Overlay now remains open for browsing (previous auto-hide after `runWithOverlay` completion caused flicker). Implementation uses `controller.showSoon()` followed by manual fetch + DOM population; hide only occurs via explicit close button.
- Tests (`flowTagsOverlayOpens.test.mjs`) poll up to 1.5s for `overlay.hidden === false` and `.active` class to accommodate show delay + network.
- When Flow media directory is empty during tests, synthetic media elements are injected (test-side) to deterministically exercise navigation (`flowSecondMediaVisible.test.mjs`). This avoids flakiness from random media endpoints in an empty library while leaving runtime behavior unchanged in production.


### 5.2 User-Facing Tag Contributions & Voting (NudeFlow)
- Schema additions (additive, idempotent):
	- `media_tags.contributor_user_id` (nullable legacy attribution for who first added the tag on a media item).
	- `media_tag_votes(media_id, tag, user_id, direction, created_at)` where `direction` ∈ {-1,1}; setting direction=0 via endpoint removes the vote (DELETE).
- Shared helpers: `NudeShared/server/tags/tagHelpers.js` exports:
	- `normalizeTag(raw)` → lowercase, trimmed, single-spaced, max length 40.
	- `addTagToMedia(mediaKey, tag, userId)` idempotent insert with attribution.
	- `applyTagVote(mediaKey, tag, userId, direction)` upsert / delete for direction 0.
	- `getMediaTagsWithScores(mediaKey, userId)` → aggregated `[{ tag, score, myVote, contributorUserId }]` (score = sum of vote directions).
- Flow API endpoints (auth required for mutating):
	- `GET /api/media/:mediaKey/tags` → `{ ok, tags:[...] }` (myVote = -1|0|1).
	- `POST /api/media/:mediaKey/tags` body `{ tag }` adds normalized tag (idempotent) → returns refreshed list.
	- `POST /api/media/:mediaKey/tags/:tag/vote` body `{ direction }` where direction -1,0,1; 0 removes vote → refreshed list.
- UI: `NudeFlow` `home.ejs` includes minimal tag list + add field + vote buttons (▲/▼). Future enhancements should integrate with currently displayed media key more robustly (placeholder inference now).
- Tests: `flowMediaTagAdd.test.mjs` (attribution) and `flowMediaTagVote.test.mjs` (score transitions) under `NudeShared/test/flow/` follow one-test-per-file rule.
- Future hardening (not yet implemented): rate limiting (per-user tag adds per media), moderation queue for flagged tags, spam detection (rapid toggling), and abuse monitoring metrics.


When modifying any of the above, keep response shapes append-only and update this file + a focused test under `NudeShared/test/admin/`.

## 6. Tests – Patterns to Follow
- Use `ensureTestDb()` + `startEphemeral(app)` utilities.
- Derive a unique media key using timestamp + Math.random to avoid unique constraint collisions.
- Query first admin user id rather than assuming `1` (see existing test pattern) but keep fallback.
- Seed counts (views/likes/saves/downloads) directly via SQL inserts, then hit the public endpoint.
- Keep each test single-purpose; no broad integration megatests.

## 7. Frontend Template Patterns
- Light JS IIFEs inside `.ejs` manage state; no build step.
 - Floating media controls (likes, playlists, tags, mute, timer, fullscreen) are instantiated ONLY on feed pages (presence of `#home-container`). They now persist across fullscreen enter/exit events; tests assert `.floating-controls` remains in DOM after simulated `fullscreenchange`.
	- Fullscreen persistence: global `fullscreenchange` (with vendor-prefixed fallbacks) listeners re-sync icon state and forcibly keep `.floating-controls` visible after entering or exiting fullscreen. Pattern lives in `loading.js` and should be reused if future fullscreen-targeted containers are introduced.
- Escape dynamic strings with `escapeHtml` helper; never interpolate unescaped user input.
- Reuse utility classes (`.toolbar`, `.grid-auto-200`, `.full-width`, `.btn-ghost`, `.badge`). Avoid inline styles except for transient dynamic widths (prefer adding a utility if reused twice).
- Responsive adjustments live in `theme.css`. If you add new breakpoints for a component, co-locate them near existing responsive blocks (search for `@media (max-width:`).
- Minimize `theme.css` footprint: prefer composing existing utilities (e.g., flex, spacing, badge patterns) instead of introducing near-duplicate declarations; if refactoring, replace multiple bespoke inline styles with one shared class, then delete redundant rules.
- Always prefer an existing utility or pattern from `theme.css` before adding new CSS. If a new utility is required, add it once to `theme.css` (not per-app) and reference it everywhere.
- Authentication UI + logic (routes, session handling, auth modal, password toggle, theme toggling) are centralized in `NudeShared` – do not fork per app; extend via hooks or minor conditional logic only.

## 8. Adding a New Metric (Example Flow)
1. Migration: add table `media_newmetric (..., media_key, user_id, created_at)` + indexes.
2. Update engagement SQL block in `adminMediaRoutes.js` adding a `newmetricSql` parallel to others.
3. Merge into counts map (`out[k] = { likes, saves, views, downloads, newMetric }`). Maintain backward compatibility (UI should default 0 when absent).
4. UI: Add badge in `media.ejs` meta grid. Use consistent ordering; update responsive column rules if count of columns changes.
5. Test: Clone downloads test, seed events in new table, assert field.

## 9. Manual Refresh & Auto Refresh
- Buttons with class `.btn-refresh` add spinning animation via `.spinning` toggle; do NOT introduce separate interval timers—re-use existing `load()` or `loadStats()`.
- Auto-refresh: Dashboard uses a 10s loop gated by checkbox state; replicate pattern if adding new live views.

## 10. Error Handling & UX
- On fetch failure, replace target container HTML with `<div class="error">...</div>`; keep consistent for test scraping.
- Toasts: Use `toast.success/info/error` (provided by shared `toast.js`); never reinvent notification UI.
- All future notifications (toasts, ephemeral banners) must route through the shared NudeShared notification scripts—do not inline custom popups.

## 11. Docker / Environment Assumptions
- Entry scripts copy or mount `NudeShared` into each app container (`NUDESHARED_DIR`). Depend on that layout; don’t hardcode absolute host paths.
- Prefer environment flags to conditional logic (e.g., `ENABLE_REAL_SHARP`, `REQUIRE_CACHE_POLICY_AUTH`). When introducing new toggles, document them in the app README + (optionally) here if cross-cutting.

## 12. Safe Change Checklist (Before PR)
- Added table/index? => `migrate.js` updated idempotently.
- New endpoint? Add minimal test under `NudeShared/test/`.
- UI metric change? Media/users templates updated + responsive rules considered.
- Shared token or utility? Modify `theme.css` only (avoid per-app overrides).
- Breaking response shape? Provide fallback defaults in consumer templates.

## 13. Common Pitfalls (Avoid)
- Reintroducing per-app `test/` folders (causes drift) – always centralize.
- Inline CSS duplication instead of adding reusable utility class.
- N+1 queries for per-item media metrics (always batch with `IN (...)`).
- Forgetting to persist sort/filter preferences when adding new sort fields.
- Hardcoding user id = 1 in tests without fallback path.

## 14. Fast Reference Snippets
Engagement counts fetch (client):
```js
const { counts } = await api('/api/admin/media/engagement-counts', { method:'POST', body: JSON.stringify({ keys }) });
```
Seed metric (test):
```js
await query('INSERT INTO media_downloads (media_key, user_id, created_at) VALUES ($1,$2,$3)', [mediaKey, adminId, now]);
```

Immediate media copy on selection (distinct from explicit upload button flow):
```js
// When a media item is selected by the user (e.g., checkbox or selection UI)
// trigger an immediate POST that uploads/copies the file server-side into /copy
// (different from deferring until an Upload/Confirm button is pressed).
// Pattern: fire-and-forget fetch with FormData or key list; server handles copy pipe.
// Endpoint (Forge): POST /api/upload-copy multipart/form-data field name 'image'
// Success: 200 { success:true, filename } (UUID-prefixed) stored under configured copy dir.
// Failure (no file): 400 { success:false, error }
```

Key Principle Recap:
- Tests centralized in `NudeShared/test/` only.
- Styling/layout should reuse `theme.css` tokens & utilities (no per-app divergence).
- Auth logic + design lives in `NudeShared` – never reimplement locally.
- Selecting media triggers an immediate server copy into `copy/` (do not wait for a later bulk upload action).
- Classification now tag-based (multi). Use bulk tag actions; avoid reintroducing single-category assumptions in new code.
	- Plan for future removal of `category` column after external dependency audit (additive migration path documented; create follow-up migration instead of altering existing one).
- Consolidated scenario test approach replaces former one-test-per-file rule.
- Unified logout behavior: The shared auth modal now always `window.location.replace('/')` after a successful logout (or detected stale session). Each app's root path handles its own canonical redirect (Admin `/` -> `/dashboard`, Forge `/` -> `/generator`). Do not implement per-app logout redirects; rely on root redirection for consistency.
- Profile hardening: Shared `profile.ejs` script must guard JSON parsing (handle HTML/error responses) and null DOM elements when unauthenticated across all apps (Admin, Flow, Forge). At least one scenario test must assert anonymous payload for unauthenticated `/api/profile` access.
- After every newly implemented feature, bug fix, or code improvement: create a commit and push (small, frequent commits). Do not batch unrelated changes; keep diffs reviewable.
- Post-test cleanup: optional `NudeShared/test/globalPostCleanup.mjs` script removes stray mkdtemp temp directories (e.g., `nudeadmin-out-*`, `tmp-shared-test-*`). Run after the unified test suite if temp dirs accumulate.

## 15. Agent Execution Mandate (Aug 2025 Addendum)
- Always fully implement every user-requested feature, fix, or improvement end-to-end in a single cohesive effort once direction is clear—include optional or "nice to have" follow-up enhancements enumerated by the user without asking for re-confirmation.
- Implementation-First Rule: When a new request arrives, implement (or modify) all requested features, fixes, and changes fully before executing the test suite. Only after code changes are in place should automated tests be run; avoid running tests on an unchanged codebase just after receiving a new feature/fix request.
- Produce a comprehensive, task-scoped todo list at the start of each multi-step request and keep it current (exactly one in-progress item at a time) until all items are completed.
- Do not defer obvious adjacent low-risk improvements (tests, minimal docs, logging, accessibility hooks); implement them proactively with the primary change.
- If ambiguity is encountered, make one clearly-reasoned assumption (document it inline as a `TODO:` comment) and proceed—do not stall waiting for clarification if the assumption is low risk.
- Every code mutation that changes runtime behavior must be paired with at least one focused test under `NudeShared/test/**` (one file per behavior) and any necessary README / instructions updates.
- Never leave partial scaffolds (unused routes, dead CSS, unreferenced helpers); remove or finish them in the same change.
- Always proceed automatically to the next logical required step (implementation, tests, docs, quality gates) without waiting for additional user prompts once a task scope is understood; only pause for clarification when a blocking ambiguity would risk an incorrect irreversible change.

### 15.1 Proceed / Continue Shortcut
If the user replies with only "Proceed" or "Continue" (case-insensitive) and there are no remaining active or in-progress todos for the current task scope, you MUST:
1. Interpret this as explicit authorization to execute all previously suggested optional or follow-up improvements that were deferred (documentation touch-ups, minor accessibility tweaks, small test additions, low-risk refactors) within reasonable scope.
2. Generate / refresh a todo list for those follow-ups and carry them out automatically (plan -> implement -> test -> summarize), unless a follow-up would be materially risky or ambiguous—skip those and note them.
3. Clearly mark in the summary which follow-ups were executed versus skipped (with concise justification).
4. Re-run relevant tests before finalizing.

This shortcut reduces round-trips—never wait for another confirmation after such a trigger unless safety requires clarification.

## 16. Post-Test Artifact Cleanup
After running the unified test suite, ephemeral artifacts should be cleared to keep the repository state lean and avoid flakiness from leftover files.

Cleanup Scope:
- Directories: `database/` (leave file container but remove test-created db files except committed templates), `input/`, `output/`, `copy/` – remove all contents.
- Transient fallback / temp dirs: any `NudeShared/tmp-fallback-*` directories are removed entirely.

Script:
`node NudeShared/scripts/clean-test-artifacts.mjs` outputs a JSON summary: `{ ok, cleaned:[{ dir, removed|skipped }], fallbackRemoved }`.

Usage Notes:
- Safe to run multiple times (idempotent). Missing directories are recreated before cleaning.
- Never commit large binary artifacts created by tests; ensure cleanup precedes committing.
- If adding new ephemeral directories in future features, extend the script & this section simultaneously.

Policy:
- CI must invoke the cleanup script after tests (post step) to guarantee a clean workspace for subsequent jobs.
- Local developers should run it before switching branches to prevent incidental merges of large artifacts.

Future Enhancement TODO: Consider adding an optional `--dry-run` flag and a `CLEAN_EXTRA="dir1,dir2"` env expansion.

---
Questions or ambiguity: leave TODO comment near change + add a focused test; prioritize observable behavior over speculative abstractions.

## 17. Lean Change & Duplication Avoidance Policy (Less Is More)
To keep the monorepo sustainable and reviewable, every change should favor the smallest, clearest delta that achieves the behavior goal while maximizing reuse.

Core Principles:
- Less Code, More Leverage: Before writing new logic, SEARCH for an existing helper, route, utility class, or pattern (e.g., overlay controller, toast, tag helpers, media service). Extend or adapt instead of re-implementing.
- Single Source of Truth: If similar logic appears in multiple places, consolidate it into `NudeShared` (server or client) or an existing module. Never fork near-identical copies across apps.
- Prefer Extension Over Parallelism: Add fields/branches to existing endpoints, migrations, or UI components rather than creating parallel endpoints/components that drift.
- Avoid Feature Interference: When fixing or adding a feature, inspect for legacy or duplicate code paths that may conflict (example: removed duplicate tags overlay logic in `loading.js` in favor of `home-tags-overlay.js`). Eliminate or unify overlapping implementations during the same change.
- Minimal Surface Area: Do not introduce new environment variables, routes, or utilities unless clearly necessary. If added, document them immediately in this file + targeted README and add a focused test.
- Test What You Touch: Each behavioral change gets a focused test proving the reused pathway still works (no silent regressions when consolidating code).
- Refactor Opportunistically (Scoped): When you must touch an area, you may do a small, low-risk consolidation (e.g., extracting a repeated block) but avoid broad refactors unrelated to the task.
- No Dead Stubs: Don’t leave unused helpers or placeholders. Either finish the abstraction or remove it before concluding the task.
- Explicit Over Implicit: If you must diverge from an existing pattern temporarily, add an inline TODO with rationale + planned consolidation path.

Checklist Before Adding New Code:
1. Did I search for an existing utility / function that already solves 70%+ of this? (If yes, extend; if no, justify.)
2. Can this be an option/flag/parameter on an existing module instead of a new module/file?
3. Am I removing or deactivating any now-obsolete duplicate after introducing the improved shared logic?
4. Did I run tests (or add new ones) that would fail if the duplication reappears or the consolidation regresses?
5. Is documentation (this file + any affected README) updated in the same change?

Red Flags (Investigate Before Proceeding):
- “Copied X and tweaked” in commit message or code comments.
- Multiple near-identical SQL blocks differing only by one column—prefer parameterization or unified aggregation.
- Re-implementing overlay / toast / logging / tag normalization logic locally.
- Adding a new endpoint that returns a superset of an existing one without deprecating or extending the original.

Outcome Goal: Over time the codebase trends toward higher cohesion and lower duplication; each new feature increases shared leverage rather than surface area.

### Sept 2025 Addendum: Debounce Utility & Overlay Test Pruning
Added shared `debounce` helper at `NudeShared/client/debounce.js` (supports `leading`, `trailing`, `maxWait`, with `cancel/flush/pending`). Corresponding test lives under `NudeShared/test/util/debounce.test.mjs`. Prefer this utility for client-side rate limiting (e.g., search inputs, resize handlers) instead of ad‑hoc inline timer logic.

Pruned multiple narrow Flow overlay micro tests (script order, button presence, structure, toggle) once equivalent behavioral coverage landed inside consolidated smoke / scenario tests. Future overlay-related assertions should extend an existing scenario (e.g., `coreSmoke` or Flow overlay/tag tests) rather than introducing new micro files. When adding overlay-dependent features, assert only critical accessibility/interaction (presence of trigger, dialog role, focus handling) – avoid duplicating static DOM shape checks already covered.

Rationale: Reduce maintenance and runtime while retaining regression signal strength for overlay availability, accessibility semantics, and script serving order. Use this section as precedent for pruning further micro tests after consolidation work: document the removal + new coverage location in the same commit.

### Sept 2025 Addendum (Lint Standardization & Permanent Micro Test Pruning)
Lint Scripts Standardization:
- All four packages expose a uniform lint command: `npm run lint` executes `eslint . --ext .js[, .mjs]` (tests included implicitly where colocated) and a matching `lint:fix` variant.
- `NudeShared` provides an orchestrator script `scripts/lint-all.mjs` invoked via `npm run lint:all` inside `NudeShared` to sequentially lint `NudeShared`, `NudeAdmin`, `NudeFlow`, and `NudeForge` with clear section headers and an aggregated non-zero exit code on any failure. CI should prefer this single entry point over per-package loops.

Permanent Micro Test Pruning:
- All previously skipped Flow micro test placeholders (overlay/button/script-order/playlist/redirect/legacy UI variants) have now been fully deleted after consolidation proved stable across multiple full-suite runs.
- Baseline: No intentionally skipped legacy micro tests remain; any new `describe.skip` must be temporary and documented inline with a removal plan.
- Coverage for removed areas resides in consolidated scenario + smoke tests (see canonical set above). Do NOT reintroduce stand-alone micro tests for those concerns—extend existing scenario files instead.

New Tooling & Performance Optimizations:
- Migration Guard: `ensureDatabaseReady` (in `server/db/db.js`) sets a single-process `__migrationsDone` flag to prevent redundant migration execution across many ephemeral server startups (notably reducing test setup overhead).
- Server Reuse Helper: `NudeShared/test/util/serverReuse.js` offers `getTestApp(kind)` and `closeAllTestApps()` for read-only tests that can share an app instance. Prefer this only when tests do not mutate DB state in ways that would create order coupling.
- Quick Subset Script: `npm run test:quick` (in `NudeShared`) executes a curated fast subset (auth/health/core) for rapid iteration (<~5s target).
- Timing Script: `npm run test:timing` uses a JSON reporter to summarize counts & durations, forming the basis for future performance regression tracking.

Repository Hygiene:
- Ignore patterns include ephemeral audit usage SQLite artifacts (`NudeShared/database/audit_usage_*.db|*.sqlite`). Scripts generating audit snapshots must respect this naming.

CI Integration Recommendation:
1. `npm --prefix NudeShared run lint:all`
2. `npm --prefix NudeShared test` (full suite)
3. `node NudeShared/scripts/clean-test-artifacts.mjs`
4. Optional: `npm --prefix NudeShared run test:timing` to record duration metrics.

Future Improvements (Optional):
- Consider adding a `--parallel` flag to `lint-all.mjs` if runtime becomes a bottleneck; sequential output remains clearer for now.
- Potential `report.json` mode aggregating ESLint JSON from each package for CI analytics.
- Extend timing script to attribute time to setup vs test execution per file for finer-grained regression detection.
