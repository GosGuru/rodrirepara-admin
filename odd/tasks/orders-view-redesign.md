# Redesign of Órdenes de trabajo / Reparaciones (`OrdersView`)
Objective: Implement the Apple-grade redesign of `OrdersView` faithfully following the approved reference (`media_1795115905376_f5cb37e9.jpg`) and existing Rodrigo Repara design system while preserving real data, business rules, and all other modules untouched.
Branch/Delivery: `main` (local uncommitted working tree; do not branch, commit, or push without explicit user instruction). Test runner: `bun test`, `npm run typecheck`, `npm run build`, browser visual verification.

## Specs

S1. **Absolute restrictions (other views & business logic intact)**:
- "NO MODIFICAR EL DASHBOARD PRINCIPAL." — Do not modify Home (`OverviewView`), Sidebar, Header, Kanban, `NewRepairView`, `QuickActionForms`, `repository.ts`, `selectors.ts`, or `OrderDetail.tsx`.
- "No modificar modelos de datos, endpoints o reglas de negocio para acomodarlos a las imágenes."
- "No inventar estados, cobros, órdenes, fechas o acciones."
- "Reparación, cobro y entrega son dimensiones independientes. Una reparación terminada no significa que esté cobrada. Una reparación cobrada no significa que esté entregada."

S2. **Table structure, typography, alignment & long ID truncation**:
- Preserve the 6 functional columns (`Orden y cliente`, `Equipo / modalidad`, `Reparación`, `Cobro`, `Entrega`, `Detalle` with `Ver detalle` + `⋯`).
- White rounded card (`Seguimiento de reparaciones` with soft indigo icon tile, subtitle, live count), crisp header, consistent row spacing, subtle hover, active highlight when context menu open, footer note (`Terminado no significa cobrado; cobrado no significa entregado.`).
- "Si un identificador es demasiado largo, truncarlo visualmente sin modificar su valor real. Debe poder consultarse completo mediante un mecanismo accesible. No permitir que una cadena larga desconfigure toda la tabla."
- Semantic status badges with icon + text (not color alone) across repair, payment (with `$ paid / $ price` or `sin precio final`), and delivery dimensions.

S3. **Search, shared custom Select for Modalidad, `Más filtros` popover & active filter chips**:
- Prominent search field with magnifying glass icon, descriptive placeholder (`Buscar cliente, equipo, falla u orden`), blue focus ring, clear (`×`) button when non-empty, live suggestions dropdown matching real fields without layout shifts.
- Replace `ModeFilter` with the shared custom `Select` (`src/components/ui/Select.tsx`) containing ONLY real options (`Todas`, `Taller`, `Domicilio` — NO fake `Recepción` and NO decorative date selector `"Todo el período"`).
- Hide additional real status filters (Reparación, Cobro, Entrega) inside a `Más filtros` anchored floating popover using shared `Select` controls.
- Show discreet active filter chips (`Filtros activos`) with individual remove buttons, plus `Limpiar filtros` restoring initial state. Never show green success toasts for applying or clearing filters.

S4. **Row contextual menu (`⋯`) & Save feedback / animations**:
- Reuse `CardContextMenu` anchored to each row's `⋯` button (unclipped even on the last row, keyboard/Escape/outside-click support, consistent with Kanban).
- Expose ONLY real operations (`Ver detalle`, `Editar reparación`, `Cambiar estado` submenu, `Registrar cobro`, `Marcar como lista`, `Cerrar orden` — NO fake `Eliminar orden`).
- Destructive action (`Cerrar orden`) requires an appropriate compact confirmation popover using the universal `SaveButton` (`Idle → Guardando → Guardado / Error`) via `useSaveFeedback`.
- Quick state mutations show subtle inline saving state and brief green check confirmation ONLY after server/repository confirmation, relying on existing global `Toast` (`App.tsx`) for confirmed updates; on error, preserve row data and display error with retry/dismiss.

S5. **Special states, responsive layout & accessibility**:
- Support Loading (skeleton rows, stable height), Empty (`data.orders.length === 0`, no fake data), No Results (message + `Limpiar filtros` button), and Error (clear message + retry when available).
- Desktop: aligned 6-column table. Mobile/tablet (`<= 860px`): compact stacked cards preserving the 3 independent dimensions and working filters/menus/buttons.
- Keyboard accessible, `prefers-reduced-motion` respected, `bun test`, `npm run typecheck`, `npm run build`, and live visual comparison against reference screenshot.

## Tasks

- [x] T1 | S1, S2, S3 | route: inline | status: done | Pure helpers (`src/views/orders/order-helpers.ts`) + `OrderStatusBadge` (`src/views/orders/OrderStatusBadge.tsx`) + RED/GREEN unit tests (6/6 pass).
- [x] T2 | S3 | route: inline | status: done | Upgraded `ModeFilter` to wrap shared `src/components/ui/Select` (real options + icons) and created `OrdersFiltersPopover` (`Más filtros`).
- [x] T3 | S2, S4 | route: inline | status: done | Created `OrderRowActions` (reusing `CardContextMenu` + anchored `Cerrar orden` confirmation with universal `SaveButton` & `useSaveFeedback`) and `OrderIdCell` long-ID accessible inspector/copy popover.
- [x] T4 | S1, S2, S3, S4, S5 | route: inline | status: done | Redesigned `OrdersView.tsx` and dedicated `src/views/orders-view.css` + expanded unit tests in `OrdersView.test.tsx`.
- [x] T5 | S1-S5 | route: inline | status: done | Verified: `bun test` (120/120 pass), `npm run typecheck` (0 errors), `npm run build` (clean), and live browser verification (desktop 1366x850 + mobile 390x844, 0 console errors, zero badge truncation after column width polish, Home untouched).

## Log

### L1 — Original Request (2026-11-19)
User requested "PROMPT MAESTRO — REDISEÑO DE ÓRDENES DE TRABAJO | RODRIGO REPARA" and provided the target reference mockup (`media_1795115905376_f5cb37e9.jpg`) after confirming the first screenshot was the current screen. Core rules: faithful visual match to the reference using the existing Rodrigo Repara design system (`src/components/ui/Select`, `SaveButton`, `Toast`, `useFloatingPopover`, `useSaveFeedback`, `CardContextMenu`), strictly real data and business rules (no `Todo el período`, no `Recepción`, no `Eliminar orden`, independent repair/payment/delivery), zero modifications to Home/Dashboard/Sidebar/Header/NewRepair/business logic.

### Verification Evidence (2026-11-19)
- `bun test`: 120 pass / 0 fail across 29 files (1018 assertions).
- `npm run typecheck`: clean (`tsc --noEmit`).
- `npm run build`: clean (`vite build`, 201ms).
- Live browser audit (`http://127.0.0.1:5177`, 0 console errors): verified Home untouched, search + live suggestions + clear + no-results, custom `Modalidad` Select (`Todas`/`Taller`/`Domicilio`), `Más filtros` popover with nested `Reparación` Select + `Cobro`/`Entrega` segmented filters without premature close and without green toasts, last-row `⋯` contextual menu unclipped + live repair update + `Cerrar orden` confirmation popover, `OrderDetail` drawer navigation, mobile 390x844 stacked card layout with zero horizontal overflow, and post-polish desktop 1366x850 screenshot confirming zero badge truncation across all 6 columns.
- Risk: none (scoped strictly to `OrdersView`, `ModeFilter`, `src/views/orders/*`, and `src/views/orders-view.css`; zero changes to `OverviewView`, `App.tsx`, `Header`, `Sidebar`, `StatusPill`, `CardContextMenu`, `repository.ts`, `selectors.ts`, or `OrderDetail`).
