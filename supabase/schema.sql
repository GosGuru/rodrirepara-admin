-- Rodrigo Repara CRM — Supabase PostgreSQL Schema & Authenticated-Only RLS
-- Run once in the Supabase SQL Editor (safe to re-run; idempotent).
-- Leaves all tables completely empty and ready to fill.

create extension if not exists pgcrypto;

-- 1. Clients
create table if not exists public.clients (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  created_at timestamptz not null default now()
);

-- 2. Orders
create table if not exists public.orders (
  id text primary key default gen_random_uuid()::text,
  client_id text not null references public.clients(id) on delete restrict,
  equipment text not null check (length(btrim(equipment)) > 0),
  mode text not null check (mode in ('Taller', 'Domicilio')),
  address text not null check (length(btrim(address)) > 0),
  fault text not null check (length(btrim(fault)) > 0),
  diagnosis text not null default '',
  parts text not null default '',
  parts_cost numeric(12,2) not null default 0 check (parts_cost >= 0),
  labor numeric(12,2) not null default 0 check (labor >= 0),
  quote numeric(12,2) not null default 0 check (quote >= 0),
  price numeric(12,2) null check (price is null or price >= 0),
  paid numeric(12,2) not null default 0 check (paid >= 0),
  repair text not null check (length(btrim(repair)) > 0),
  delivery text not null check (delivery in ('Pendiente', 'Entregado')),
  entry text not null check (length(btrim(entry)) > 0),
  finish text not null default '',
  owner text not null check (length(btrim(owner)) > 0),
  original_id text not null default '',
  created_at timestamptz not null default now(),
  constraint orders_price_gte_paid check (price is null or paid <= price),
  constraint orders_original_id_not_self check (original_id = '' or original_id <> id)
);

create index if not exists idx_orders_client_id on public.orders(client_id);
create index if not exists idx_orders_original_id on public.orders(original_id) where original_id <> '';
create index if not exists idx_orders_created_at on public.orders(created_at);

-- 3. Expenses
create table if not exists public.expenses (
  id text primary key default gen_random_uuid()::text,
  description text not null check (length(btrim(description)) > 0),
  category text not null check (length(btrim(category)) > 0),
  amount numeric(12,2) not null check (amount >= 0),
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses(date);

-- 4. Leads (Consultas)
create table if not exists public.leads (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  problem text not null check (length(btrim(problem)) > 0),
  date text not null check (length(btrim(date)) > 0),
  source text not null check (length(btrim(source)) > 0),
  state text not null check (length(btrim(state)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_created_at on public.leads(created_at);

-- 5. Payments (Cobros)
create table if not exists public.payments (
  id text primary key default gen_random_uuid()::text,
  order_id text not null references public.orders(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id on public.payments(order_id);

-- 6. Parts Purchases (Repuestos)
create table if not exists public.parts_purchases (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(btrim(name)) > 0),
  cost numeric(12,2) not null check (cost >= 0),
  sale numeric(12,2) not null check (sale >= 0),
  supplier text not null check (length(btrim(supplier)) > 0),
  date text not null check (length(btrim(date)) > 0),
  order_id text not null references public.orders(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_parts_purchases_order_id on public.parts_purchases(order_id);

-- Warranty integrity trigger: ensures original_id references an order of the same client
-- and prevents changing client_id if a warranty link would break.
create or replace function public.enforce_order_warranty_integrity()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_client_id text;
begin
  if new.original_id <> '' then
    select client_id into v_parent_client_id
    from public.orders
    where id = new.original_id;

    if v_parent_client_id is null or v_parent_client_id <> new.client_id then
      raise exception 'El cliente no puede cambiar si rompe una garantía.';
    end if;
  end if;

  if tg_op = 'UPDATE' and new.client_id <> old.client_id then
    if exists (
      select 1
      from public.orders
      where original_id = new.id
        and client_id <> new.client_id
    ) then
      raise exception 'El cliente no puede cambiar si rompe una garantía.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_warranty_integrity on public.orders;
create trigger trg_orders_warranty_integrity
  before insert or update of client_id, original_id
  on public.orders
  for each row
  execute function public.enforce_order_warranty_integrity();

-- Atomic payment registration RPC (SECURITY INVOKER preserves authenticated RLS)
create or replace function public.register_payment(
  p_order_id text,
  p_amount numeric,
  p_date text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_next_paid numeric(12,2);
  v_payment_id text;
  v_parsed_date date;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión.';
  end if;

  if p_amount is null
     or p_amount = 'NaN'::numeric
     or p_amount = 'Infinity'::numeric
     or p_amount = '-Infinity'::numeric
     or p_amount <= 0 then
    raise exception 'El importe debe ser un número positivo y finito.';
  end if;

  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'La fecha del cobro no es válida.';
  end if;

  begin
    v_parsed_date := p_date::date;
  exception when others then
    raise exception 'La fecha del cobro no es válida.';
  end;

  if to_char(v_parsed_date, 'YYYY-MM-DD') <> p_date then
    raise exception 'La fecha del cobro no es válida.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró la orden.';
  end if;

  v_next_paid := round((v_order.paid + p_amount)::numeric, 2);

  if v_next_paid <= v_order.paid then
    raise exception 'El importe no se puede representar.';
  end if;

  if v_order.price is not null and v_next_paid > v_order.price then
    raise exception 'El cobro supera el saldo pendiente.';
  end if;

  insert into public.payments (order_id, amount, date)
  values (p_order_id, round(p_amount::numeric, 2), p_date)
  returning id into v_payment_id;

  update public.orders
  set paid = v_next_paid
  where id = p_order_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'order_id', p_order_id,
    'paid', v_next_paid
  );
end;
$$;

revoke all on function public.register_payment(text, numeric, text) from public, anon;
grant execute on function public.register_payment(text, numeric, text) to authenticated;

-- Strict Row Level Security: authenticated users ONLY, zero anon access
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'clients',
    'orders',
    'expenses',
    'leads',
    'payments',
    'parts_purchases'
  ] loop
    execute format('revoke all on public.%I from public, anon', tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
    execute format('alter table public.%I enable row level security', tbl);
    execute format('alter table public.%I force row level security', tbl);

    execute format('drop policy if exists %I on public.%I', tbl || '_authenticated_select', tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() is not null)',
      tbl || '_authenticated_select', tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_authenticated_insert', tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() is not null)',
      tbl || '_authenticated_insert', tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_authenticated_update', tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)',
      tbl || '_authenticated_update', tbl
    );

    execute format('drop policy if exists %I on public.%I', tbl || '_authenticated_delete', tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() is not null)',
      tbl || '_authenticated_delete', tbl
    );
  end loop;
end;
$$;
