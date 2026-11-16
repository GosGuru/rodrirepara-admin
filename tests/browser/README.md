# Browser regression checks

`checkModePointer(page, { touch })` in `mode-filter.mjs` accepts an isolated Playwright page with the application's default seed loaded. Run it once with a desktop context and once with a 390px touch context. The caller owns browser/server setup and cleanup; do not pass a real user's browser profile.

The check exercises the public UI only: every modality, exact rows and counts, focus after committing, combined search, no-results criteria and resetting both filters. It pins the bug where blur dismissed an option before its click committed. It never reads browser storage or calls repository internals.

These checks require a browser runner supplied by the caller and are not part of `bun test`. The local P4 runner imports this function into the prepared portable browser runtime; execution evidence is retained under `.cache/verification/`. No browser dependency is added to the production application.

## Kanban cards and color settings

With the preview running, set a fresh `CRM_EVIDENCE_DIR` and run `node tests/browser/kanban-card-settings.mjs`. Disposable desktop and narrow contexts check customer-first hierarchy, neutral card surfaces, differentiated tags, reduced-motion shadow states, card density, separated payment/delivery states, action targets and keyboard focus, visible identifiers, stage colors and rendered text/control contrast. The default run includes invalid and unavailable preference storage and a public-component fixture for unknown repair states and normal-motion shadows; it does not use a real browser profile.

Set `CRM_INTERACTIONS_ONLY=1` and `CRM_INTERACTION_CASE` to `drag`, `keyboard`, `touch` or `uuid` to run an individual interaction. The `touch` case uses keyboard assistance for the native picker and is not proof of touch-only picker selection. `CRM_ARROW_ONLY=1` runs the move-arrow geometry check. Set `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` when using a different preview or installed browser.

## Resumen polish

With the preview running, `node tests/browser/overview-resumen-polish.mjs` checks the removed helper copy, spaced divider, KPI cards, stage colors, toolbar alignment and settings-panel fit, and sticky quick-action visibility, keyboard access and existing dialogs/navigation at desktop and narrow widths in disposable contexts. Additional mobile contexts use trusted emulated touch events for all four quick actions. It exports individual checks and writes screenshots to `.cache/verification/resumen-polish/`; `CRM_EVIDENCE_PHASE`, `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` select the evidence prefix, preview and browser. `CRM_EVIDENCE_DIR` optionally redirects screenshots without changing the default location.

## Move selector and stage colors

With the CRM preview running, `node tests/browser/move-state-selector.mjs` uses fresh disposable seeded contexts at desktop and narrow widths, never a user profile. It checks compact inline state radios, idle disabled feedback, the three filled stage headers and neutral card surfaces, and saves/reloads each chosen repair state without changing payment or delivery. Screenshots go to `.cache/verification/move-state-selector/`; `CRM_EVIDENCE_PHASE` distinguishes runs. `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` select the preview and installed browser. `CRM_EVIDENCE_DIR` optionally redirects screenshots without changing the default location.

## Client search

With the CRM preview running, `node tests/browser/client-search.mjs` checks the full client list, name and phone filtering, accent-insensitive search, empty results, the quick-create dialog and its saved result in fresh disposable desktop and narrow contexts. `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` select a different preview or browser; never use a real profile.

## Repair client selector

With the preview running, run `node tests/browser/quick-client-picker.mjs`, `node tests/browser/quick-client-states.mjs` and `node tests/browser/quick-client-concurrency.mjs`. They use disposable contexts and seeded data, never a real profile. Together they check search and filtering, duplicate client identities, repair-draft retention, native constraint validation, Enter and Escape, focus return, failed or pending writes, and two-tab creation and repair linkage under Web Locks. These tests do not replace independent verification or visual approval. `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` select the preview and Chromium.

## Modal usability

With the CRM preview running at `http://127.0.0.1:5173/`, run `node tests/browser/modal-create-ux.mjs`, `node tests/browser/modal-create-states.mjs` and `node tests/browser/modal-sheet-ux.mjs`. These use fresh disposable browser contexts, not a real profile. The centered-dialog checks cover examples, right-aligned actions, unclipped scrolling at narrow sizes, native validation, Enter, Escape and focus return; separate checks hold the real repository Web Lock or reject storage writes to exercise pending and error states. Sheet checks cover compact payment information, external form association, saved edits and payments, an explicit repair move, busy guards including desktop backdrop interaction, and focus and geometry. These checks do not establish visual approval or full accessibility conformance. `CRM_BASE_URL` selects an isolated preview; `CRM_BROWSER_EXECUTABLE` selects another installed Chromium.

## Side-sheet motion

Run `node tests/browser/side-sheet-motion.mjs` with the existing local Playwright runner under `.cache/browser-check/node_modules/` and Chromium under `.cache/playwright/`. Set `CRM_BROWSER_EXECUTABLE` to use another installed Chromium executable. No application server or stored records are used.

The two native-browser CSS cases assert that an open reduced-motion sheet is opaque before the animation-frame class arrives, and that normal-motion entered state, transitions and viewport geometry remain intact. This is a focused stylesheet regression, not proof of editor submission or persistence.

## Order-sheet entry and cancellation

With the existing CRM preview running, execute `node tests/browser/order-sheet-entry.mjs`. `CRM_BASE_URL` selects another preview URL; `CRM_BROWSER_EXECUTABLE` selects an installed browser. It uses a new disposable browser context, never the user's profile. The exported `checkOrderSheetEntry(page, id)` can also run against a caller's isolated seeded page (`RR-1047` by default).

It checks stacked detail labels, opening Edit and Payment without a persistence notice or pending Save, each docked Save targeting its live form, and cancellation without saving. Distinct read/form button identities prevent the opening click from activating a replacement submit button. This check never clicks Save; successful persistence, rejection, busy guards and cross-tab coordination require separate verification.

## Side-sheet focus

With this project's Vite preview running, execute `node tests/browser/side-sheet-focus.mjs`. It uses the same `CRM_BASE_URL` and `CRM_BROWSER_EXECUTABLE` overrides, a fresh disposable context per case, and the public component fixture under `fixtures/side-sheet-focus.html` (not the CRM's stored records).

The two checks preserve focus on a connected opener and require a visible status or heading after the opener is removed. Native close completion is observed before the fallback assertion. The fixture isolates the shared shell from application-level focus effects; real Kanban and mobile integration remain independent functional checks.
