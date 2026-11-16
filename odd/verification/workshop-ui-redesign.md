# Workshop redesign — combined verification evidence

The implemented React redesign has evidence for the requested functional checks across parent checks and independent bounded continuations. This is an orchestrator evidence index, **not a new verifier verdict, native review approval, aesthetic approval or publishing authorization**.

Specification and history: [workshop-ui-redesign](../tasks/workshop-ui-redesign.md). Candidate: `.cache/verification/prepared-runtime-uynio6_f/report.json`, 77 source/config inputs. The repository implementation remains SHA-256 `1313668b2c739ba5856be4b4c904207b2ca4dce3277b6d2b9215cd23533061a5`.

## Evidence by requirement

| Spec | Observed evidence | Provenance |
| --- | --- | --- |
| S1 | Real React application, all seven routes inspected; no embedded prototype replacing the application | Parent route captures and actual-browser inspection |
| S2 | Exact active grouping/unknown fallback/closed exclusion; real native drag, chooser, cancel/same-column no-op, repair-only persistence; keyboard move and practical mobile move | Parent SSR/public repository tests; independent drag/keyboard/mobile runs |
| S3 | Top-aligned seven routes, open board and hierarchical cards/detail; labels above values | Parent screenshots, geometry and public browser regression |
| S4 | Existing seven-route React Bits sidebar/action icons/system fonts retained | Parent Sidebar tests and actual route captures; source preservation |
| S5 | Side-sheet overlay, normal/reduced-motion CSS, connected/disconnected-origin focus, pending close guards, native mobile internal scroll with stable header/footer | Parent motion/focus regressions; independent actual Kanban focus and mobile checks |
| S6 | All 16 editable values persisted exactly; guarantee client locks; original-target price/payment; drafts/errors/rejection; no auto-save on entry; native mobile edit/save/white fields/docked actions | Parent 87-test suite and public entry/focus checks; independent persistence/failure/mobile checks |
| S7 | Four chart drill-downs use actual active states, recorded payment months, priced balances and consultation states; exclusions disclosed | Parent chart tests and four actual graph captures |
| S8 | Paid/ledger/unrelated entities preserved, no optimistic whole-Data replacement, genuine native Web Locks and UI-action races, reload persistence | Independent public repository and real two-page UI checks; protected backend source |
| S9 | Focused RED/GREEN for meaningful changes and assembled checks; all failed/skipped setup/probe attempts retained rather than presented as passes | Feature Log and browser regressions |
| S10 | Contextual states and hierarchy across Consultas/Clientes/Órdenes/Finanzas/Repuestos/Crecimiento without new inventory/permission/profit semantics | Parent view tests, screenshots and source readback |

Scoped verifier reports remain scoped/partial relative to the whole specification. The table combines their actual observations with parent evidence; it does not relabel any individual failed or partial report as a global PASS. No known requested functional subcase remains outstanding after the final three mobile checks.

## Final mobile closure

`mwh61ely-1h-qd3w` completed the last three checks across three scratch runs:

- Native sheet-body pan: `scrollTop 0 → 351`; header/footer rectangles unchanged; footer within the visual viewport; native Cancel/Close touches.
- Orders table: valid `TR` children; native horizontal pan `scrollLeft 0 → 251` after exposing the table vertically.
- Mobile Mover: native selector touch, **keyboard-assisted native picker selection**, then native exact-status/confirm touches. Public load changed only repair to `Esperando aprobación`; focus returned to the visible status message.

**Input limitation:** the native selector's option was chosen with keyboard assistance. This is evidence of the practical mixed keyboard/touch path, not a claim that every operating-system picker step was tested using touch alone.

The final role observed HTTP 200, Chromium `158.0.8127.18`, viewport/screen `390×844`, touch enabled, and 77 matching workspace/scratch hashes before and after. It made no product edits or installations. Full scratch artifacts are provider-reported paths; the parent did not read or remove outside-project scratch.

## Focus correction

One logical production correction in `src/components/SideSheet.tsx`: restore on the actual native close event, preserving a usable connected opener or returning to visible main status/heading. Public fixture RED: one normal-origin pass and one removed-origin BODY failure. A synchronous fallback attempt also failed; final native-close handler passed both cases. Independent `mwh3oclf-1e-bqie` then observed the actual keyboard Kanban move return focus to `P[role=status]` instead of BODY.

The refreshed candidate differs from its predecessor only in the focus shell and integration documentation. Data, payment, state, schema and seed code did not change; earlier independent data evidence is retained with its original provenance.

## Checks and historical failures

- Final parent checks: **87 Bun tests, 840 assertions**, typecheck and production build passed.
- Browser self-checks: focus **2/0**, motion **2/0**, order-sheet entry/cancel passed.
- Independent observations: full 16-field edits; guarantee-original payments; real drag/keyboard moves; rejection/draft/busy/duplicate guards; KPI invariants; real two-page native-lock UI races; mobile edit, focus, scroll, table and move.
- Historical failures remain recorded: missing temporary manifest, isolation-incompatible entrypoint, incomplete drag/tap/key observations, offscreen visual-coordinate assumptions and premature pre-pan assertions. None is silently erased or claimed to prove a product defect.
- The final mobile cycle used exactly **two human-authorized navigation-script corrections**. Run 1 exposed the sheet but attempted a below-viewport table gesture (`0 → 0`); correction 1 added vertical exposure. Run 2 passed the table but did not scroll the board to Mover; correction 2 scrolled it `0 → 522`. The related checks then passed. Criteria and candidate were unchanged.

## Separate limitations

Native review assessment remained unassessable because the project is untracked; no lineage/approval/authority burn is claimed. This is separate from the functional checks above. No commit, push, pull request, deployment, dependency installation or real-user data reset was performed.

`design/system.md` and `design/system.html` are older captures; their tokens/layout inventory were not silently re-synced. Current implementation inventory is documented separately. A full design-system re-sync requires explicit approval.
