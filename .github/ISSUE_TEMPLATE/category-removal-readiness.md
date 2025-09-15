---
name: Category Column Removal Readiness
about: Checklist to validate system is ready to fully drop legacy media.category column
labels: schema, cleanup, deprecation
---

# Category Column Removal Readiness Checklist

Use this issue to track final verification steps before creating the additive migration that removes the legacy `media.category` column.

## Preconditions
- [ ] All environments migrated to tag-based classification (no new code paths write to `media.category`).
- [ ] No external integrations (exporters, pipelines, BI tools) rely on `media.category` (verified via logs / telemetry / search).
- [ ] Admin UI fully tag-driven (filtering, suggestions, bulk actions) – no category inputs present.
- [ ] Bulk media actions do not include any `set_category` or equivalent legacy operations.
- [ ] `media_tags` coverage: 100% (or documented acceptable minority) of active media have ≥1 tag.
- [ ] Backfill path validated repeatedly with idempotent runs (no duplicate tag rows introduced).

## Observability & Audit
- [ ] `/api/admin/schema/category-usage` returns `remaining = 0` in production-like environment.
- [ ] Distinct legacy categories archived into `media_legacy_category_backup` (soft-null phase executed with `ENABLE_SOFT_NULL_CATEGORY=1`).
- [ ] Tag frequency distribution reviewed (no pathological single-tag dominance unless business-justified).

## Simulation Script
Run the simulation script from `NudeShared`:

```
node NudeShared/scripts/simulate-category-removal.mjs
```

- [ ] Script completes with `ok: true`.
- [ ] `preRemaining` equals `postSoftNullRemaining` OR both are `0` (if already soft-nulled) – document result.
- [ ] `tagSample` non-empty (or acceptable rationale if empty in a minimal staging environment).
- [ ] Output JSON captured and attached to this issue.

## Risk Assessment
- [ ] Confirm no tests assert on `media.category` presence (grep codebase & test suite).
- [ ] Confirm no migrations depend on `media.category` aside from legacy backfill + soft-null blocks.
- [ ] Rollback strategy defined (e.g., retain backup table + git reversion, not destructive rewrite).

## Migration Plan (Additive Forward-Only)
- [ ] New migration file drafted (DO NOT edit existing historical migrations) to:
  - [ ] Create view or backup export (optional; only if additional audit required).
  - [ ] Drop `category` column from `media` (Postgres) / ignore if SQLite ephemeral fallback – or mark as deprecated if drop unsupported.
- [ ] Test covering absence of column added (attempting to reference should fail in a controlled way / feature tests still pass).

## Post-Removal Tasks
- [ ] Remove any final feature flags related to category (`ENABLE_SOFT_NULL_CATEGORY`).
- [ ] Update documentation (README + architecture instructions) to remove legacy references.
- [ ] Announce deprecation completion to stakeholders.

## Sign-offs
| Role | Name | Date | Notes |
| ---- | ---- | ---- | ----- |
| Engineering | | | |
| QA / Testing | | | |
| Product / Owner | | | |
| Operations | | | |

---
Attach logs / JSON outputs / additional evidence below:

```
(paste simulation output here)
```
