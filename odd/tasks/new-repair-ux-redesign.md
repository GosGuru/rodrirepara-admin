# Redesigned New Repair Flow, Client Combobox, Custom Controls & Save System
Objective: Implement the dedicated Nueva reparación flow with inline Nuevo cliente subflow, searchable ClientCombobox, reusable custom Select and DatePicker, universal SaveButton animation system, and global Toast feedback without modifying Home or existing business logic.
Branch/Delivery: `main` (local uncommitted working tree — prior Home/panel work is uncommitted on `main`; do not branch/commit without explicit user instruction). Test runner: `bun test`, `npm run typecheck`, `npm run build`, Playwright browser checks.

## Specs

S1. **Absolute restrictions (Home & business logic intact)**:
- "NO MODIFICAR LA HOME." — Do not modify `OverviewView`, Sidebar, Header greeting/metrics/charts/Kanban, Trabajos activos, Cobrado hoy, Por cobrar, or OrderDetail.
- "No inventar campos de base de datos, endpoints, validaciones o comportamientos de negocio."
- "Conservar todos los campos y validaciones reales del sistema. No agregar campos solamente porque aparezcan en una referencia visual."
- Real required fields for `Order`: `clientId`, `equipment`, `mode` (`'Taller' | 'Domicilio'`), `address`, `fault`, `entry` (`YYYY-MM-DD`). Real required fields for `Client`: `name`, `phone`.

S2. **Dedicated Nueva reparación flow (`NewRepairView`)**:
- "Mi preferencia es convertir Nueva reparación en una vista de creación dedicada dentro de la aplicación, sin perder la navegación existente."
- Centered max-width container in the workspace area with generous whitespace, header ("Volver", "Nueva reparación", "Crear una nueva orden de trabajo"), all real fields, and footer actions ("Cancelar", "Guardar reparación").
- "Nunca mostrar dos modales superpuestos."

S3. **Searchable Client Combobox (`ClientCombobox`)**:
- "Eliminar la duplicación entre el buscador de clientes y el desplegable de selección. Implementar un único componente estilo Searchable Combobox."
- Anchored floating popover (not clipped by overflow), accent-insensitive search by name or phone, keyboard arrows / Enter / Escape, clear selected state, ability to change selection, empty state when no matches, always-visible "Agregar cliente" action, no native `<select>`.

S4. **Nuevo cliente subflow inside Nueva reparación**:
- "Cuando Rodrigo presione Agregar cliente desde Nueva reparación, iniciar un subflujo de creación."
- Inline step transition without stacked modals; saves via real `repo.addClientWithId`; shows SaveButton animation + real persistence confirmation; auto-returns to Nueva reparación with the exact newly created client selected (including duplicates) and all previously entered repair fields preserved. Cancel returns without losing repair data; error keeps client inputs intact.

S5. **Reusable custom `Select`**:
- Consistent height, radius, dropdown icon, normal/hover/focus/disabled/error states, subtle popover shadow, selected indicator, smooth transition, responsive, mouse + keyboard + Escape + focus management + accessible labels + controlled form value. Used in Nueva reparación (`Modalidad`) and Registrar gasto (`Categoría`).

S6. **Reusable custom `DatePicker`**:
- No native browser date picker as primary UI. Field with calendar icon, readable Uruguayan format `dd/mm/aaaa`, Spanish calendar, Monday-first (`L M M J V S D`), month and year navigation, manual `dd/mm/aaaa` input with strict Gregorian validation, timezone-safe `YYYY-MM-DD` form sync, selected day highlighted, today differentiated, keyboard navigation, closes on selection, unclipped floating popover.

S7. **Universal `SaveButton` animation system**:
- Single reusable component with 4 states: Idle (dark `#181922`, white text, rounded, subtle shadow, refined hover), Saving (spinner + `"Guardando..."`, blocks duplicate clicks, stable width without layout shift), Success (ONLY after confirmed persistence: smooth transition to sober green, animated white check, `"Guardado"`, subtle scale/glow, no confetti/bounce), Error (no green check, clears loading, keeps form data, shows clear error, allows retry without locking). Respects `prefers-reduced-motion`.

S8. **Global confirmation `Toast` & design consistency**:
- Compact light toast with green check, crisp border/shadow, smooth enter/exit, contextual messages (`"Cliente creado correctamente."`, `"Reparación registrada correctamente."`, `"Cambios guardados correctamente."`), never competing simultaneously with button confirmation. Shared design tokens across desktop, tablet, and mobile.

## Tasks

- [x] T1 | S1, S6, S7 | route: inline | status: done | Core utilities & hooks: `src/utils/date.ts`, `src/hooks/useFloatingPopover.ts`, `src/hooks/useSaveFeedback.ts` + RED/GREEN unit tests (8/8 pass).
- [x] T2 | S5, S6, S7, S8 | route: inline | status: done | Reusable UI design-system primitives: `SaveButton`, `Toast`, `Select`, `DatePicker` + shared styles + unit tests (4/4 pass).
- [x] T3 | S3 | route: inline | status: done | Searchable `ClientCombobox` replacing duplicated picker + unit tests (3/3 pass).
- [x] T4 | S1, S2, S4, S5, S6, S7, S8 | route: inline | status: done | Dedicated `NewRepairView` (inline `Nuevo cliente` subflow), updated `QuickActionForms` (`ClientForm`, `ExpenseForm`), `App.tsx` wiring + unit tests (111/111 pass, typecheck & build clean).
- [x] T5 | S1-S8 | route: inline | status: done | Full verification: `bun test` (117/117 pass), `npm run typecheck` (0 errors), `npm run build` (clean), Playwright E2E across 1440px/1280px/768px/375px (4/4 pass), visual screenshot audit vs references + UX polish applied, Home untouched verified.

## Verification Evidence
- `bun test`: 117 pass / 0 fail (29 files, 1004 expect calls)
- `npm run typecheck`: exit 0
- `npm run build`: clean production bundle (`vite build`)
- Playwright E2E (`verify-new-repair.mjs` against `vite preview`):
  - Desktop 1440px: dedicated `Nueva reparación` view, zero stacked modals, empty-submit validation, searchable `ClientCombobox` (accent-insensitive search, Enter non-submit, Escape preserve, empty state), custom `Select` (mouse + keyboard), custom `DatePicker` (Spanish Monday-first, `dd/mm/aaaa`, invalid `31/02/2026` rejected, timezone-safe `2026-11-22` persisted), inline `Nuevo cliente` subflow (Cancel preserves draft, Save shows stable-width green `Guardado`, auto-returns with newly created client selected & dropdown cleanly closed + Toast `Cliente creado correctamente.`), final repair save (`Guardado` -> returns to Home + Toast `Reparación registrada correctamente.` + persisted in `localStorage`).
  - Storage write error simulation: keeps inputs, never shows green check, shows error alert, retry succeeds.
  - Standalone `Nuevo cliente` & `Registrar gasto` dialogs: custom `Select`, `DatePicker`, `SaveButton`, `Toast`.
  - Responsive 768px & 375px: zero horizontal overflow, unclipped floating popovers (calendar auto-flips cleanly on mobile).
- Home (`OverviewView`, `Header`, `Sidebar`, `OrderDetail`, `MetricDrawers`, `CardContextMenu`): untouched.

## Log

### L1 — Original Request (2026-11-19)
User provided "PROMPT MAESTRO — REDISEÑO UX/UI Y MICROINTERACCIONES DE RODRIGO REPARA" with two reference images (`media_1795114735105_6c1222da.jpg` for Nueva reparación / Nuevo cliente / Combobox / Select / DatePicker aesthetics, and `media_1795114776480_0eba6327.png` for the dark SaveButton aesthetic), explicitly requesting:
1. Dedicated Nueva reparación view (preserving Sidebar navigation, no stacked modals) with inline Nuevo cliente subflow preserving all repair draft fields and auto-selecting the exact newly created client.
2. Unified Searchable Combobox for clients (no native select, no duplicated search+select).
3. Reusable custom Select and custom Uruguayan Spanish Monday-first DatePicker (`dd/mm/aaaa`, timezone-safe `YYYY-MM-DD`).
4. Universal SaveButton (Idle, Saving, Success only after real persistence, Error) + Toast feedback without competing simultaneous confirmations.
5. Absolute restriction: DO NOT modify Home (`OverviewView`), Sidebar, Header, MetricDrawers, CardContextMenu, or OrderDetail, and do not invent DB fields or business logic.

### Analysis & Forecast
- Baseline: `bun test` 94 pass / 0 fail; `npm run typecheck` clean.
- Prior uncommitted dashboard/panel edits exist on `main`; we will not touch those files (`OverviewView`, `Header`, `Sidebar`, `OrderDetail`, `MetricDrawers`, `CardContextMenu`).
- Forecast: ~1,100–1,400 authored lines across new modular UI primitives, dedicated creation view, CSS, and unit/E2E tests.
