# Supabase Integration, Auth/RLS & Empty Initial State
Objective: Connect Rodrigo Repara CRM to the user's Supabase database, protect it with Supabase Auth login + authenticated-only RLS policies, generate an idempotent SQL schema, and empty all seed/mock data so the CRM starts completely empty and ready to fill.
Branch/Delivery: `main` (local uncommitted working tree; do not branch, commit, or push without explicit user instruction). Forecast: ~750–950 authored lines across `.gitignore`, `.env.example`, `.env.local`, `vite.config.ts`, `src/vite-env.d.ts`, `supabase/schema.sql`, `src/lib/supabase.ts`, `src/repository.ts`, `src/supabase-repository.ts`, `src/components/AuthGate.tsx`, `src/components/auth-gate.css`, `src/App.tsx`, `src/main.tsx`, `src/seed.json`, view copy cleanups, and unit tests. Strategy: `exception-ok`. Test runner: `bun test`, `bun run typecheck`, `bun run build`.

## Specs

S1. **Supabase environment & client configuration**:
- User provided `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (stored locally in gitignored `.env.local`; redacted from tracked docs).
- Configure Vite (`vite.config.ts`) to expose `NEXT_PUBLIC_` and `VITE_` prefixes cleanly (`envPrefix: ['VITE_', 'NEXT_PUBLIC_']`).
- Store local credentials in `.env.local` (gitignored via `.gitignore`), provide `.env.example` without real keys, add TypeScript env types in `src/vite-env.d.ts`, and install `@supabase/supabase-js`.

S2. **PostgreSQL schema, atomic payment RPC & strict RLS (`supabase/schema.sql`)**:
- User confirmed: "si ovbio" to protecting the CRM with Supabase Auth login + RLS only for `authenticated` users (no `anon` access).
- Create idempotent `supabase/schema.sql` with all 6 tables (`clients`, `orders`, `expenses`, `leads`, `payments`, `parts_purchases`), constraints matching domain invariants, indexes, atomic `public.register_payment(p_order_id, p_amount, p_date)` RPC (`SECURITY INVOKER` + `FOR UPDATE`), and strict RLS policies granting access only to `authenticated` (`auth.uid() IS NOT NULL`) with zero `anon` privileges and zero seed inserts.

S3. **Supabase repository implementing `CRMRepository`**:
- Implement `SupabaseRepository` in `src/supabase-repository.ts` reusing shared domain validation helpers from `src/repository.ts` (never duplicating invariants).
- Support `load`, `addClient`, `addClientWithId`, `addOrder`, `addExpense`, `updateOrder`, and `registerPayment` (via atomic RPC), mapping snake_case DB columns <-> camelCase `Data` types cleanly and returning safe Spanish error messages.
- Wire `src/main.tsx` to use `SupabaseRepository` + `AuthGate` when Supabase env vars are configured.

S4. **Supabase Auth gate & Sign Out**:
- Create `src/components/AuthGate.tsx` + `src/components/auth-gate.css` with email/password login (`signInWithPassword`), session bootstrap (`getSession` + `onAuthStateChange`), accessible error states, and no public self-registration.
- Surface a clean `Cerrar sesión` action when authenticated (passed via optional props to `App` / `SettingsDrawer` so existing tests remain compatible).

S5. **Completely empty initial state & clean UX**:
- "Quiero que dejes todo vacio y por rellenar"
- Empty `src/seed.json` to `{"clients":[],"orders":[],"expenses":[],"leads":[],"payments":[],"partsPurchases":[]}`.
- Fix `CommandSearch` empty-DB message when `query === ""` and remove misleading "datos de ejemplo / registros ficticios" copy where appropriate.
- Migrate unit tests that depended on populated `seed.json` to explicit test-only fixtures (`src/test-fixtures.ts`), and add comprehensive RED/GREEN tests for empty seed, `SupabaseRepository`, and `AuthGate`.

S6. **Verification (High Risk: items 2 & 5)**:
- Run `bun test`, `bun run typecheck`, `bun run build`, and an independent read-only verification subagent checking Auth/RLS security, env/gitignore hygiene, schema/repository parity, and empty initial state.

## Tasks
- [x] T1 (S1, S2, inline): Install `@supabase/supabase-js`, configure `.gitignore`, `.env.local`, `.env.example`, `vite.config.ts`, `src/vite-env.d.ts`, and author `supabase/schema.sql`.
- [x] T2 (S3, inline): Extract shared validation helpers in `src/repository.ts`, implement `src/lib/supabase.ts` and `src/supabase-repository.ts` with RED/GREEN unit tests (`src/supabase-repository.test.ts` — 6/6 pass).
- [x] T3 (S4, inline): Build `src/components/AuthGate.tsx` + `src/components/auth-gate.css`, wire `onSignOut`/`userEmail` into `App.tsx` and `SettingsDrawer.tsx`, wire `src/main.tsx`, and add unit tests (`src/components/AuthGate.test.tsx` — 4/4 pass).
- [x] T4 (S5, inline): Empty `src/seed.json`, fix empty-DB copy/CommandSearch bug, migrate dependent tests to `src/test-fixtures.ts`, and update README with Supabase setup steps.
- [x] T5 (S6, delegated verifier): Independent read-only high-risk verifier (`supabase-verifier`) passed all S1–S6 with 0 blockers; applied all 4 hardening refinements (redacted live key from task doc, rejected NaN/Infinity in `register_payment`, aligned auth error mapping, `try/finally` signOut, memoized `SupabaseRepository` in `main.tsx`) and re-ran full `bun test`, `typecheck`, and `build`.

## Log
- L1 (2026-11-19): User requested adding their Supabase DB (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, saved locally in `.env.local`) and leaving everything empty and ready to fill ("Quiero que dejes todo vacio y por rellenar").
- L2 (2026-11-19): User confirmed Supabase Auth login + authenticated-only RLS ("si ovbio"). Baseline `bun test`: 140/140 pass across 32 files. Read-only explorer mapped all `seed.json`, `CRMRepository`, and empty-state behaviors across views.
- L3 (2026-11-19): Completed T1–T5. Independent high-risk verifier passed S1–S6 with 0 blockers and flagged 4 non-blocking hardening items, all fixed and re-verified (`bun test` 151/151 pass, `bun run typecheck` clean, `bun run build` clean, `.env.local` gitignored, `dist/` clean of mock data).
