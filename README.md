# NudeCollection Monorepo

Unified workspace for Admin, Flow, Forge applications and shared modules.

## Packages
- `NudeShared` – Shared server modules (DB, auth, logger, cache helpers), client utilities (`overlay.js`, `debounce.js`, `toast.js`, `theme.css`), centralized tests.
- `NudeFlow` – Consumer / browsing app (media feed, tags overlay, playlists, tagging + voting UI).
- `NudeForge` – Generation workflows, upload/copy pipeline, LoRA scanning.
- `NudeAdmin` – Moderation dashboard, analytics, tagging + metrics views.

## Key Conventions
- Pure ESM across all packages.
- Tests live ONLY under `NudeShared/test/**` (scenario + smoke oriented). No per-app `test/` folders.
- Additive, idempotent migrations (`NudeShared/server/db/migrate.js`). Never rewrite prior blocks.
- Shared styling via `NudeShared/client/theme.css` (extend utilities rather than per-app overrides).
- Overlay interactions use `NudeShared/client/overlay.js` (dialog semantics, a11y focus handling).

## New (Sept 2025) – Debounce Utility
`NudeShared/client/debounce.js` provides a robust debounce with:
- `leading`, `trailing` (default true), and `maxWait` support.
- Methods: `.cancel()`, `.flush()`, `.pending()`.
- Tested in `NudeShared/test/util/debounce.test.mjs` (includes leading+trailing, cancel, maxWait scenarios).
Use this instead of ad‑hoc `setTimeout` patterns for input rate limiting or resize handlers.

Example:
```js
import { debounce } from '/shared/debounce.js';
const onResize = debounce(() => console.info('resized'), 150, { leading:true, maxWait: 600 });
window.addEventListener('resize', onResize);
```

## Scripts
From repo root:
```bash
npm run test        # Run full shared test suite
npm run lint        # Lint all packages (fail on warnings in shared scope)
npm run lint:fix    # Attempt auto-fixes
```

## Adding Features (Checklist)
1. Migration (additive) -> `migrate.js`.
2. Extend existing endpoint where possible (avoid parallel duplication).
3. Add / extend scenario test under `NudeShared/test/**`.
4. Reuse shared utilities (overlay, debounce, toast) – avoid forks.
5. Update docs (`.github/copilot-instructions.md`) if policy / convention changes.

## Test Philosophy (Condensed)
- Broad scenario coverage > many micro tests.
- Prefer expanding an existing scenario file with a few assertions.
- Remove superseded micro tests once coverage is folded into scenarios (document in instructions file).

## Accessibility
- Overlays must have `role="dialog"`, `aria-modal="true"`, initial focus management, Escape close.
- Live regions for dynamic admin metrics / tag operations must be present (asserted in tests).

## Cleaning Artifacts
Post-suite cleanup script: `node NudeShared/scripts/clean-test-artifacts.mjs` (runs automatically during test script) removes ephemeral output/copy/temp artefacts.

## Troubleshooting
- Failing migrations: ensure no destructive edits; add new blocks only.
- Missing overlay behavior: check explicit route for `/shared/overlay.js` in Flow app.
- Debounce not firing: verify `leading` vs `trailing` options and that calls cease for at least `wait` ms for trailing case without `maxWait`.

## License
Internal / private (no explicit OSS license configured).