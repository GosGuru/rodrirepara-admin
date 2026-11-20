# Redesign of Configuración y módulos (`SettingsDrawer` & Kanban Color Editor)
Objective: Implement the Apple-grade redesign of the **Configuración y módulos** side drawer, visual Kanban color editor (palette + custom HEX + live preview + contrast engine + browser persistence + `SaveButton` animation), modules presentation (Consultas & Repuestos), and quick-action coherence (including `Registrar gasto` accessible from both Home and Settings) without redesigning the rest of the system.
Branch/Delivery: `main` (local uncommitted working tree; do not branch, commit, or push without explicit user instruction). Forecast: ~900–1200 authored lines across `src/views/kanban-color-settings.ts`, `src/components/settings/*`, `src/App.tsx`, `src/Header.tsx`, `src/views/OverviewView.tsx`, `src/views/overview-board.css`, `src/style.css`, and unit tests. Strategy: `exception-ok`. Test runner: `bun test`, `bun run typecheck`, `bun run build`, live Playwright browser verification.

## Specs

S1. **Absolute scope restrictions & component reuse**:
- "No quiero un rediseño general del sistema. Quiero mejorar exclusivamente este panel, sus interacciones y los accesos rápidos relacionados."
- Do NOT modify dashboard structure, revenue chart, metric cards, Kanban/list structure, clients view, orders view, finance view, reports, sidebar, or existing creation/edition forms.
- Only targeted home adjustments are permitted: ensuring quick-action coherence (`Registrar gasto` accessible from Home) and reflecting custom Kanban colors cleanly.
- Do NOT invent modules, WhatsApp/Instagram integrations, webhooks, APIs, user/permission settings, notifications settings, theme switchers, or database changes.
- Reuse `<SideSheet>`, `<SaveButton>`, `useSaveFeedback`, `useFloatingPopover`, `Toast`, `ClientForm`, `ExpenseForm`, and `NewRepairView`.

S2. **Drawer shell, header & layout**:
- Keep right-side drawer (`SideSheet`) with ~640–720 px desktop width adapted to viewport, white surface, rounded corners, subtle dark overlay, fixed header, scrollable body, fixed footer, smooth enter/exit animation.
- Header: settings icon, title `"Configuración y módulos"`, description `"Personalizá Rodrigo Repara según tu forma de trabajar."`, aligned close button (`aria-label="Cerrar configuración"`).
- No secondary inner sidebar navigation; organize clearly into 3 sections: 1. Módulos, 2. Acciones rápidas, 3. Colores del tablero.
- Footer shows `Rodrigo · Administrador`, `Cancelar`, and universal `SaveButton` (`Guardar cambios`).

S3. **Módulos del sistema (Consultas & Repuestos)**:
- Two compact, cohesive cards without fake activation toggles.
- **Consultas**: coherent card with subtle `"Próximamente"` indicator for automatic WhatsApp/Instagram integration; never fabricate counts or claim active integrations; preserve existing manual view navigation (`Consultas`).
- **Repuestos**: preserve existing view navigation (`Repuestos`) with improved compact presentation; no fake toggles.

S4. **Acciones rápidas & Home coherence**:
- Keep `Nuevo cliente` and `Registrar gasto` in Settings, plus `Nueva reparación` for coherence — all calling the exact existing handlers (`setDialog("cliente")`, `setDialog("gasto")`, `openNewRepair`).
- Ensure `Registrar gasto` is accessible both from the Home dashboard (`Header` dashboard chrome) and from `Configuración y módulos` without duplicating buttons or forms.

S5. **Visual Kanban Color Editor, WCAG contrast, Live Preview & Persistence**:
- Replace native `<select>` elements with a custom visual color editor for `Pendientes`, `En proceso`, and `Listos`.
- Each stage row displays: representative icon, stage name, circular swatch, current HEX code, and edit trigger opening a custom popover (`useFloatingPopover`, portal inside `<dialog>` so never clipped).
- Popover offers:
  - Curated visual palette (`Paleta`) with selected highlight + inner check, updating HEX and live preview immediately.
  - Custom color (`Personalizado`) with editable HEX input, strict validation, inline error handling without applying invalid values, synced with palette and an integrated custom visual HSV/Hue color selector.
- Recommended defaults (preserving existing saved preferences and migrating legacy `amber`/`blue`/`green`/`plum` names):
  - `Pendientes`: `#D97706` (soft bg `#FFF3DD`)
  - `En proceso`: `#2563EB` (soft bg `#EAF1FF`)
  - `Listos`: `#15803D` (soft bg `#E8F6ED`)
- Accessible contrast engine: compute `primary`, `softBg`, `accent` (WCAG AA >= 4.5:1 against `softBg`), `headerText`, `border`, and `checkInk` so custom colors never make text or icons illegible.
- Live Kanban preview inside editor showing simplified `Pendientes · En proceso · Listos` columns matching real Kanban visual language, with zero fake stats/orders, updating immediately from draft state separate from applied `boardColors`.
- Secondary action `"Restablecer colores predeterminados"` updates draft + preview before saving.
- Persistence in `localStorage` (`rodrigo-crm-kanban-colors`): `Guardar cambios` persists via `useSaveFeedback` + `SaveButton` (`Guardar cambios` → `Guardando...` → animated green `Guardado`, or clear retryable error without green check), updates live Kanban, and persists across page reloads.
- Unsaved-changes protection: `Cancelar` or closing (`X`, `Escape`, backdrop) when dirty prompts clear inline confirmation (`Descartar cambios` / `Seguir editando`) and restores saved values on discard.

S6. **Microinteractions, responsive layout, accessibility & verification**:
- Smooth 150–250ms transitions respecting `prefers-reduced-motion`.
- Desktop drawer (`680px`), tablet adapted, mobile full-width with touch-friendly controls (`>= 40–44px`).
- Focus management, Escape closes popover first then drawer, keyboard navigation, accessible labels, visible focus rings, no clipped popovers.
- Full verification: unit tests (`bun test`), `bun run typecheck`, `bun run build`, and live browser checks across desktop, tablet, and mobile.

## Tasks
- [x] T1 (S5, inline): Upgrade `src/views/kanban-color-settings.ts` with HEX model, legacy preset migration, curated palette, strict HEX validation, WCAG AA contrast token derivation, and RED/GREEN unit tests (`src/views/kanban-color-settings.test.ts` — 7/7 pass, 62 assertions).
- [x] T2 (S2, S3, S4, S5, S6, inline): Build `ColorPickerPopover`, `SettingsDrawer`, and `settings-drawer.css` reusing `SideSheet`, `SaveButton`, `useSaveFeedback`, and `useFloatingPopover`, plus component tests (`src/components/settings/SettingsDrawer.test.tsx` — 4/4 pass, 43 assertions).
- [x] T3 (S1, S4, S5, inline): Wire `SettingsDrawer` into `src/App.tsx`, add `Registrar gasto` coherence to dashboard `src/Header.tsx` + `src/style.css`, wire dynamic CSS tokens into `src/views/OverviewView.tsx` + `src/views/overview-board.css`, and update `src/views/KanbanColorSettings.tsx` type compatibility.
- [x] T4 (S6, inline): Run full verification suite (`bun test` 140/140 pass, `bun run typecheck` clean, `bun run build` clean) and live Chromium Playwright validation across desktop (1440×900), tablet (820×1024), and mobile (390×844) with visual screenshot review.

## Log
- L1 (2026-11-19): User requested full redesign of **Configuración y módulos** in Rodrigo Repara per PROMPT MAESTRO with 3 visual reference images defining visual direction and prompt defining strict functional scope.
- L2 (2026-11-19): Completed mandatory inspection via read-only explorer and direct reads. Key findings: Settings panel is currently inline in `src/App.tsx:255-316`; `OverviewView` receives `onCreateExpense` prop but neither `Header` nor `OverviewView` currently renders `Registrar gasto` on the Home view; `kanban-color-settings.ts` persists `amber|blue|green|plum` in `localStorage` under `rodrigo-crm-kanban-colors`; `SideSheet`, `SaveButton`, `useSaveFeedback`, `useFloatingPopover`, and `Toast` are ready for direct reuse. Baseline: 127 tests pass, `tsc --noEmit` passes.
- L3 (2026-11-19): Completed T1–T4. During live browser verification caught and fixed two real defects: (1) `useFloatingPopover` offset math inside transformed `<dialog>` (`SideSheet` has `transform: translateX(0)`, creating a containing block for `position: fixed`), now subtracts host rect offsets when transformed and uses `scrollHeight` + `ResizeObserver` + `repositionKey` so taller tabs (`Personalizado`) flip cleanly above with zero clipping or internal scroll; (2) reordered module card title ahead of status pill for natural screen-reader order and arranged stage list alongside live Kanban preview on desktop so the entire drawer fits above the fold. Verified all 140 unit tests, `tsc --noEmit`, `vite build`, and live Playwright browser checks across desktop, tablet, and mobile with 0 console/page errors.
