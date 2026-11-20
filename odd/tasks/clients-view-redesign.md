# Redesign of Clientes e historial (`ClientsView`)
Objective: Implement the Apple-grade redesign of `ClientsView` replacing the vertical per-client timeline with a compact client directory and contextual client/history panel faithfully matching the approved references and existing Rodrigo Repara design system, connected strictly to real data.
Branch/Delivery: `main` (local uncommitted working tree; do not branch, commit, or push without explicit user instruction). Forecast: ~650–850 authored lines across `src/views/clients/*`, `src/views/ClientsView.tsx`, `src/views/clients-view.css`, and tests. Strategy: `exception-ok` (local uncommitted redesign matching prior `orders-view-redesign`). Test runner: `bun test`, `npm run typecheck`, `npm run build`, live browser visual verification.

## Specs

S1. **Absolute scope restrictions & real data fidelity**:
- "NO MODIFICAR NINGUNA OTRA SECCIÓN DEL SISTEMA." — Do not modify Dashboard/Overview, revenue chart, metric cards, Kanban, OrdersView, Finance, Expenses, Reports, Sidebar, Header, navigation, `App.tsx`, `QuickActionForms.tsx`, `OrderDetail.tsx`, `repository.ts`, or `selectors.ts`.
- "No modificar modelos de base de datos ni lógica de negocio para adaptar el sistema a las imágenes."
- "No inventar clientes, reparaciones, teléfonos, fechas, importes o estados."
- "Solo mostrar acciones realmente implementadas. No agregar opciones ficticias." (No fake Edit/Delete client buttons since `CRMRepository` only implements `addClient` / `addClientWithId`.)
- "No inferir que una orden está cobrada por estar cerrada ni que está entregada por estar terminada. No deducir un saldo pendiente cuando no existe un precio final definido."

S2. **Directory header, search, custom sort Select & compact client list**:
- Keep existing header ("Clientes e historial" / "Encontrá al cliente y seguí el historial de sus equipos.") via App Header without duplicating headings or adding decorative cards.
- Reuse `+ Nuevo cliente` button connected to `onCreateClient` (reusing existing `ClientForm` dialog with `SaveButton`, `useSaveFeedback`, and global `Toast`).
- Search input with visible/accessible label `Buscar clientes`, accent-insensitive search by name or phone, clear (`×`) button, and empty-results state with `Limpiar búsqueda`.
- Shared custom `Select` (`src/components/ui/Select.tsx`) for sorting using only real derivable criteria: `Nombre (A–Z)`, `Nombre (Z–A)`, `Actividad más reciente`.
- Compact horizontal client rows: deterministic soft pastel initial avatar, name, phone, real order count (`1 orden` / `2 órdenes`), selection highlight & chevron; no status-badge clutter per client row.
- Selecting a client highlights smoothly, updates the contextual panel without full reload, preserves search and sort, and avoids unwanted auto-scroll.

S3. **Two-column desktop contextual client panel & real summary indicators**:
- Desktop two-column layout: compact left directory (`minmax(300px, 348px)`) + wider right contextual client panel (`1fr`). Tablet adapts proportions; mobile (`<= 860px`) shows directory first, opens contextual panel on selection with `← Volver a clientes` preserving search and sort.
- Initial state (no client selected): discreet prompt to select a client (`Seleccioná un cliente`), without arbitrary auto-selection or fabricated metrics.
- Selected client header: avatar, name, phone, order count (plus last real activity date when orders exist).
- Compact real summary indicators derived strictly from real orders without conflating dimensions: `Órdenes` (total), `Terminadas` (`repair === 'Terminado'`), `Entregadas` (`delivery === 'Entregado'`).

S4. **Compact chronological order history, OrderDetail reuse & contextual actions**:
- Replace the vertical timeline with a clean, compact horizontal order list (`<ol>`) sorted most-recent first without mutating `data.orders`.
- Each order row shows: order ID (`OrderIdCell`), equipment, entry date (`Ingreso`), finish date when present (`Finalización`), modality (`Taller` / `Domicilio`), optional warranty reference (`originalId`), and 3 clearly separated real badges via `OrderStatusBadge` (`Reparación`, `Cobro` with `$ paid / $ price` or `Sin precio final`, `Entrega`).
- Reuse `OrderRowActions` (`Ver detalle` opening existing `OrderSheetProvider`/`OrderDetail` side sheet + `⋯` three-dot `CardContextMenu` with real order actions and `SaveButton` confirmation for `Cerrar orden`).
- Closing `OrderDetail` returns focus and preserves search, sort, and selected client.
- Support progressive reveal ("Mostrar más órdenes") if a client accumulates > 20 orders; never artificially cap to 2–3 orders.

S5. **Special states, microinteractions, accessibility & verification**:
- Support Loading (skeletons, `aria-busy="true"`), Empty directory (`Todavía no hay clientes registrados.` + `Nuevo cliente`), No search results (`No se encontraron clientes.` + `Limpiar búsqueda`), Selected client with 0 orders (`Todavía no tiene órdenes registradas.`), and Error (`role="alert"` + `Reintentar`).
- Respect `prefers-reduced-motion`, keyboard navigation (`ArrowUp`/`ArrowDown`/`Home`/`End` in directory, Tab/Enter/Escape), and touch targets `>= 44px`.
- Verify with `bun test`, `npm run typecheck`, `npm run build`, and live browser inspection across desktop, tablet, and mobile viewports confirming visual fidelity and that other sections remain untouched.

## Tasks

- [x] T1 | S1, S2, S3, S4 | route: inline | status: done | Pure client directory/history helpers (`src/views/clients/client-helpers.ts`) + RED/GREEN unit tests (`src/views/clients/client-helpers.test.ts`, 6/6 pass).
- [x] T2 | S2, S3, S4, S5 | route: inline | status: done | Implemented redesigned `ClientsView` (`src/views/ClientsView.tsx`), contextual history panel component (`src/views/clients/ClientHistoryPanel.tsx`), and Apple-grade CSS (`src/views/clients-view.css`) with specificity isolation from legacy `.client`/`.mv-client-header` rules.
- [x] T3 | S1–S5 | route: inline | status: done | Updated and expanded `src/views/ClientsView.test.tsx` (4/4 test suites) covering directory, custom sort, unselected initial state, selected client history, independent badges, long IDs, order actions, and special states.
- [x] T4 | S1–S5 | route: inline | status: done | Verified: `bun run typecheck` (0 errors), `bun test` (127/127 pass, 1073 assertions), `bun run build` (clean, 431ms), and live browser verification across desktop (`1366x850`), tablet (`1024x800`), and mobile (`390x844`) with 0 console errors and 0 horizontal overflow.

## Log

### L1 — Original Request (2026-11-19)
User requested "PROMPT MAESTRO — REDISEÑO COMPLETO DE CLIENTES E HISTORIAL | Proyecto: Rodrigo Repara" with 7 visual reference images, plus follow-up "continua con todo". Goal: replace the vertical per-client timeline in `ClientsView` with a compact client directory + two-column contextual client/history panel matching the Apple-grade Rodrigo Repara visual language, reusing existing components (`Select`, `OrderStatusBadge`, `OrderIdCell`, `OrderRowActions`, `CardContextMenu`, `OrderSheetProvider`/`OrderDetail`, `ClientForm`/`SaveButton`/`Toast`), strictly preserving real data/business rules, and leaving all other sections untouched.

### Verification Evidence (2026-11-19)
- `bun run typecheck`: clean (`tsc --noEmit`).
- `bun test`: 127 pass / 0 fail across 30 files (1073 assertions), including `src/views/clients/client-helpers.test.ts` (6/6) and `src/views/ClientsView.test.tsx` (4/4).
- `bun run build`: clean (`vite build`, 431ms).
- Live browser verification (`http://127.0.0.1:5178/`, 0 console errors):
  - Verified initial unselected state (`Seleccioná un cliente`), compact `56px` directory rows (`4px` gap) after overriding legacy `.client` / `.mv-client-header` rules, `44px` search input and `+ Nuevo cliente` button, search by name (accent-insensitive) & phone (with/without spaces) + clear + no-results state, custom `Select` sorting (`Nombre A–Z`, `Nombre Z–A`, `Actividad más reciente`), keyboard `ArrowDown` navigation, `OrderDetail` side sheet open & close preserving search and selection, `⋯` `CardContextMenu` unclipped on `RR-1049`, `+ Nuevo cliente` creation with `SaveButton` + Toast feedback and empty history for new client, tablet (`1024x800`) and mobile (`390x844`) directory↔detail `Volver a clientes` flow with zero horizontal overflow, and `Tablero` / `Reparaciones` untouched.
- Risk: none (scoped strictly to `ClientsView`, `src/views/clients/*`, `src/views/clients-view.css`, and `ClientsView.test.tsx`; zero changes to `OverviewView`, `OrdersView`, `App.tsx`, `Header.tsx`, `Sidebar.tsx`, `QuickActionForms.tsx`, `OrderDetail.tsx`, `repository.ts`, or `selectors.ts`).
